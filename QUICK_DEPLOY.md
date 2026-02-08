# Quick Deployment Commands - Copy and Paste into Terminal

## OPTION 1: Automated Deployment (Recommended)

### For Linux/Mac (Oracle Instance):
```bash
chmod +x deploy.sh && ./deploy.sh
```

### For Windows (Local):
```cmd
deploy.bat
```

---

## OPTION 2: Manual Step-by-Step Commands

### Step 1: Backup Database (CRITICAL!)
```bash
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migration
```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < server/src/db/migrations/001_add_indexes_and_optimization.sql
```

### Step 3: Restart Application
```bash
pm2 restart message-app
# OR
systemctl restart message-app
```

---

## OPTION 3: Direct Git Push to Production

### On Local Machine:
```bash
git add .
git commit -m "Add database optimization"
git push origin main
```

### On Production Server (Oracle Instance):
```bash
# SSH into server
ssh ubuntu@YOUR_INSTANCE_IP

# Navigate to app directory
cd /path/to/message_app

# Pull latest code
git pull origin main

# Backup database
mysqldump -h localhost -u root -p message_app > ~/backup_$(date +%Y%m%d).sql

# Run migration
mysql -h localhost -u root -p message_app < server/src/db/migrations/001_add_indexes_and_optimization.sql

# Restart with PM2
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 50
```

---

## VERIFICATION COMMANDS

### Check if migration worked:
```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SHOW COLUMNS FROM messages LIKE 'is_read';
SHOW COLUMNS FROM conversations LIKE 'unread_count';
SHOW INDEX FROM messages;
"
```

### Test query performance:
```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT * FROM messages WHERE conversation_id = 1 ORDER BY id DESC LIMIT 50;
"
```

### Check application logs:
```bash
pm2 logs message-app --lines 100
```

---

## ROLLBACK (If Something Goes Wrong)

```bash
# Stop application
pm2 stop message-app

# Restore database
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < backup_YYYYMMDD.sql

# Restart application
pm2 restart message-app
```

---

## ENVIRONMENT VARIABLES NEEDED

Make sure these are set in `server/.env`:

```env
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
```

---

## QUICK TEST AFTER DEPLOYMENT

### 1. Test Login
Visit: https://your-domain.com/login

### 2. Test Conversation Loading
- Click on any conversation
- Should load FAST (< 100ms instead of 500-2000ms)

### 3. Test Message Sending
- Send a test message
- Verify it appears instantly

### 4. Check Unread Counts
- Messages from customers should increment unread count
- Opening conversation should reset unread count

---

## PRODUCTION BEST PRACTICES

1. **Always backup before migration**
2. **Run during low traffic hours** (2-4 AM)
3. **Test on staging first** (if available)
4. **Monitor logs for 1 hour** after deployment
5. **Keep backup for 24 hours** before deleting

---

## FOR ORACLE CLOUD INSTANCE SPECIFICALLY

```bash
# SSH into your Oracle instance
ssh -i ~/.ssh/your-key.pem ubuntu@your-instance-ip

# Navigate to app
cd /var/www/message_app  # Or wherever your app is

# Pull changes
git pull

# Run migration
mysql -h localhost -u root -p your_database < server/src/db/migrations/001_add_indexes_and_optimization.sql

# Restart
pm2 restart all

# Monitor
pm2 monit
```

---

## ONE-LINE DEPLOYMENT (After Code is Pushed)

### On Production Server:
```bash
cd /path/to/message_app && git pull && mysql -h localhost -u root -p your_db < server/src/db/migrations/001_add_indexes_and_optimization.sql && pm2 restart all && pm2 logs --lines 20
```

**Note:** Replace `/path/to/message_app` and `your_db` with actual values.

---

**That's it!** Your database is now optimized for production! 🚀
