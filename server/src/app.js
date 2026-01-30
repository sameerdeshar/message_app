require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const pool = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const { setupSocketIO } = require("./utils/socket");

// Import routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const messageRoutes = require("./routes/messageRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const databaseRoutes = require("./routes/databaseRoutes");
const noteRoutes = require("./routes/noteRoutes");

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express();
const server = http.createServer(app);

// Trust proxy (for Nginx, Cloudflare Tunnel, etc.)
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
    origin: true, // Allow all origins for development; restrict in production
    credentials: true
};

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

const sessionStore = new MySQLStore({
    expiration: 10800000, // 3 hours
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, pool);

const sessionMiddleware = session({
    key: 'messenger_sid',
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
});

app.use(sessionMiddleware);

// =============================================================================
// SOCKET.IO SETUP
// =============================================================================

const io = setupSocketIO(server, sessionMiddleware);

// Make Socket.IO available to routes
app.set("io", io);

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Static files (uploads)
app.use(express.static('public'));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/notes", noteRoutes);
app.use("/webhook", webhookRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use(errorHandler);

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = { app, server, io };
