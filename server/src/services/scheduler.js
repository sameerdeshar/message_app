const Message = require('../models/Message');

const initScheduledJobs = () => {
    console.log('⏰ Scheduler Service Initialized'); // Logs to server console

    // 1. Run Archive Immediately on Startup (to ensure DB is clean right now)
    runArchiveJob();

    // 2. Schedule to run every 24 hours
    // (Simple interval; for more precision we'd use node-cron, but this works for basic needs)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    setInterval(runArchiveJob, ONE_DAY_MS);
};

const runArchiveJob = async () => {
    try {
        // Run archive for messages older than 7 days
        // Note: The Message.archiveOldMessages method defaults to the param passed here
        const DAYS_TO_KEEP = 7;

        console.log(`📦 [Scheduler] Starting Daily Message Archive (Older than ${DAYS_TO_KEEP} days)...`);

        const archivedCount = await Message.archiveOldMessages(DAYS_TO_KEEP);

        if (archivedCount > 0) {
            console.log(`✅ [Scheduler] Archive Complete. Moved ${archivedCount} messages to archive.`);
        } else {
            console.log(`✨ [Scheduler] Archive Complete. No old messages found to archive.`);
        }
    } catch (err) {
        console.error('❌ [Scheduler] Archive Job Failed:', err);
    }
};

module.exports = { initScheduledJobs };
