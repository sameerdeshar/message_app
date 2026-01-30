const { Server } = require("socket.io");
const pool = require("../config/database");

/**
 * Configure and initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @param {Object} sessionMiddleware - Express session middleware
 * @returns {Object} Configured Socket.IO instance
 */
function setupSocketIO(server, sessionMiddleware) {
    const io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:5173',
                'http://localhost:3000',
                'https://graceportpro.com',
                'https://app.graceportpro.com'
            ],
            credentials: true,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
    });

    // Share session with Socket.IO
    io.use((socket, next) => {
        sessionMiddleware(socket.request, {}, next);
    });

    // Handle Socket.IO connections
    io.on("connection", async (socket) => {
        const session = socket.request.session;

        // Verify authenticated session
        if (!session || !session.userId) {
            console.log("❌ Unauthenticated socket connection attempt");
            socket.disconnect();
            return;
        }

        console.log(`✅ Socket connected: User ${session.userId} (${socket.id})`);

        // Join user-specific rooms based on page assignments
        try {
            const [rows] = await pool.query(
                "SELECT page_id FROM user_pages WHERE user_id = ?",
                [session.userId]
            );

            rows.forEach(row => {
                socket.join(`page_${row.page_id}`);
                console.log(`  → Joined room: page_${row.page_id} (User: ${session.username || session.userId})`);
            });

            // Admin users join admin room
            if (session.role === 'admin') {
                socket.join('admin_room');
                console.log(`  → Joined admin_room (User: ${session.username || session.userId})`);
            }
        } catch (err) {
            console.error("Socket Room Join Error:", err);
        }

        // Manual join event (fallback)
        socket.on("join_page", (pageId) => {
            console.log(`[Socket] User ${socket.id} manually joining: page_${pageId}`);
            socket.join(`page_${pageId}`);
        });

        // Disconnect event
        socket.on("disconnect", () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
}

module.exports = { setupSocketIO };
