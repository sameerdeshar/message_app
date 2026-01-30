# Meta Messaging App - Walkthrough

## Prerequisites
- **Node.js** (v18+)
- **MySQL** (v8+) running locally or on a server.
- **Facebook Developer Account** (App ID, Page Access Token).

## Setup Instructions

### 1. Database Configuration
The application requires a MySQL database. 
1. Open `server/.env`.
2. Update the following fields with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=meta_messenger
   ```

### 2. Initialize the Database
Run the initialization script to create the necessary tables (`users`, `pages`, `messages`, etc.) and the default Admin user.
```bash
cd server
npm install
npm run db:init
```
> [!NOTE]
> If successful, it will print "✅ Database checked/created" and "✅ Default Admin created".

### 3. Frontend Setup
```bash
cd client
npm install
```

## Running the Application

### Start the Backend
```bash
cd server
npm run dev
```
Runs on `http://localhost:3000`.

### Start the Frontend
```bash
cd client
npm run dev
```
Runs on `http://localhost:5173`.

## Usage Guide

### 1. Admin Login
- Go to `http://localhost:5173`.
- Login with default credentials:
    - **Username**: `admin`
    - **Password**: `admin123`

### 2. Integration & Assignments (Admin Dashboard)
- **Users Tab**: Create new agents (e.g., `agent1`).
- **Pages Tab**: Add a Facebook Page. You need the **Page ID** and a **Long-lived Page Access Token**.
- **Assignments Tab**: specific Pages to specific Agents.

### 3. Agent Dashboard
- Logout and login as the new agent (e.g., `agent1`).
- You will see the **Agent Dashboard**.
- Select a Page from the dropdown to view its conversations.
- Chat in real-time!

## Webhook Setup (Meta for Developers)
point your Facebook App Webhook to your server's public URL (use `ngrok` for localhost):
- **Callback URL**: `https://your-domain.com/webhook`
- **Verify Token**: `my_verify_token_123` (matches `VERIFY_TOKEN` in `.env`)
- **Fields**: Subscribe to `messages`, `messaging_postbacks`.

## Troubleshooting
- **Database Connection Refused**: Ensure MySQL is running on port 3306.
- **CORS Errors**: Check `CORS_ORIGINS` in `server/.env`.
