const axios = require("axios");

const GRAPH_API_URL = process.env.GRAPH_API_URL || "https://graph.facebook.com/v22.0";

exports.sendMessage = async (pageAccessToken, recipientId, text, options = {}) => {
    const { messaging_type = "RESPONSE", tag = null } = options;
    try {
        const data = {
            messaging_type: messaging_type,
            recipient: { id: recipientId },
            message: { text: text }
        };
        if (tag) data.tag = tag;

        const response = await axios.post(
            `${GRAPH_API_URL}/me/messages`,
            data,
            {
                params: { access_token: pageAccessToken }
            }
        );
        return response.data;
    } catch (err) {
        console.error("FB Send Error:", err.response?.data || err.message);
        throw err; // Throw the original error object for better error handling in controller
    }
};

exports.sendImageMessage = async (pageAccessToken, recipientId, imageUrl, options = {}) => {
    const { messaging_type = "RESPONSE", tag = null } = options;
    try {
        const data = {
            messaging_type: messaging_type,
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "image",
                    payload: {
                        url: imageUrl,
                        is_reusable: true
                    }
                }
            }
        };
        if (tag) data.tag = tag;

        const response = await axios.post(
            `${GRAPH_API_URL}/me/messages`,
            data,
            {
                params: { access_token: pageAccessToken }
            }
        );
        return response.data;
    } catch (err) {
        console.error("FB Image Send Error:", err.response?.data || err.message);
        throw err; // Throw the original error object
    }
};

exports.getUserProfile = async (pageAccessToken, userId) => {
    try {
        const response = await axios.get(
            `${GRAPH_API_URL}/${userId}`,
            {
                params: {
                    fields: "first_name,last_name,profile_pic",
                    access_token: pageAccessToken
                }
            }
        );
        return response.data;
    } catch (err) {
        console.error("FB Profile Error:", err.response?.data || err.message);
        return null;
    }
};
