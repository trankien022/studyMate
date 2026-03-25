# 📊 Entity-Relationship Diagram (ERD)

## Sơ đồ quan hệ dữ liệu — AI StudyMate

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        String name "2-50 ký tự, required"
        String email UK "unique, lowercase"
        String password "bcrypt hash, 6+ ký tự"
        String avatar "URL ảnh đại diện"
        Boolean isPremium "default false"
        Date premiumExpiry "null nếu chưa mua"
        Date createdAt
        Date updatedAt
    }

    ROOM {
        ObjectId _id PK
        String name "2-100 ký tự, required"
        String subject "required"
        String inviteCode UK "8 ký tự hex tự động"
        ObjectId owner FK "ref User"
        ObjectId[] members FK "ref User[]"
        String notes "ghi chú phòng"
        Date createdAt
        Date updatedAt
    }

    QUIZ {
        ObjectId _id PK
        ObjectId roomId FK "ref Room, indexed"
        String topic "required"
        Object[] questions "1-20 câu hỏi"
        ObjectId createdBy FK "ref User"
        Date createdAt
        Date updatedAt
    }

    QUIZ_RESULT {
        ObjectId _id PK
        ObjectId quizId FK "ref Quiz"
        ObjectId userId FK "ref User"
        Number score "min 0"
        Number total "min 1"
        Number[] answers "mảng index đáp án"
        Date submittedAt
        Date createdAt
    }

    CONVERSATION {
        ObjectId _id PK
        ObjectId roomId FK "ref Room, indexed"
        ObjectId userId FK "ref User, indexed"
        String title "default: Cuộc trò chuyện mới"
        Object[] messages "role + content + timestamp"
        Date createdAt
        Date updatedAt
    }

    ORDER {
        ObjectId _id PK
        ObjectId userId FK "ref User, indexed"
        String orderId UK "SM + timestamp"
        Number amount "required"
        String orderInfo "mô tả giao dịch"
        String status "pending | success | failed"
        String vnpayTransactionNo
        String bankCode
        String payDate
        Number premiumDays "default 30"
        Date createdAt
        Date updatedAt
    }

    USER ||--o{ ROOM : "owner (tạo phòng)"
    USER }o--o{ ROOM : "members (tham gia)"
    ROOM ||--o{ QUIZ : "chứa quiz"
    USER ||--o{ QUIZ : "createdBy (tạo quiz)"
    QUIZ ||--o{ QUIZ_RESULT : "kết quả làm bài"
    USER ||--o{ QUIZ_RESULT : "userId (người làm)"
    ROOM ||--o{ CONVERSATION : "hội thoại trong phòng"
    USER ||--o{ CONVERSATION : "userId (chủ hội thoại)"
    USER ||--o{ ORDER : "userId (người mua)"
```

## Mô tả quan hệ

| Quan hệ | Loại | Mô tả |
|---|---|---|
| User → Room (owner) | 1:N | Một user có thể sở hữu nhiều phòng |
| User ↔ Room (members) | N:M | Nhiều user tham gia nhiều phòng |
| Room → Quiz | 1:N | Một phòng có nhiều bộ quiz |
| User → Quiz (createdBy) | 1:N | Một user tạo nhiều quiz |
| Quiz → QuizResult | 1:N | Một quiz có nhiều kết quả |
| User → QuizResult | 1:N | Một user có nhiều kết quả quiz |
| Room → Conversation | 1:N | Một phòng có nhiều cuộc hội thoại AI |
| User → Conversation | 1:N | Một user có nhiều cuộc hội thoại |
| User → Order | 1:N | Một user có nhiều đơn thanh toán |

## Indexes

| Collection | Index | Loại | Mục đích |
|---|---|---|---|
| User | `email` | Unique | Đảm bảo email không trùng |
| Room | `inviteCode` | Unique | Đảm bảo mã mời không trùng |
| Quiz | `{ roomId: 1, createdAt: -1 }` | Compound | Query nhanh quiz theo phòng |
| QuizResult | `{ quizId: 1, userId: 1 }` | Compound Unique | Mỗi user chỉ nộp 1 lần/quiz |
| Conversation | `{ roomId: 1, userId: 1 }` | Compound | Query nhanh hội thoại |
| Order | `userId` | Single | Query đơn hàng theo user |

## Data Constraints (Validation)

| Field | Rule |
|---|---|
| User.name | 2-50 ký tự |
| User.email | Regex `^\S+@\S+\.\S+$` |
| User.password | ≥ 6 ký tự, bcrypt hash (salt 12) |
| Room.name | 2-100 ký tự |
| Quiz.questions | 1-20 câu, mỗi câu 4 options |
| Quiz.correctIndex | 0-3 |
| QuizResult.score | ≥ 0 |
| QuizResult.total | ≥ 1 |
| Order.status | enum: pending, success, failed |
