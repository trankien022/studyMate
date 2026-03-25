const { io } = require('socket.io-client');

// Connect to backend Socket.IO
const socket = io('http://localhost:5000', {
  withCredentials: true,
});

socket.on('connect', () => {
  console.log('✅ [Terminal Client] Connected with ID:', socket.id);
  
  const roomId = '69c38ea119589e0113383a76';
  const user = { name: 'Người Ẩn Danh', email: 'ghost@test.com' };

  console.log(`➡️  Joining room ${roomId}...`);
  socket.emit('join_room', { roomId, user });

  // Đợi 1 chút để join phòng rồi gửi note
  setTimeout(() => {
    const message = `Xin chào! Đây là tin nhắn tự động từ Terminal gửi qua Socket.IO lúc ${new Date().toLocaleTimeString()}! Nếu bạn thấy dòng này, Real-time đang hoạt động hoàn hảo! 🚀`;
    console.log('📝 Emitting update_notes event...');
    
    socket.emit('update_notes', { roomId, notes: message, user });
    
    console.log('✅ Đã gửi notes! Bạn kiểm tra trình duyệt xem nội dung trong tab Ghi Chú có thay đổi không nha!');
    
    // Ngắt kết nối sau khi gửi
    setTimeout(() => {
      socket.disconnect();
      console.log('🔌 Đã test xong, ngắt kết nối.');
      process.exit(0);
    }, 2000);
  }, 1000);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
