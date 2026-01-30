-- ============================================================================
-- OPTIMIZED SCHEMA FOR PRODUCTION - With Indexes and Performance Enhancements
-- ============================================================================

-- Users Table (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'agent') NOT NULL DEFAULT 'agent',
    fcm_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pages Table (Facebook Pages)
CREATE TABLE IF NOT EXISTS pages (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_added_at (added_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Page Assignments (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_pages (
    user_id INT,
    page_id VARCHAR(255),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, page_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_page (page_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversations (WITH OPTIMIZATION COLUMNS)
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    page_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    profile_pic TEXT,
    last_message_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_text TEXT,
    unread_count INT DEFAULT 0,
    UNIQUE KEY unique_user_page (user_id, page_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    INDEX idx_page_last_message (page_id, last_message_time),
    INDEX idx_user_page (user_id, page_id),
    INDEX idx_last_message_time (last_message_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages (WITH OPTIMIZATION COLUMNS AND INDEXES)
CREATE TABLE IF NOT EXISTS messages (
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
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_timestamp (conversation_id, timestamp),
    INDEX idx_conversation_read (conversation_id, is_read),
    INDEX idx_timestamp (timestamp),
    INDEX idx_sender_recipient (sender_id, recipient_id),
    INDEX idx_conversation_deleted (conversation_id, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages Archive Table (for long-term storage)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers Registry (Persistent names even if conversation deleted)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    profile_pic TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING DENORMALIZED DATA
-- ============================================================================

DELIMITER $$

-- Trigger: Update conversation metadata on new message
DROP TRIGGER IF EXISTS update_conversation_on_message$$
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

-- Trigger: Update unread count when messages are marked as read
DROP TRIGGER IF EXISTS update_conversation_on_read$$
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
-- STORED PROCEDURES
-- ============================================================================

DELIMITER $$

-- Procedure: Archive old messages
DROP PROCEDURE IF EXISTS archive_old_messages$$
CREATE PROCEDURE archive_old_messages(days_old INT)
BEGIN
    DECLARE archived_count INT DEFAULT 0;
    
    START TRANSACTION;
    
    -- Move messages to archive
    INSERT INTO messages_archive 
    SELECT *, NOW() as archived_at 
    FROM messages 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    SET archived_count = ROW_COUNT();
    
    -- Delete from main table
    DELETE FROM messages 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    COMMIT;
    
    SELECT archived_count as messages_archived, days_old as days_threshold;
END$$

DELIMITER ;

-- ============================================================================
-- INITIAL DATA / COMMENTS
-- ============================================================================

-- Note: This optimized schema includes:
-- 1. All necessary indexes for fast queries
-- 2. Denormalized fields (last_message_text, unread_count) for performance
-- 3. Auto-update triggers to keep denormalized data in sync
-- 4. Archive table and procedure for data retention
-- 5. Proper charset (utf8mb4) for emoji support
