require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const aiRoutes = require('./routes/ai.routes');
const quizRoutes = require('./routes/quiz.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const dmRoutes = require('./routes/dm.routes');
const documentRoutes = require('./routes/document.routes');
const taskRoutes = require('./routes/task.routes');

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI StudyMate API is running 🚀',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tasks', taskRoutes);

// Serve uploaded files (static)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} không tồn tại`,
  });
});

// ─── Error Handler (phải đặt cuối cùng) ──────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Tạo HTTP Server và gắn Socket.IO
const http = require('http');
const { initSocket } = require('./sockets/socket');
const server = http.createServer(app);

// Khởi tạo Socket.IO
initSocket(server);

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n🚀 AI StudyMate Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

startServer();
