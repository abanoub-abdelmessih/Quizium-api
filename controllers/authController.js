import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP, sendOTPEmail } from '../utils/email.js';

const ADMIN_EMAILS = ['abanoubabdelmessih110@gmail.com', 'abdelmottale3@gmail.com'];
const ADMIN_PASSWORD = 'quiziumAdmin1103';
// Admin names mapping
const ADMIN_NAMES = {
  'abanoubabdelmessih110@gmail.com': 'Abanoub',
  'abdelmottale3@gmail.com': 'Ahmed'
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register user
export const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields: name, username, email, password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      if (existingUser.username === username.toLowerCase()) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    const user = await User.create({ 
      name, 
      username: username.toLowerCase(),
      email: email.toLowerCase(), 
      password 
    });
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field === 'username' ? 'Username' : 'Email'} already exists` 
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if admin login
    if (ADMIN_EMAILS.includes(email.toLowerCase()) && password === ADMIN_PASSWORD) {
      let admin = await User.findOne({ email: email.toLowerCase() });
      
      if (!admin) {
        // Create admin account if doesn't exist
        const adminName = ADMIN_NAMES[email.toLowerCase()] || 'Admin';
        admin = await User.create({
          name: adminName,
          email: email.toLowerCase(),
          password: ADMIN_PASSWORD,
          isAdmin: true,
          username: email.toLowerCase().split('@')[0] // Generate username from email
        });
      } else {
        // Update admin name if it's different from what's in DB
        const adminName = ADMIN_NAMES[email.toLowerCase()];
        if (adminName && admin.name !== adminName) {
          admin.name = adminName;
        }
        if (!admin.isAdmin) {
          admin.isAdmin = true;
        }
        await admin.save();
      }

      const token = generateToken(admin._id);
      return res.json({
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          name: admin.name,
          username: admin.username,
          email: admin.email,
          isAdmin: admin.isAdmin
        }
      });
    }

    // Regular user login
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot password - send OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    user.otp = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    await user.save();

    const emailSent = await sendOTPEmail(user.email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password with OTP - only verifies OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide email and OTP' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ message: 'No OTP found. Please request a new one' });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
    }

    // OTP is valid - return success (don't change password here)
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set new password after OTP verification
export const setNewPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Please provide email and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ message: 'OTP not verified. Please verify OTP first' });
    }

    // Check if OTP is still valid
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
    }

    // Update password and clear OTP
    user.password = newPassword;
    user.otp = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

