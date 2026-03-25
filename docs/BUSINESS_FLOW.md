# 📋 Business Flow & Use-Case Diagrams

## 1. Use-Case Diagram

```mermaid
graph TB
    subgraph Actors
        S["🎓 Student<br/>(Free User)"]
        P["👑 Premium Student"]
        AI["🤖 Gemini AI"]
        VP["💳 VNPay Gateway"]
    end

    subgraph Authentication
        UC1["Đăng ký tài khoản"]
        UC2["Đăng nhập"]
        UC3["Quản lý hồ sơ"]
        UC4["Đổi mật khẩu"]
    end

    subgraph Room_Management["Room Management"]
        UC5["Tạo phòng học"]
        UC6["Tham gia phòng<br/>(mã mời)"]
        UC7["Quản lý thành viên<br/>(kick, chuyển quyền)"]
        UC8["Rời/Xóa phòng"]
    end

    subgraph Study_Tools["Study Tools"]
        UC9["Soạn ghi chú<br/>(real-time sync)"]
        UC10["Chat nhóm<br/>(Socket.IO)"]
        UC11["Flashcard Mode"]
        UC12["Pomodoro Timer"]
    end

    subgraph AI_Features["AI Features"]
        UC13["Chat AI hỏi đáp"]
        UC14["Tóm tắt bài học"]
        UC15["Tạo Quiz tự động"]
        UC16["Giải thích Quiz"]
        UC17["Gợi ý học tập<br/>cá nhân hóa"]
    end

    subgraph Quiz_System["Quiz System"]
        UC18["Làm bài quiz"]
        UC19["Xem bảng xếp hạng"]
        UC20["Xem analytics"]
        UC21["Xóa quiz"]
    end

    subgraph Payment["Payment & Premium"]
        UC22["Xem gói Premium"]
        UC23["Thanh toán VNPay"]
        UC24["Xem lịch sử<br/>thanh toán"]
    end

    S --> UC1 & UC2 & UC3 & UC4
    S --> UC5 & UC6 & UC8
    S --> UC9 & UC10 & UC11 & UC12
    S --> UC13 & UC14 & UC15 & UC16
    S --> UC18 & UC19 & UC20
    S --> UC22

    P --> UC7
    P --> UC17
    P --> UC23 & UC24

    AI --> UC13 & UC14 & UC15 & UC16 & UC17
    VP --> UC23

    style P fill:#FFD700,color:#000
    style AI fill:#4285F4,color:#fff
    style VP fill:#005BAA,color:#fff
```

## 2. Business Flow — Luồng nghiệp vụ chính

```mermaid
flowchart TD
    START([Truy cập ứng dụng]) --> AUTH{Đã đăng nhập?}
    AUTH -->|Chưa| LOGIN[Đăng nhập / Đăng ký]
    AUTH -->|Rồi| DASH[Dashboard]
    LOGIN --> DASH

    DASH --> |Tạo phòng mới| CREATE_ROOM[Nhập tên + môn học]
    DASH --> |Nhập mã mời| JOIN_ROOM[Tham gia phòng]
    DASH --> |Chọn phòng có sẵn| ENTER_ROOM[Vào phòng học]
    DASH --> |Xem gợi ý AI| AI_SUGGEST[AI Study Suggestions]
    DASH --> |Nâng cấp Premium| PRICING[Trang Pricing]

    CREATE_ROOM --> ENTER_ROOM
    JOIN_ROOM --> ENTER_ROOM

    subgraph ROOM["🏠 Trong phòng học"]
        ENTER_ROOM --> TABS{Chọn tab}
        TABS --> TAB_CHAT[💬 Chat AI]
        TABS --> TAB_GROUP[👥 Group Chat]
        TABS --> TAB_NOTES[📝 Notes]
        TABS --> TAB_QUIZ[🧠 Quiz]
        TABS --> TAB_FLASH[🃏 Flashcard]
        TABS --> TAB_POMO[⏱️ Pomodoro]
        TABS --> TAB_ANALY[📊 Analytics]
    end

    TAB_CHAT --> |Gửi câu hỏi| AI_CHAT[Gemini AI trả lời]
    AI_CHAT --> |Lưu conversation| DB_CONV[(MongoDB)]

    TAB_QUIZ --> |Chọn chủ đề| GEN_QUIZ[AI tạo Quiz]
    GEN_QUIZ --> DO_QUIZ[Làm bài quiz]
    DO_QUIZ --> RESULT[Xem kết quả + giải thích]
    RESULT --> |AI giải thích| AI_EXPLAIN[Gemini giải thích chi tiết]
    RESULT --> LEADER[Bảng xếp hạng]

    TAB_NOTES --> |Soạn thảo| SOCKET_NOTES[Real-time sync qua Socket.IO]

    PRICING --> VNPAY[Thanh toán VNPay]
    VNPAY --> |IPN callback| VERIFY[Xác thực chữ ký HMAC-SHA512]
    VERIFY --> |Thành công| UPGRADE[Nâng cấp Premium]
    VERIFY --> |Thất bại| FAIL[Thông báo lỗi]

    style AI_CHAT fill:#4285F4,color:#fff
    style GEN_QUIZ fill:#4285F4,color:#fff
    style AI_EXPLAIN fill:#4285F4,color:#fff
    style AI_SUGGEST fill:#4285F4,color:#fff
    style VNPAY fill:#005BAA,color:#fff
```

## 3. Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client (React)
    participant S as Server (Express)
    participant DB as MongoDB
    participant JWT as JWT Module

    Note over C,JWT: Đăng ký
    C->>S: POST /api/auth/register {name, email, password}
    S->>S: Validate input (required, format)
    S->>DB: Check email exists
    DB-->>S: Not found
    S->>DB: Create User (bcrypt hash password)
    S->>JWT: Sign token (userId, 7d expiry)
    S-->>C: 201 {user, token}
    C->>C: localStorage.setItem("token", token)

    Note over C,JWT: Đăng nhập
    C->>S: POST /api/auth/login {email, password}
    S->>DB: findOne({email}).select("+password")
    S->>S: bcrypt.compare(password, hash)
    S->>JWT: Sign token
    S-->>C: 200 {user, token}

    Note over C,JWT: Request có Auth
    C->>S: GET /api/rooms (Authorization: Bearer token)
    S->>JWT: jwt.verify(token, secret)
    JWT-->>S: {id: userId}
    S->>DB: findById(userId)
    S-->>C: 200 {rooms}
```

## 4. AI Quiz Generation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant BE as Express Backend
    participant AI as Gemini 2.5 Flash
    participant DB as MongoDB

    U->>FE: Nhập chủ đề quiz + số câu
    FE->>BE: POST /api/quiz/generate {roomId, topic, count}
    BE->>BE: Auth middleware (JWT verify)
    BE->>BE: Rate limit check (10 req/10 min)
    BE->>DB: checkRoomMembership(roomId, userId)
    BE->>AI: generateContent(prompt)
    Note over BE,AI: Prompt yêu cầu JSON array<br/>[{question, options[4], correctIndex, explanation}]
    AI-->>BE: JSON response
    BE->>BE: Parse JSON + Validate structure
    BE->>DB: Quiz.create({roomId, topic, questions})
    BE->>BE: Socket.IO emit("quiz_created")
    BE-->>FE: 201 {quiz summary}
    FE-->>U: Hiển thị quiz mới
```

## 5. Payment Flow (VNPay)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React
    participant BE as Express
    participant VP as VNPay Sandbox
    participant DB as MongoDB

    U->>FE: Click "Nâng cấp Premium"
    FE->>BE: POST /api/payment/create-url {amount: 99000}
    BE->>DB: Order.create({status: "pending"})
    BE->>BE: Build VNPay params + sortObject
    BE->>BE: HMAC-SHA512 signature
    BE-->>FE: {paymentUrl}
    FE->>VP: Redirect to VNPay

    U->>VP: Nhập thẻ + xác nhận
    VP->>BE: GET /api/payment/vnpay-return?params
    BE->>BE: Verify signature (HMAC-SHA512)
    BE->>DB: Update Order status → "success"
    BE->>DB: User.isPremium = true
    BE-->>FE: Redirect to /payment/vnpay-return
    FE-->>U: Hiển thị kết quả thanh toán
```
