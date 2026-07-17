const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const socketManager = require('./sockets/socketManager');

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors({
  origin: '*', // In production, replace with specific frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Set socket instance on app context to make it accessible inside controllers
app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads Directory as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/availability', availabilityRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Serve Frontend Static Files (in production / built environment)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  // If the request starts with /api or /uploads, let it go to the backend handlers
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist (e.g. in dev mode), continue to default 404
      next();
    }
  });
});

// Initialize Socket Manager
socketManager(io);

// Seed Admin Account helper
const seedAdmin = async () => {
  try {
    const User = require('./models/User');
    const adminEmail = 'vishnuketa999@gmail.com';
    const adminPassword = 'Vishnuketa@123';
    
    // Remove any other admins that are NOT vishnuketa999@gmail.com
    await User.deleteMany({ role: 'admin', username: { $ne: adminEmail } });

    // Check if vishnuketa999@gmail.com exists
    let admin = await User.findOne({ username: adminEmail });
    if (!admin) {
      admin = new User({
        username: adminEmail,
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('Seeded Admin account successfully.');
    } else {
      admin.role = 'admin';
      admin.password = adminPassword;
      await admin.save();
      console.log('Admin account verified and password synced.');
    }
  } catch (err) {
    console.error('Error seeding admin account:', err);
  }
};

const migrateSerialNumbers = async () => {
  try {
    const Ticket = require('./models/Ticket');
    const ticketsWithoutSerial = await Ticket.find({ serialNumber: { $exists: false } }).sort({ createdAt: 1 });
    if (ticketsWithoutSerial.length > 0) {
      console.log(`Found ${ticketsWithoutSerial.length} tickets without serialNumber. Migrating...`);
      const lastTicket = await Ticket.findOne({ serialNumber: { $exists: true } }).sort({ serialNumber: -1 });
      let nextSerial = lastTicket && lastTicket.serialNumber ? lastTicket.serialNumber + 1 : 1;

      for (const ticket of ticketsWithoutSerial) {
        ticket.serialNumber = nextSerial;
        await ticket.save();
        nextSerial++;
      }
      console.log('Serial number migration completed successfully.');
    }
  } catch (err) {
    console.error('Error migrating serial numbers:', err);
  }
};

// MongoDB connection and Server start
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/temple_tickets';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB.');
  } catch (err) {
    console.warn('Failed to connect to primary MONGODB_URI. Falling back to local MongoDB...', err.message);
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/temple_tickets');
      console.log('Successfully connected to local fallback MongoDB.');
    } catch (fallbackErr) {
      console.error('Fallback local MongoDB connection also failed:', fallbackErr);
      process.exit(1);
    }
  }
  await seedAdmin();
  await migrateSerialNumbers();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

connectDB();
