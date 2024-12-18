const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "https://frontend-fvyq.onrender.com",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const mongoURI = 'your_mongo_uri';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.log('Error connecting to MongoDB Atlas:', err);
});

app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log('User joined room:', userId);
  });

  socket.on('new_message', (message) => {
    console.log('New message:', message);
    // Emit to both sender and recipient
    io.to(message.sender).emit('receive_message', message);
    io.to(message.recipientId).emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Replace app.listen with server.listen
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Make io accessible to routes
app.set('io', io);