const axios = require("axios");

const GRAPH_API_URL = process.env.GRAPH_API_URL || "https://graph.facebook.com/v22.0";

exports.sendMessage = async (pageAccessToken, recipientId, text) => {
    try {
        const response = await axios.post(
            `${GRAPH_API_URL}/me/messages`,
            {
                messaging_type: "RESPONSE",
                recipient: { id: recipientId },
                message: { text: text }
            },
            {
                params: { access_token: pageAccessToken }
            }
        );
        return response.data;
    } catch (err) {
        console.error("FB Send Error:", err.response?.data || err.message);
        throw new Error("Failed to send message to Facebook");
    }
};

exports.sendImageMessage = async (pageAccessToken, recipientId, imageUrl) => {
    try {
        const response = await axios.post(
            `${GRAPH_API_URL}/me/messages`,
            {
                messaging_type: "RESPONSE",
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
            },
            {
                params: { access_token: pageAccessToken }
            }
        );
        return response.data;
    } catch (err) {
        console.error("FB Image Send Error:", err.response?.data || err.message);
        throw new Error("Failed to send image to Facebook");
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
