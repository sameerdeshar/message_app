const pool = require("../config/database");
const facebookService = require("../services/facebookService");
const Page = require("../models/Page");
const fcmService = require("../services/fcmService");

// 1. Verify Webhook
exports.verifyWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

// 2. Handle Incoming Events
exports.handleWebhookEvent = async (req, res) => {
    const body = req.body;

    console.log(`\n🔔 Webhook Received: ${JSON.stringify(body, null, 2)}`);

    if (body.object === "page") {
        // Return 200 immediately
        res.status(200).send("EVENT_RECEIVED");

        for (const entry of body.entry || []) {
            const pageId = entry.id;

            // Format 1: Facebook Messenger
            if (entry.messaging && entry.messaging.length > 0) {
                const webhookEvent = entry.messaging[0];
                await processMessage(pageId, webhookEvent, req.app.get("io"));
            }
            // Format 2: WhatsApp/Instagram (changes)
            else if (entry.changes && entry.changes.length > 0) {
                const change = entry.changes[0];
                if (change.field === "messages" && change.value) {
                    const webhookEvent = {
                        sender: change.value.sender,
                        recipient: change.value.recipient,
                        timestamp: change.value.timestamp,
                        message: change.value.message
                    };
                    await processMessage(pageId, webhookEvent, req.app.get("io"));
                }
            }
        }
    } else if (body.field === "messages") {
        // Direct format
        res.status(200).send("EVENT_RECEIVED");

        let pageId = body.value.recipient?.id;
        if (!pageId) {
            console.warn("⚠️ Webhook (Direct): Could not determine Page ID. body.value.recipient.id is missing.");
            // If this is an echo (page -> user), sender is page.
            // Try sender if recipient failed?
            if (body.value.sender && body.value.sender.id) {
                console.log("ℹ️ usage sender.id as pageId fallback (Sender logic)");
                pageId = body.value.sender.id;
            }
        }

        if (!pageId) {
            console.warn("❌ Skipping processing: No Page ID found.");
            return;
        }

        const webhookEvent = {
            sender: body.value.sender,
            recipient: body.value.recipient,
            timestamp: body.value.timestamp,
            message: body.value.message
        };
        await processMessage(pageId, webhookEvent, req.app.get("io"));
    } else {
        res.sendStatus(404);
    }
};

async function processMessage(pageId, event, io) {
    if (!event.message) return;

    let senderId = event.sender.id;
    let recipientId = event.recipient.id;
    let text = event.message.text;
    const attachments = event.message.attachments;
    const isEcho = event.message.is_echo;

    // ✅ IGNORE ECHO MESSAGES - This is the key fix!
    if (isEcho) {
        console.log('🔄 Ignoring echo message (already processed when sent)');
        return;
    }

    // Determine Customer ID and Message Direction
    let customerId;
    let isFromPage = 0;

    // Check if sender is the Page itself
    if (senderId === pageId) {
        customerId = recipientId; // If Page is sender, Recipient is Customer
        isFromPage = 1;
        // This shouldn't happen if we filtered echoes, but just in case
        console.log('⚠️ Warning: Non-echo message from page detected');
    } else {
        customerId = senderId; // If Page is recipient, Sender is Customer
        isFromPage = 0;
    }

    // Simple command handling (optional)
    if (event.message.commands && Array.isArray(event.message.commands)) {
        const commandNames = event.message.commands.map(c => c.name).join(', ');
        text = (text ? text + '\n' : '') + `[Commands: ${commandNames}]`;
    }

    let imageUrl = null;
    if (attachments && attachments[0]?.type === 'image') {
        imageUrl = attachments[0].payload.url;
    }

    // Timestamp handling with +5h 45m offset (Nepal Time)
    // Timestamp handling - Use UTC
    let msgTimestamp = event.timestamp ? new Date(event.timestamp) : new Date();
    const tsVal = Number(event.timestamp);
    if (!isNaN(tsVal) && tsVal < 10000000000) {
        msgTimestamp = new Date(tsVal * 1000);
    }

    // ===== LOG MESSAGE DETAILS =====
    console.log('\n📬 ===== INCOMING MESSAGE =====');
    console.log('📍 Page ID:', pageId);
    console.log('👤 Customer ID:', customerId);
    console.log('📤 Direction:', isFromPage ? 'Page -> User' : 'User -> Page');
    console.log('💬 Text:', text || '(no text)');
    console.log('================================\n');

    try {
        // 1. Check if Page Exists in DB
        const [pRows] = await pool.query("SELECT id, name, access_token FROM pages WHERE id = ?", [pageId]);

        if (pRows.length === 0) {
            console.error(`❌ ERROR: Webhook message for UNKNOWN Page ID: ${pageId}`);
            console.log("Current pages in DB:");
            const [allPages] = await pool.query("SELECT id, name FROM pages");
            console.log(JSON.stringify(allPages, null, 2));
            return;
        }

        console.log(`✅ Identified Page: ${pRows[0].name} (${pRows[0].id})`);
        const pageToken = pRows[0]?.access_token;

        // 2. Ensure Conversation Exists (keyed by CUSTOMER ID)
        await pool.query(`
            INSERT INTO conversations (user_id, page_id, last_message_time)
            VALUES (?, ?, COALESCE(?, NOW()))
            ON DUPLICATE KEY UPDATE last_message_time = COALESCE(?, NOW())
        `, [customerId, pageId, msgTimestamp, msgTimestamp]);

        // Get Conversation ID and currently stored name
        const [rows] = await pool.query("SELECT id, user_name FROM conversations WHERE user_id = ? AND page_id = ?", [customerId, pageId]);
        const conversation = rows[0];

        // NEW: Ensure customers table exists and has this user (to prevent FK errors on notes)
        // We do this BEFORE profile fetch so that if profile fetch fails, the record still exists.
        await pool.query(`
            INSERT INTO customers (id, name) VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        `, [customerId, conversation.user_name || 'Customer']);

        // Persistent Name Logic: Check 'customers' table for existing rich info
        let currentUserName = conversation.user_name;
        const [custRows] = await pool.query("SELECT name, profile_pic FROM customers WHERE id = ?", [customerId]);
        if (custRows.length > 0 && custRows[0].name !== 'Customer') {
            currentUserName = custRows[0].name;
        }

        // If we still don't have a rich name, fetch from Facebook
        if ((!currentUserName || currentUserName === 'Customer') && pageToken) {
            try {
                const profile = await facebookService.getUserProfile(pageToken, customerId);
                if (profile) {
                    currentUserName = `${profile.first_name} ${profile.last_name}`;
                    // Update the customers registry with rich info
                    await pool.query(`
                        UPDATE customers 
                        SET name = ?, profile_pic = ? 
                        WHERE id = ?
                    `, [currentUserName, profile.profile_pic, customerId]);
                }
            } catch (profileErr) {
                console.error("Failed to fetch user profile:", profileErr.message);
            }
        }

        // Sync name back to the current conversation if it changed or was empty
        if (currentUserName && currentUserName !== conversation.user_name) {
            await pool.query("UPDATE conversations SET user_name = ? WHERE id = ?", [currentUserName, conversation.id]);
        }

        // 3. Insert Message
        console.log("🛠️ DB DEBUG: Attempting to save message via webhook (processMessage)...");
        const [res] = await pool.query(`
            INSERT INTO messages (conversation_id, sender_id, recipient_id, text, image_url, is_from_page, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [conversation.id, senderId, recipientId, text, imageUrl, isFromPage, msgTimestamp]);
        console.log("✅ DB DEBUG: Successfully saved message via webhook, ID:", res.insertId);

        // 4. Real-time Broadcast
        const newMessage = {
            id: res.insertId,
            conversation_id: conversation.id,
            sender_id: senderId,
            recipient_id: recipientId,
            text,
            image_url: imageUrl,
            is_from_page: isFromPage,
            timestamp: msgTimestamp,
            is_deleted: 0
        };

        // ✅ Only broadcast USER messages via socket
        // Page messages are added directly to UI when sent
        if (isFromPage === 0) {
            io.to('admin_room').emit('new_message', newMessage);
            io.to(`page_${pageId}`).emit('new_message', newMessage);

            console.log('📡 Broadcasted user message via socket');

            // 🚀 NEW: Send Push Notification to assigned agents
            try {
                const assignedUsers = await Page.getAssignedUsers(pRows[0].id);

                const tokens = assignedUsers
                    .map(u => u.fcm_token)
                    .filter(t => t && t.length > 0);

                if (tokens.length > 0) {
                    await fcmService.sendPushNotification(tokens, {
                        title: `New msg from ${currentUserName || 'Customer'}`,
                        body: text || '📷 Image attachment',
                        data: {
                            conversationId: String(conversation.id),
                            pageId: String(pageId),
                            type: 'NEW_MESSAGE'
                        }
                    });
                }
            } catch (fcmErr) {
                console.error("FCM integration error:", fcmErr);
            }
        } else {
            console.log('⏭️ Skipped broadcasting page message (already in UI)');
        }

        // 5. Emit conversation update for sidebar refresh (for all messages)
        const conversationUpdate = {
            id: conversation.id,
            latest_msg_time: msgTimestamp,
            latest_msg_text: text || '📷 Image',
            page_id: pageId,
            user_name: currentUserName
        };
        io.to('admin_room').emit('conversation_updated', conversationUpdate);
        io.to(`page_${pageId}`).emit('conversation_updated', conversationUpdate);

    } catch (err) {
        console.error("Error processing webhook message:", err);
    }
}
