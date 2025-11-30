# Quizium API

Quizium API is the backend powering the Quizium examination platform.  
It handles users, exams, questions, scoring, subjects, and all admin operations.  
This API is intended to be used **exclusively** by the official Quizium frontend:

👉 **Frontend App:**  
https://quizium-eight.vercel.app/

---

## 🚀 Overview

The system provides all the logic required for an online exam platform, including:

- User registration & login  
- JWT-based authentication  
- Profile management  
- Subjects & topics  
- Exams & questions  
- Score calculation  
- Leaderboard  
- Admin panel with full CRUD  
- Exam review flow  

This API was built quickly and practically ("vibe coding").  
It is **not meant** for public usage or external integrations.

---

## 🔐 Authentication

Quizium uses **JWT authentication**.

### Public:
- Register  
- Login  
- Forgot & reset password  
- Public profiles  
- View subjects  
- View exams  

### Protected (User):
Requires:
```
Authorization: Bearer <token>
```

### Admin:
Requires:
```
Authorization: Bearer <adminToken>
```

---

## 📦 Features

### Users
- Register, login  
- Update profile  
- Upload/delete profile image  
- Change password  
- Delete account  
- Take exams & submit answers  
- View results and review answers  

### Admin
- CRUD for subjects  
- CRUD for topics  
- CRUD for exams  
- CRUD for questions  
- Bulk delete actions (with confirmation)  

### Extra
- Leaderboard  
- Exam eligibility check  
- Health check endpoint  

---

## 📁 Folder Structure (Simplified)

```
/auth
/user
/subjects
/topics
/exams
/questions
/scores
/leaderboard
/health
```

---

## 🔑 Environment Variables

The project uses a `.env` file.

It contains **internal configuration values** for authentication, database, storage, and admin access.

---

## 🧭 Main Routes

### Authentication
```
POST /auth/register
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/set-new-password
```

### User
```
GET    /user/profile
GET    /user/public/:username
PUT    /user/profile
PUT    /user/change-password
POST   /user/profile/image
DELETE /user/profile/image
DELETE /user/account
```

### Admin User Actions
```
GET    /user/admin/users
DELETE /user/admin/users
```

### Subjects
```
GET    /subjects
GET    /subjects/:id
```

### Subjects (Admin)
```
POST   /subjects
PATCH  /subjects/:id
DELETE /subjects/:id
DELETE /subjects/admin/delete-all
```

### Topics
```
GET    /subjects/:subjectId/topics
GET    /subjects/:subjectId/topics/:topicId
```

### Topics (Admin)
```
POST    /subjects/:subjectId/topics
PATCH   /subjects/:subjectId/topics/:topicId
DELETE  /subjects/:subjectId/topics/:topicId
DELETE  /subjects/:id/topics
```

### Exams
```
GET /exams
GET /exams/:id
GET /scores/exam/:examId/check-eligibility
```

### Exams (Admin)
```
POST   /exams
PUT    /exams/:id
DELETE /exams/:id
DELETE /exams/admin/delete-all
```

### Questions
```
GET /questions/exam/:examId
GET /questions/:questionId
```

### Questions (Admin)
```
POST   /questions
PUT    /questions/:questionId
DELETE /questions/:questionId
```

### Scores & Results
```
POST /scores/exam/:examId/submit
GET  /scores/answers/:examId
GET  /scores/my-scores
```

### Leaderboard
```
GET /leaderboard
```

### Health
```
GET /health
```

---

## 🎯 Notes

- Only the official Quizium frontend should use this API.  
- External clients, SDKs, or third-party integrations are not supported.  
- This backend was built fast and practically, optimized for the Quizium project only.

---

# End of README
