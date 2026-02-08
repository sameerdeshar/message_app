# Facebook Messenger Dashboard - Full-Stack Application

A production-ready Facebook Messenger management dashboard built with **Express.js** and **React** + **Redux Toolkit**.

## 🏗️ Architecture

### **Backend (Express.js + Node.js)**
- Standard Express.js structure with `bin/www` entry point
- MVC architecture with Models, Controllers, and Routes
- MySQL database with connection pooling
- Socket.IO for real-time messaging
- Session-based authentication with MySQL session store
- Security: Helmet, CORS, sanitized inputs

### **Frontend (React + Vite + Redux Toolkit)**
- Modern React with Vite for fast development
- **Redux Toolkit** for state management
- **RTK Query** for API calls with automatic caching
- Feature-based folder structure
- Real-time updates via Socket.IO
- TailwindCSS for styling

---

## 📁 Project Structure

```
message_app/
├── server/                          # Backend (Express.js)
│   ├── bin/
│   │   └── www                      # Entry point
│   ├── src/
│   │   ├── app.js                   # Express app configuration
│   │   ├── config/                  # Configuration files
│   │   │   └── database.js          # MySQL connection pool
│   │   ├── models/                  # Database models
│   │   │   ├── User.js
│   │   │   ├── Message.js
│   │   │   ├── Conversation.js
│   │   │   └── Page.js
│   │   ├── controllers/             # Request handlers
│   │   ├── routes/                  # API routes
│   │   ├── middleware/              # Custom middleware
│   │   ├── services/                # Business logic
│   │   ├── utils/                   # Utilities
│   │   │   └── socket.js            # Socket.IO configuration
│   │   └── db/                      # Database scripts
│   ├── public/                      # Static files (uploads)
│   ├── .env                         # Environment variables
│   └── package.json
│
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── features/                # Feature-based modules
│   │   │   ├── auth/
│   │   │   │   ├── authApi.js       # RTK Query API
│   │   │   │   └── authSlice.js     # Redux slice
│   │   │   ├── conversations/
│   │   │   │   └── conversationsApi.js
│   │   │   ├── messages/
│   │   │   │   └── messagesApi.js
│   │   │   └── admin/
│   │   │       └── adminApi.js
│   │   ├── components/              # Reusable components
│   │   ├── pages/                   # Page components
│   │   ├── hooks/                   # Custom hooks
│   │   │   └── useSocket.js
│   │   ├── lib/                     # Third-party configs
│   │   │   └── socket.js
│   │   ├── store/                   # Redux store
│   │   │   └── index.js
│   │   ├── utils/                   # Utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── .env
│   └── package.json
│
├── nginx.conf                       # Nginx configuration
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v16+ and npm
- **MySQL** 8.0+
- **Git**

### Installation

#### 1. Clone the repository
```bash
git clone <your-repo-url>
cd message_app
```

#### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - SESSION_SECRET
# - FACEBOOK_VERIFY_TOKEN, FACEBOOK_PAGE_ACCESS_TOKEN

# Initialize database
npm run db:init

# Start development server
npm run dev

# Or start production server
npm start
```

#### 3. Frontend Setup

```bash
cd ../client

# Install dependencies
npm install

# Create .env file (optional for dev)
# VITE_API_URL=http://localhost:3000

# Start development server
npm run dev

# Or build for production
npm run build
```

---

## 🔧 Configuration

### Backend Environment Variables (.env)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=messenger_db

# Session
SESSION_SECRET=your_super_secret_key_change_this
USE_HTTPS=false

# Facebook
FACEBOOK_VERIFY_TOKEN=your_verify_token
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
```

### Frontend Environment Variables (.env)

```env
# Development - uses proxy
# No configuration needed

# Production
VITE_API_URL=https://your-domain.com/api
```

---

## 🧪 Testing

### Manual Testing Checklist

#### Backend API Testing

**1. Health Check**
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","env":"development","timestamp":"..."}
```

**2. Authentication**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password","role":"admin"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt

# Get current user
curl http://localhost:3000/api/auth/me -b cookies.txt
```

**3. Conversations**
```bash
# Get conversations for a page
curl http://localhost:3000/api/admin/conversations/1 -b cookies.txt
```

**4. Messages**
```bash
# Get messages for a conversation
curl http://localhost:3000/api/messages/1 -b cookies.txt

# Send a message
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"conversationId":1,"message":"Hello","sender_id":"page"}'
```

#### Frontend Testing

**1. Start Development Server**
```bash
cd client
npm run dev
```
Open `http://localhost:5173`

**2. Test Features**
- [ ] Login with credentials
- [ ] View conversations list
- [ ] Click on a conversation
- [ ] Send a message
- [ ] Verify real-time updates (open in 2 browser tabs)
- [ ] Admin: Create users
- [ ] Admin: Assign pages
- [ ] Logout

**3. Build Testing**
```bash
npm run build
npm run preview
```
Open `http://localhost:4173` and test again

#### Socket.IO Testing

**1. Test Real-Time Connection**
- Open browser DevTools → Console
- Look for: `✅ Socket.IO connected: <socket-id>`
- Send a message from Facebook Messenger
- Verify it appears instantly in the dashboard

**2. Test Multiple Clients**
- Open dashboard in 2 browser tabs
- Login as different users (or same user)
- Send a message from one tab
- Verify it appears in the other tab without refresh

---

## 🏃 Running in Production

### Option 1: PM2 (Recommended)

**Backend:**
```bash
cd server
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Frontend:**
```bash
cd client
npm run build
# Serve dist/ folder with Nginx or similar
```

### Option 2: Docker (if configured)
```bash
docker-compose up -d
```

### Nginx Configuration
Use the provided `nginx.conf` as a template. Configure it to:
- Serve frontend static files from `client/dist/`
- Proxy `/api` to backend port 3000
- Proxy `/socket.io` for WebSocket support

---

## 🔍 Troubleshooting

### Backend Issues

**"Cannot find module" errors**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

**Database connection failed**
- Verify MySQL is running
- Check `.env` credentials
- Ensure database exists: `CREATE DATABASE messenger_db;`

**Port already in use**
```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change PORT in .env
```

### Frontend Issues

**"Failed to fetch" errors**
- Ensure backend is running on port 3000
- Check browser console for CORS errors
- Verify API_URL in environment config

**Redux DevTools not working**
- Install Redux DevTools browser extension
- Ensure you're in development mode

**Socket.IO not connecting**
- Check browser console for connection errors
- Verify backend Socket.IO is configured correctly
- Ensure session/cookies are working (login first)

---

## 📚 Key Technologies

### Backend
- **Express.js** v5 - Web framework
- **MySQL2** - Database driver with promises
- **Socket.IO** v4 - Real-time communication
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **express-session** + **express-mysql-session** - Session management

### Frontend
- **React** v19 - UI library
- **Redux Toolkit** v2 - State management
- **RTK Query** - Data fetching and caching
- **React Router** v7 - Routing
- **Socket.IO Client** v4 - Real-time client
- **Axios** - HTTP client (used by RTK Query)
- **TailwindCSS** v3 - Styling
- **Vite** v7 - Build tool

---

## 🎯 Features

- ✅ Session-based authentication
- ✅ Real-time messaging with Socket.IO
- ✅ Facebook Messenger webhook integration
- ✅ Admin dashboard for user management
- ✅ Agent dashboard for assigned pages
- ✅ Conversation management
- ✅ File upload support
- ✅ Automatic message caching (RTK Query)
- ✅ Responsive design
- ✅ Production-ready with PM2 + Nginx

---

## 📝 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Get all users |
| POST | `/api/admin/users` | Create user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/pages` | Get all pages |
| POST | `/api/admin/pages` | Add page |
| POST | `/api/admin/assign` | Assign page to user |
| POST | `/api/admin/unassign` | Unassign page from user |
| GET | `/api/admin/conversations/:pageId` | Get conversations for page |

### Message Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:conversationId` | Get messages |
| POST | `/api/messages/send` | Send message |
| DELETE | `/api/messages/:messageId` | Delete message |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhook` | Facebook verification |
| POST | `/webhook` | Receive Facebook messages |

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly (see Testing section)
4. Submit a pull request

---

## 📄 License

[Your License Here]

---

## 🙋 Support

For issues and questions:
- Check the Troubleshooting section
- Review server logs: `pm2 logs` or console output
- Check browser console for frontend errors
- Verify all environment variables are set correctly
