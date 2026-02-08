const bcrypt = require("bcrypt");
const pool = require("../config/database");
const User = require("../models/User");

exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    try {
        const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login failed" });
    }
};

exports.logout = async (req, res) => {
    const userId = req.session.userId;

    // Attempt to clear FCM token on logout if user exists
    if (userId) {
        try {
            await User.updateFCMToken(userId, null);
        } catch (err) {
            console.error("Logout FCM clear error:", err);
        }
    }

    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: "Logout failed" });
        res.clearCookie('messenger_sid');
        res.json({ success: true });
    });
};

exports.checkAuth = (req, res) => {
    if (req.session.userId) {
        return res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                role: req.session.role
            }
        });
    }
    res.json({ authenticated: false });
};

exports.updateFCMToken = async (req, res) => {
    const { fcmToken } = req.body; // Can be null to clear
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        await User.updateFCMToken(userId, fcmToken);
        res.json({ success: true, message: "FCM Token updated" });
    } catch (err) {
        console.error("FCM Token update error:", err);
        res.status(500).json({ error: "Failed to update FCM Token" });
    }
};
