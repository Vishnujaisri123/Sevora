const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/temple_tickets';

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Clear existing users to prevent duplicates if seeding multiple times
    // (In production, don't clear, but for a dev sandbox it's very helpful)
    await User.deleteMany({});
    console.log('Cleared existing users.');

    // Create Admin User
    const adminUser = new User({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      email: 'admin@temple.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    });

    // Create Employee User
    const employeeUser = new User({
      username: 'employee',
      password: 'employee123',
      role: 'employee',
      email: 'employee@temple.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    });

    await adminUser.save();
    console.log('Seeded Admin account successfully:');
    console.log('  Username: admin');
    console.log('  Password: admin123');

    await employeeUser.save();
    console.log('Seeded Employee account successfully:');
    console.log('  Username: employee');
    console.log('  Password: employee123');

    console.log('Seeding complete. Closing database connection.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDatabase();
