const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    process.env.JWT_SECRET || 'templeSecretKeyKey123456789!',
    { expiresIn: '30d' }
  );
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const loginIdentifier = username.trim();
    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp('^' + loginIdentifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
        { email: { $regex: new RegExp('^' + loginIdentifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
      ]
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update status to online
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
        status: user.status,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get current profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all users (employees/admins) for contact lists/status
exports.getUsers = async (req, res) => {
  try {
    // Admins can see all users, employees can see admins and themselves
    let query = {};
    if (req.user.role === 'employee') {
      query = { $or: [{ role: 'admin' }, { _id: req.user._id }] };
    }
    
    const users = await User.find(query).select('-password');
    return res.status(200).json(users);
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout endpoint
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.status = 'offline';
      user.lastSeen = new Date();
      await user.save();
    }
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Register new user (employee)
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email ? email.trim() : '';

    const role = 'employee';

    // Prevent duplicate username/email case-insensitively
    const userExists = await User.findOne({
      $or: [
        { username: { $regex: new RegExp('^' + trimmedUsername.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
        { email: { $regex: new RegExp('^' + trimmedEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
      ]
    });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email is already taken' });
    }

    const user = new User({
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      role,
      status: 'online',
      lastSeen: new Date()
    });

    await user.save();
    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
        status: user.status,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user profile (username/email)
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }

    if (email !== undefined) {
      user.email = email;
    }

    await user.save();
    const token = generateToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
        status: user.status,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Forgot Password - lookup by email and generate token
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const user = await User.findOne({ email: email.trim() });
    if (!user) {
      return res.status(404).json({ message: 'No user found with this email address' });
    }

    // Generate random 6-digit recovery code
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    return res.status(200).json({
      message: 'Password reset code generated successfully.',
      resetToken: token // Return plain token for direct browser copy/paste testing!
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset Password - verify token and update password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    user.password = password;
    user.resetPasswordToken = '';
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
