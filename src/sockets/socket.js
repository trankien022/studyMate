const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Kết nối mới: ${socket.id}`);

    // ─── Đăng ký user room cho notifications ──────────
    socket.on('register_user', ({ userId }) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket] User ${userId} đã đăng ký nhận thông báo (${socket.id})`);
      }
    });

    // ─── Join room event ──────────────────────────────
    socket.on('join_room', ({ roomId, user }) => {
      socket.join(roomId);
      console.log(`[Socket] User ${user?.name} (${socket.id}) vừa tham gia phòng ${roomId}`);
      
      // Notify other members
      socket.to(roomId).emit('member_joined', { user });
    });

    // ─── Leave room ───────────────────────────────────
    socket.on('leave_room', ({ roomId, user }) => {
      socket.leave(roomId);
      console.log(`[Socket] User ${user?.name} (${socket.id}) rời khỏi phòng ${roomId}`);
      
      socket.to(roomId).emit('member_left', { user });
    });

    // ─── Update notes real-time ───────────────────────
    socket.on('update_notes', ({ roomId, notes, user }) => {
      socket.to(roomId).emit('notes_updated', { notes, user });
    });

    // ─── Chat message ─────────────────────────────────
    socket.on('chat_message', ({ roomId, message }) => {
      socket.to(roomId).emit('receive_message', message);
    });

    // ─── DM typing indicator ──────────────────────────
    socket.on('dm_typing', ({ partnerId, isTyping, userId }) => {
      io.to(`user_${partnerId}`).emit('dm_partner_typing', {
        userId,
        isTyping,
      });
    });

    // ─── Disconnect ───────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Ngắt kết nối: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io chưa được khởi tạo!');
  }
  return io;
};

module.exports = { initSocket, getIO };
