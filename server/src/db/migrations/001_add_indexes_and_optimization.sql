-- Migration: Add Indexes and Optimization Columns
-- Run this on production during low-traffic window
-- Estimated time: 5-30 minutes depending on data volume
-- Safe to run multiple times (uses IF NOT EXISTS)

-- ============================================================================
-- STEP 1: Add Missing Columns
-- ============================================================================

-- Add is_read and is_deleted to messages if not exists
ALTER TABLE messages 
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE AFTER is_from_page;

ALTER TABLE messages 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER is_read;

-- Add denormalized fields to conversations for faster queries
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS last_message_text TEXT AFTER last_message_time;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0 AFTER last_message_text;

-- ============================================================================
-- STEP 2: Add Critical Indexes (ONLINE - No Downtime)
-- ============================================================================

-- Messages table indexes
-- Note: Using ALGORITHM=INPLACE LOCK=NONE for zero-downtime on MySQL 5.6+
-- If your MySQL version doesn't support this, remove these clauses

-- Index for retrieving messages by conversation (most common query)
ALTER TABLE messages 
    ADD INDEX IF NOT EXISTS idx_conversation_timestamp (conversation_id, timestamp);

-- Index for time-based queries and archival
ALTER TABLE messages 
    ADD INDEX IF NOT EXISTS idx_timestamp (timestamp);

-- Index for unread message counting
ALTER TABLE messages 
    ADD INDEX IF NOT EXISTS idx_conversation_read (conversation_id, is_read);

-- Index for sender/recipient lookups
ALTER TABLE messages 
    ADD INDEX IF NOT EXISTS idx_sender_recipient (sender_id, recipient_id);

-- Conversations table indexes
-- Index for page-based conversation listing (sorted by recent activity)
ALTER TABLE conversations 
    ADD INDEX IF NOT EXISTS idx_page_last_message (page_id, last_message_time);

-- Index for user lookup across conversations
ALTER TABLE conversations 
    ADD INDEX IF NOT EXISTS idx_user_page (user_id, page_id);

-- ============================================================================
-- STEP 3: Backfill Denormalized Data
-- ============================================================================

-- Update unread_count for all conversations
UPDATE conversations c 
SET unread_count = (
    SELECT COUNT(*) 
    FROM messages m
    WHERE m.conversation_id = c.id 
    AND m.is_read = FALSE 
    AND m.is_from_page = FALSE
)
WHERE c.unread_count = 0 OR c.unread_count IS NULL;

-- Update last_message_text for all conversations
UPDATE conversations c
SET last_message_text = (
    SELECT m.text
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.timestamp DESC
    LIMIT 1
)
WHERE c.last_message_text IS NULL;

-- ============================================================================
-- STEP 4: Create Archive Table (for future archival strategy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    text TEXT,
    image_url TEXT,
    is_from_page BOOLEAN NOT NULL DEFAULT 0,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_conversation_timestamp (conversation_id, timestamp),
    INDEX idx_timestamp (timestamp),
    INDEX idx_archived_at (archived_at)
) ENGINE=InnoDB;

-- ============================================================================
-- STEP 5: Create Archival Stored Procedure
-- ============================================================================

DROP PROCEDURE IF EXISTS archive_old_messages;

DELIMITER $$
CREATE PROCEDURE archive_old_messages(days_old INT)
BEGIN
    DECLARE archived_count INT DEFAULT 0;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Move messages older than X days to archive
    INSERT INTO messages_archive 
    SELECT *, NOW() as archived_at 
    FROM messages 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    -- Get count of archived messages
    SET archived_count = ROW_COUNT();
    
    -- Delete archived messages from main table
    DELETE FROM messages 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    -- Commit transaction
    COMMIT;
    
    -- Return result
    SELECT archived_count as messages_archived, days_old as days_threshold;
END$$
DELIMITER ;

-- ============================================================================
-- STEP 6: Create Auto-Update Trigger (Optional - for denormalized data)
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_conversation_on_message;

-- Trigger to auto-update conversation metadata on new message
DELIMITER $$
CREATE TRIGGER update_conversation_on_message 
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE conversations 
    SET 
        last_message_time = NEW.timestamp,
        last_message_text = NEW.text,
        unread_count = unread_count + IF(NEW.is_from_page = FALSE AND NEW.is_read = FALSE, 1, 0)
    WHERE id = NEW.conversation_id;
END$$
DELIMITER ;

-- Trigger to update unread count when messages are marked as read
DROP TRIGGER IF EXISTS update_conversation_on_read;

DELIMITER $$
CREATE TRIGGER update_conversation_on_read
AFTER UPDATE ON messages
FOR EACH ROW
BEGIN
    IF OLD.is_read = FALSE AND NEW.is_read = TRUE AND NEW.is_from_page = FALSE THEN
        UPDATE conversations 
        SET unread_count = GREATEST(0, unread_count - 1)
        WHERE id = NEW.conversation_id;
    END IF;
END$$
DELIMITER ;

-- ============================================================================
-- STEP 7: Verification Queries
-- ============================================================================

-- Run these after migration to verify everything works

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
    table_rows
FROM information_schema.TABLES
WHERE table_schema = DATABASE()
AND table_name IN ('messages', 'conversations', 'messages_archive')
ORDER BY (data_length + index_length) DESC;

-- Check indexes were created
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('messages', 'conversations')
GROUP BY TABLE_NAME, INDEX_NAME;

-- Check if columns were added
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('messages', 'conversations')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- ============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================================================
-- 
-- 1. BACKUP FIRST: mysqldump -h host -u user -p --single-transaction database > backup.sql
-- 
-- 2. RUN DURING LOW TRAFFIC: Schedule for 2-4 AM when user activity is minimal
-- 
-- 3. MONITOR: Watch for lock timeouts or connection issues during migration
-- 
-- 4. ROLLBACK PLAN: Keep the backup for at least 24 hours
-- 
-- 5. TEST FIRST: Run on staging environment before production
--
-- 6. ESTIMATED TIME:
--    - < 100K messages: 1-5 minutes
--    - 100K-1M messages: 5-15 minutes  
--    - 1M+ messages: 15-30 minutes
--
-- 7. VERIFY AFTER: Run the verification queries above to ensure success
-- ============================================================================
