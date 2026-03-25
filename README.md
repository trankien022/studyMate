# 🎓 AI StudyMate - Ứng dụng hỗ trợ học tập thông minh

**AI StudyMate** là một nền tảng hỗ trợ học nhóm trực tuyến, kết hợp sức mạnh của trí tuệ nhân tạo (Gemini AI) và các tính năng tương tác thời gian thực (Socket.IO) để tạo ra một môi trường học tập hiện đại, hiệu quả và đầy cảm hứng.

---

## ✨ Tính năng nổi bật

### 🌌 Giao diện & Trải nghiệm (UI/UX)
- **Thiết kế Premium**: Sử dụng phong cách Glassmorphism hiện đại, tinh tế.
- **Hệ thống Design Hệ sinh thái**: Hỗ trợ đầy đủ Dark/Light mode với các hiệu ứng chuyển cảnh mượt mà.
- **Responsive**: Trải nghiệm liền mạch trên mọi thiết bị (máy tính, máy tính bảng và điện thoại).

### 🤖 Hỗ trợ bởi AI (Gemini)
- **Chat thông minh**: Tích hợp trợ lý AI chuyên sâu vào từng phòng học để giải đáp nhanh mọi thắc mắc.
- **Tóm tắt bài học**: Tự động hóa việc ghi chú và tóm tắt nội dung thảo luận.

### 🕒 Tương tác thời gian thực (Real-time)
- **Phòng học nhóm (Rooms)**: Tạo, tham gia và quản lý các phòng học chuyên biệt.
- **Hệ thống liên lạc**: Gửi tin nhắn và cập nhật trạng thái phòng ngay lập tức thông qua Socket.IO.

### 📝 Quản lý học tập
- **Ghi chú (Notes)**: Soạn thảo và lưu lại các kiến thức quan trọng với giao diện sạch sẽ.
- **Trắc nghiệm (Quizzes)**: Tạo và làm các bài kiểm tra nhanh để ôn luyện kiến thức.
- **Quản lý thành viên**: Kiểm soát danh sách người tham gia trong từng phòng.

### 🔐 Bảo mật & Quản lý người dùng
- **Xác thực**: Hệ thống đăng ký/đăng nhập an toàn với JWT và mã hóa mật khẩu.
- **Quản lý hồ sơ**: Cập nhật thông tin cá nhân, đổi mật khẩu và quản lý quyền riêng tư.

---

## 🛠️ Công nghệ sử dụng

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router DOM
- **UI Libraries**: Lucide React (Icons), React Hot Toast (Thông báo)
- **Real-time**: Socket.IO-client
- **Markdown**: React Markdown (Dành cho trợ lý AI)

### Backend
- **Platform**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **AI**: Google Generative AI (Gemini SDK)
- **Security**: JWT, Bcryptjs, Express Rate Limit
- **Real-time**: Socket.IO

---

## 🏗️ Cấu trúc thư mục

```text
ai-studymate/
├── backend/            # Mã nguồn phía Server (Node.js/Express)
│   ├── src/            # Core logic và API
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API endpoints
│   └── ...
├── frontend/           # Mã nguồn phía Client (React)
│   ├── src/
│   │   ├── components/ # Thành phần UI dùng chung
│   │   ├── pages/      # Các trang chính (Dashboard, Room, Profile...)
│   │   ├── services/   # Trình gọi API và logic xử lý
│   │   └── ...
├── .env                # Biến môi trường
├── package.json        # Cấu hình dự án & Dependencies
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt

### 1. Chuẩn bị
- Node.js (v18 trở lên)
- MongoDB account (hoặc Local MongoDB)
- Google Gemini API Key

### 2. Cài đặt Backend & Frontend
Mở terminal tại thư mục gốc và chạy:
```bash
# Cài đặt dependencies cho backend
npm install

# Cài đặt dependencies cho frontend
cd frontend
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc và điền các thông tin sau:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Chạy dự án
Mở hai cửa sổ terminal riêng biệt:

**Terminal 1 (Backend):**
```bash
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 🤝 Đóng góp
Chúng tôi luôn hoan nghênh mọi ý tưởng và đóng góp để cải thiện AI StudyMate. Hãy fork repository và gửi Pull Request nếu bạn có bất kỳ nâng cấp nào!

---

## 📄 License
Dự án được phát hành dưới giấy phép **ISC License**.

Created with ❤️ by **trankien022**
