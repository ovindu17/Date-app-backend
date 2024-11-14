const express = require('express');
const router = express.Router();
const Message = require('../models/Messages');
const jwt = require('jsonwebtoken');

const secret = 'your_jwt_secret';

// Authentication middleware
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

// Get users with chat history
router.get('/chat-users', auth, async (req, res) => {
  try {
    const chatUsers = await Message.distinct('sender', {
      recipient: req.user.id
    });
    
    const sentToUsers = await Message.distinct('recipient', {
      sender: req.user.id
    });
    
    const allUserIds = [...new Set([...chatUsers, ...sentToUsers])];
    res.json(allUserIds);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get chat messages between two users
router.get('/:recipientId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: req.params.recipientId },
        { sender: req.params.recipientId, recipient: req.user.id }
      ]
    }).sort('timestamp');
    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send a message
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    if (!recipientId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newMessage = new Message({
      sender: req.user.id,
      recipient: recipientId,
      content
    });
    await newMessage.save();
    
    // Emit messages to both sender and recipient rooms
    const io = req.app.get('io');
    io.to(recipientId).emit('receive_message', newMessage);
    io.to(req.user.id).emit('receive_message', newMessage);
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Message sending error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
