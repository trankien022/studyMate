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
    console.log(`[Socket] Tách mới: ${socket.id}`);

    // Join room event
    socket.on('join_room', ({ roomId, user }) => {
      socket.join(roomId);
      console.log(`[Socket] User ${user?.name} (${socket.id}) vừa tham gia phòng ${roomId}`);
      
      // Notify other members
      socket.to(roomId).emit('member_joined', { user });
    });

    // Leave room
    socket.on('leave_room', ({ roomId, user }) => {
      socket.leave(roomId);
      console.log(`[Socket] User ${user?.name} (${socket.id}) rời khỏi phòng ${roomId}`);
      
      socket.to(roomId).emit('member_left', { user });
    });

    // Update notes real-time (typing)
    socket.on('update_notes', ({ roomId, notes, user }) => {
      socket.to(roomId).emit('notes_updated', { notes, user });
    });

    // Receive chat message (if we have real chat later)
    socket.on('chat_message', ({ roomId, message }) => {
      socket.to(roomId).emit('receive_message', message);
    });

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
