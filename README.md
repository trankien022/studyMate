# 🎓 AI StudyMate — Nền tảng học nhóm thông minh

**AI StudyMate** là nền tảng hỗ trợ học nhóm trực tuyến, kết hợp **Gemini AI**, **Socket.IO real-time** và giao diện **Modern Light SaaS** để tạo ra môi trường học tập hiện đại, hiệu quả và đầy cảm hứng.

> **Live Demo:** *Coming soon*  
> **Repository:** [github.com/trankien022/studyMate](https://github.com/trankien022/studyMate)

---

## ✨ Tính năng nổi bật

### 🤖 Trí tuệ nhân tạo (Gemini AI)
- **Chat AI thông minh** — Trợ lý AI chuyên sâu trong từng phòng học, hỗ trợ giải bài tập, trả lời thắc mắc
- **Tóm tắt bài học** — Tự động tóm tắt nội dung dài thành các ý chính
- **Tạo Quiz tự động** — AI tạo bộ câu hỏi trắc nghiệm từ chủ đề bất kỳ
- **Giải thích Quiz** — AI phân tích chi tiết tại sao đáp án đúng/sai kèm mẹo ghi nhớ
- **AI Study Suggestions** — Gợi ý học tập cá nhân hóa dựa trên kết quả quiz, tần suất học và điểm yếu của user

### 🕒 Tương tác thời gian thực (Socket.IO)
- **Chat nhóm (Group Chat)** — Gửi/nhận tin nhắn nhóm real-time trong phòng học
- **Thông báo trực tiếp** — Thông báo khi có thành viên join/leave phòng, quiz mới được tạo
- **Đồng bộ trạng thái** — Danh sách thành viên và trạng thái phòng cập nhật ngay lập tức

### 📊 Dashboard thông minh
- **Quick Resume Cards** — Hiển thị 3 phòng truy cập gần nhất với nút "Tiếp tục học" (kiểu Netflix)
- **Room Pinning** — Ghim phòng quan trọng lên đầu danh sách, phòng ghim luôn hiển thị trước
- **Smart Sorting** — Sắp xếp phòng theo: hoạt động gần nhất, nhiều thành viên, tên A-Z, cũ nhất
- **AI Suggestions Panel** — Gợi ý học tập từ AI với 3 mức ưu tiên (cao/trung bình/thấp)
- **Quick Stats** — Tổng quan: số phòng, tổng thành viên, gói hiện tại
- **Tìm kiếm phòng** — Tìm nhanh phòng theo tên hoặc môn học

### 📝 Công cụ học tập
- **Ghi chú (Notes)** — Soạn thảo và lưu ghi chú cho từng phòng
- **Quiz & Trắc nghiệm** — Tạo/làm/xem kết quả quiz với bảng xếp hạng
- **Flashcard Mode** — Chế độ flashcard để ôn tập nhanh
- **Pomodoro Timer** — Bộ đếm Pomodoro tích hợp để quản lý thời gian học
- **Analytics Dashboard** — Thống kê học tập: điểm TB, lịch sử quiz, top performers, hoạt động gần đây

### 🏠 Quản lý phòng học
- **Tạo/Tham gia phòng** — Tạo phòng mới hoặc join bằng mã mời 8 ký tự
- **Quản lý thành viên** — Xem danh sách, đuổi thành viên, chuyển quyền chủ phòng
- **Xóa phòng** — Chủ phòng có thể xóa phòng kèm toàn bộ dữ liệu

### 💳 Thanh toán Premium
- **Trang Pricing** — So sánh gói Free vs Premium
- **VNPay Integration** — Thanh toán qua VNPay sandbox
- **MoMo Integration** — Hỗ trợ thanh toán MoMo
- **COD** — Thanh toán khi nhận hàng
- **Lịch sử thanh toán** — Xem lại các giao dịch đã thực hiện

### 🔐 Bảo mật & Quản lý người dùng
- **Xác thực JWT** — Đăng ký/đăng nhập an toàn với mã hóa bcrypt
- **Rate Limiting** — Giới hạn request để chống spam/brute-force
- **Quản lý hồ sơ** — Cập nhật thông tin cá nhân, đổi mật khẩu
- **Premium Badge** — Hiển thị trạng thái PRO cho tài khoản Premium

### 🌌 Giao diện (UI/UX)
- **Modern Light SaaS Theme** — Thiết kế sáng, chuyên nghiệp lấy cảm hứng từ studymate.live
- **Responsive** — Tương thích mọi thiết bị (desktop, tablet, mobile)
- **Micro-animations** — Hover effects, smooth transitions, skeleton loading
- **Plus Jakarta Sans** — Typography hiện đại, dễ đọc

---

## 🛠️ Công nghệ sử dụng

### Frontend
| Công nghệ | Phiên bản | Mục đích |
|------------|-----------|----------|
| React | 19.2 | UI framework |
| Vite | 8.0 | Build tool & dev server |
| React Router DOM | 7.13 | Client-side routing |
| Axios | 1.13 | HTTP client |
| Socket.IO Client | 4.8 | Real-time communication |
| Lucide React | 1.6 | Icon library |
| React Hot Toast | 2.6 | Toast notifications |
| React Markdown | 10.1 | Render AI markdown responses |

### Backend
| Công nghệ | Phiên bản | Mục đích |
|------------|-----------|----------|
| Node.js + Express | 4.22 | REST API server |
| MongoDB + Mongoose | 9.3 | Database & ODM |
| Google Generative AI | 0.24 | Gemini AI integration |
| Socket.IO | 4.8 | Real-time WebSocket |
| JWT + Bcryptjs | — | Authentication & encryption |
| Express Rate Limit | 8.3 | API rate limiting |

---

## 🏗️ Cấu trúc thư mục

```text
ai-studymate/
├── src/                        # Backend (Node.js/Express)
│   ├── controllers/            # Business logic
│   │   ├── ai.controller.js    # Chat AI, tóm tắt, quiz explain, study suggestions
│   │   ├── auth.controller.js  # Đăng ký, đăng nhập, profile
│   │   ├── quiz.controller.js  # Tạo quiz, submit, analytics
│   │   ├── room.controller.js  # CRUD phòng, quản lý thành viên
│   │   └── payment.controller.js # VNPay, MoMo, COD
│   ├── models/                 # MongoDB schemas
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── Quiz.js
│   │   ├── QuizResult.js
│   │   ├── Conversation.js
│   │   └── Order.js
│   ├── routes/                 # API endpoints
│   ├── services/               # AI service (Gemini)
│   ├── middleware/              # Auth, rate limit, error handling
│   ├── sockets/                # Socket.IO handlers
│   └── server.js               # Entry point
│
├── frontend/                   # Frontend (React/Vite)
│   └── src/
│       ├── pages/
│       │   ├── Dashboard/      # Trang chính + Quick Resume + AI Suggestions
│       │   ├── Room/           # Phòng học + 7 tabs
│       │   │   └── tabs/       # ChatTab, GroupChatTab, NotesTab, QuizTab,
│       │   │                   # FlashcardMode, PomodoroTimer, AnalyticsTab
│       │   ├── Auth/           # Login, Register
│       │   ├── Profile/        # Quản lý tài khoản
│       │   ├── Pricing/        # So sánh gói
│       │   ├── Payment/        # Thanh toán
│       │   └── Quiz/           # Chi tiết quiz
│       ├── contexts/           # AuthContext, ThemeContext
│       ├── services/           # API client (Axios), Socket service
│       └── components/         # Shared components
│
├── .env                        # Biến môi trường
├── package.json                # Backend dependencies
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu
- **Node.js** v18 trở lên
- **MongoDB** (Atlas hoặc Local)
- **Google Gemini API Key**
- **VNPay Sandbox** credentials (nếu dùng thanh toán)

### 1. Clone & Cài đặt
```bash
git clone https://github.com/trankien022/studyMate.git
cd studyMate

# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc:
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=your_mongodb_uri

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# VNPay (tùy chọn)
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5000/api/payment/vnpay-return

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Chạy dự án
```bash
# Terminal 1 — Backend (port 5000)
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Truy cập **http://localhost:5173** để bắt đầu.

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| **Auth** | | |
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Lấy thông tin user |
| PUT | `/api/auth/profile` | Cập nhật profile |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |
| **Rooms** | | |
| POST | `/api/rooms` | Tạo phòng |
| GET | `/api/rooms` | Danh sách phòng |
| GET | `/api/rooms/:id` | Chi tiết phòng |
| POST | `/api/rooms/join` | Tham gia bằng mã mời |
| POST | `/api/rooms/:id/leave` | Rời phòng |
| DELETE | `/api/rooms/:id` | Xóa phòng |
| PATCH | `/api/rooms/:id/transfer` | Chuyển quyền chủ phòng |
| DELETE | `/api/rooms/:id/members/:memberId` | Đuổi thành viên |
| **AI** | | |
| POST | `/api/ai/chat` | Chat với AI |
| POST | `/api/ai/summarize` | Tóm tắt văn bản |
| POST | `/api/ai/explain-quiz` | Giải thích câu hỏi quiz |
| GET | `/api/ai/study-suggestions` | 🆕 Gợi ý học tập AI cá nhân hóa |
| GET | `/api/ai/history/:roomId` | Lịch sử chat AI |
| **Quiz** | | |
| POST | `/api/quiz/generate` | Tạo quiz bằng AI |
| GET | `/api/quiz/:roomId` | Danh sách quiz |
| POST | `/api/quiz/:id/submit` | Nộp bài quiz |
| GET | `/api/quiz/:id/results` | Bảng xếp hạng |
| GET | `/api/quiz/analytics/:roomId` | Thống kê học tập |
| **Payment** | | |
| POST | `/api/payment/create-url` | Tạo URL thanh toán |
| GET | `/api/payment/history` | Lịch sử thanh toán |

---

## 🤝 Đóng góp
Chúng tôi luôn hoan nghênh mọi ý tưởng và đóng góp. Hãy fork repository và gửi Pull Request!

## 📄 License
Dự án được phát hành dưới giấy phép **ISC License**.

---

Created with ❤️ by **trankien022**
