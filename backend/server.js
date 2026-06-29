import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database Connection with graceful fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aifootball';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB database.'))
  .catch((err) => {
    console.warn('WARNING: Could not connect to MongoDB database.');
    console.warn(`Error details: ${err.message}`);
    console.warn('The application will fall back to local memory-based caching. You can still use the full app!');
  });

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    watsonx: !!process.env.WATSONX_AI_APIKEY ? 'configured' : 'mock_mode'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`AI Football Match Explainer Backend listening on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database state: ${mongoose.connection.readyState === 1 ? 'connected' : 'caching (local memory)'}`);
  console.log(`Watsonx AI state: ${process.env.WATSONX_AI_APIKEY ? 'Granite Live' : 'Rules-Based Mock Engine'}`);
  console.log(`=================================================`);
});
