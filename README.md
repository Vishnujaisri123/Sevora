# Sevora - Temple Ticket Booking Platform

Sevora is a modern, real-time ticket booking and communication platform built to streamline ticket reservations, client communication, payment tracking, and document distribution for temple darshan bookings.

---

## 🚀 Key Features

### 👥 Client & Employee Portal
- **Secure Authentication**: Includes signup, login (supporting case-insensitive username or email lookup), and profile settings editing (change name and email).
- **Forgot Password**: Password recovery flow utilizing a secure, time-bound 6-digit verification code.
- **Booking Management**: Submit booking details (Client Name, Phone, Aadhaar ID, Temple Name, Darshan Date, Timings, Slots).
- **Tabbed Layout**: Separates active bookings from completed bookings (transfers to History automatically when status transitions to `Paid`).
- **Restricted Payments**: Limit payment updates to `Pending`, `Paid by PhonePe`, and `Paid by Cash`.
- **Top Metrics Panel**: Real-time counter widgets tracking total Cash and PhonePe payments.
- **Real-Time Popup Alerts**: Sliding glassmorphic toast notifications notifying employees of admin ticket updates, PDF uploads, or booking deletions.

### 👑 Admin Control Panel
- **Executive Analytics Drawer**: Detailed stats metrics ordering: *Total Bookings*, *Processing*, *Completed Bookings*, *PhonePe Payments*, and *Cash Payments*.
- **Restricted Statuses**: Status transition controls restricted to: `Waiting for Admin`, `Processing`, and `Completed`.
- **PDF Document Uploader**: Upload final tickets/PDF receipts, auto-posting download notifications into the chat room.
- **Ticket Deletion**: Quick deletion controls to clear a booking alongside all associated files, logs, and messages.
- **Real-Time Notifications**: Animated popups alerting the admin when a new booking is submitted or a message is received.

### 💬 Real-Time Chat System
- **Websocket Chat**: Instant messaging between admins and employees.
- **Attachments**: Drag-and-drop or select to upload and download file attachments directly in the chat feed.
- **Rich Interaction**: Includes message reply-to previews, message editing (within 5 minutes), message deletion, and unread counts.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, TypeScript, Vite, Framer Motion, Lucide Icons, Socket.io-client, Axios.
* **Backend**: Node.js, Express, Socket.io, MongoDB (Mongoose), JSON Web Tokens (JWT), bcryptjs, Multer (file storage).

---

## 💻 Local Setup & Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or Atlas cloud cluster)

### 2. Backend Setup
1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file in the `backend/` directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/sevora
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```
3. Run the backend development server (automatically seeds the default admin: `vishnuketa999@gmail.com` / `Vishnuketa@123`):
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Run the Vite development server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

---

## 🌐 Production Deployment Configurations

### Frontend (Vercel)
- Configured with `vercel.json` rewrite rules to route all paths to `index.html` for clean React Router client-side path loads.
- Connects to backend endpoints dynamically using the `VITE_API_URL` environment parameter.

### Backend (Render)
- Configured to run as a Node Web Service using the `backend` folder as the root directory.
- Requires environment variables: `MONGODB_URI`, `JWT_SECRET`, and `PORT`.
