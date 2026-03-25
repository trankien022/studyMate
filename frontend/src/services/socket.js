import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected to server:', this.socket.id);
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId, user) {
    if (this.socket) {
      this.socket.emit('join_room', { roomId, user });
    }
  }

  leaveRoom(roomId, user) {
    if (this.socket) {
      this.socket.emit('leave_room', { roomId, user });
    }
  }

  // Lắng nghe sự kiện
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Gỡ sự kiện
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Phát sự kiện (emit)
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
