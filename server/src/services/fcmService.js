const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../config/firebase-service-account.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK Initialized');
} catch (error) {
    console.error('❌ Firebase Admin SDK Initialization Error:', error);
}

/**
 * Send FCM notification to multiple tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {Object} payload - Notification payload {title, body, data}
 */
exports.sendPushNotification = async (tokens, payload) => {
    if (!tokens || tokens.length === 0) return;

    const validTokens = tokens.filter(t => t && t.length > 0);
    if (validTokens.length === 0) return;

    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        android: {
            notification: {
                channelId: 'high_importance_channel',
                priority: 'high',
            },
            priority: 'high',
        },
        data: payload.data || {},
        tokens: validTokens,
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`📡 FCM: Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`❌ FCM Failure [${validTokens[idx]}]:`, resp.error.message);
                }
            });
        }
    } catch (error) {
        console.error('❌ FCM Send Error:', error);
    }
};
