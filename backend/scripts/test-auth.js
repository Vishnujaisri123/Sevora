const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/temple_tickets');
    console.log('Connected to DB');

    // Clean up test user if exists
    await User.deleteOne({ username: 'testuser' });

    // Create a new user
    const newUser = new User({
      username: 'testuser',
      email: 'testuser@gmail.com',
      password: 'TestPassword123',
      role: 'employee'
    });

    await newUser.save();
    console.log('User registered with password hash:', newUser.password);

    // Try to login
    const foundUser = await User.findOne({ username: 'testuser' });
    if (!foundUser) {
      console.error('User not found');
      return;
    }

    const isMatch = await foundUser.comparePassword('TestPassword123');
    console.log('Password match test:', isMatch ? 'SUCCESS' : 'FAILED');

    // Clean up
    await User.deleteOne({ username: 'testuser' });
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
};

run();
