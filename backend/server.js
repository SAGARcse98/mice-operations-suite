require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'MICE Operations API' });
});

// Routes
app.use('/api/tasks', taskRoutes);

// Centralized Error Middleware
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// DB Connection & Server Start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crud_app';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('DB Connection Error:', err));