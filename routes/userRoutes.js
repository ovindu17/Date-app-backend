const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const secret = 'your_jwt_secret';

// Middleware to protect routes
const auth = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, secret);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, age, gender, interests } = req.body;
  console.log('Received data:', req.body); // Add this line to log the received data
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  try {
    const newUser = new User({ 
      username, 
      email, 
      password, 
      profile: { 
        age: age || null, 
        gender: gender || null, 
        interests: typeof interests === 'string' ? interests.split(',').map(interest => interest.trim()) : []
      } 
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
    res.status(200).json({ token }); // Ensure the token is sent in the response
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Protected route example
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { age, gender, interests, imageUrl } = req.body;
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profile: {
          age: age || null,
          gender: gender || null,
          interests: Array.isArray(interests) ? interests : [],
          imageUrl: imageUrl || null
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all users except current user
router.get('/all-users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('username profile');
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;