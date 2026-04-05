# 🌊 EcoShore - Beach Cleanup Management Platform

**Life Below Water** Beach cleanup management with waste analytics and pollution prediction.
**Classification: Public-SLIIT**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen.svg)](https://mongodb.com/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Features by Module](#features-by-module)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Installation & Setup](#installation--setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Git Workflow](#git-workflow)
- [Team Contributions](#team-contributions)

---

## 🎯 Project Overview

**EcoShore** is a full-stack MERN (MongoDB, Express.js, React, Node.js) application designed to organize beach cleanup events, track waste collection data, and provide advanced analytics for plastic pollution monitoring. The platform empowers volunteers, organizers, and administrators with data-driven insights to maximize environmental impact.

### Key Features

- ✅ Event management with volunteer registration
- ✅ Real-time waste tracking with plastic categorization
- ✅ AI-powered pollution prediction (7-day forecast, 89% confidence)
- ✅ Carbon offset calculation with relatable equivalents
- ✅ Severity ranking algorithm for beach prioritization
- ✅ Community engagement (discussions, badges, leaderboard)
- ✅ Role-based access control (Admin, Organizer, Volunteer, Sponsor)
- ✅ Exportable reports (JSON/CSV)

---

## 🌍 Problem Statement

| Problem                                         | Impact                                |
| ----------------------------------------------- | ------------------------------------- |
| Sri Lanka ranks #5 in global plastic pollution  | Urgent need for data-driven solutions |
| 8 million tons of plastic enter oceans annually | Ineffective resource allocation       |
| 90% of marine debris never gets tracked         | No measurable impact metrics          |
| Cleanup efforts lack scientific backing         | Poor volunteer engagement             |

**Our Solution:** A centralized platform that transforms raw cleanup data into actionable environmental intelligence.

---

### Clean Architecture Layers

| Layer            | Folder        | Responsibility                     |
| ---------------- | ------------- | ---------------------------------- |
| **Routes**       | `/routes`     | API endpoint definitions           |
| **Controllers**  | `/controller` | HTTP request/response handling     |
| **Services**     | `/service`    | Business logic implementation      |
| **Repositories** | `/repository` | Database operations abstraction    |
| **Models**       | `/models`     | MongoDB schema definitions         |
| **Middleware**   | `/middleware` | Auth, validation, error handling   |
| **Providers**    | `/providers`  | External service integrations      |
| **Utils**        | `/utils`      | Helper functions and custom errors |

### SOLID Principles Implementation

| Principle                 | Implementation                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **Single Responsibility** | Each class has one reason to change (Service = business logic, Repository = data access) |
| **Open/Closed**           | BaseRepository extends to specific repositories                                          |
| **Liskov Substitution**   | All repositories follow same interface                                                   |
| **Interface Segregation** | Specific interfaces for specific needs                                                   |
| **Dependency Inversion**  | Controllers depend on Service interfaces, Services depend on Repository interfaces       |

---

## 🛠️ Technology Stack

### Backend

| Technology  | Version | Purpose             |
| ----------- | ------- | ------------------- |
| Node.js     | 20.x    | Runtime environment |
| Express.js  | 4.18.x  | Web framework       |
| MongoDB     | 6.x     | Database            |
| Mongoose    | 7.x     | ODM                 |
| JWT         | 9.x     | Authentication      |
| Passport.js | 0.6.x   | Google OAuth        |
| Joi         | 17.x    | Request validation  |
| Swagger UI  | 5.x     | API documentation   |
| Winston     | 3.x     | Logging             |
| Jest        | 29.x    | Unit testing        |

### Frontend

| Technology    | Version | Purpose            |
| ------------- | ------- | ------------------ |
| React         | 18.x    | UI framework       |
| Vite          | 4.x     | Build tool         |
| Tailwind CSS  | 3.x     | Styling            |
| React Router  | 6.x     | Routing            |
| Axios         | 1.x     | API calls          |
| Chart.js      | 4.x     | Data visualization |
| React Leaflet | 4.x     | Maps               |
| Context API   | -       | State management   |

### Machine Learning

| Technology   | Purpose                 |
| ------------ | ----------------------- |
| Python 3.10  | ML runtime              |
| Flask        | API microservice        |
| Prophet      | Time series forecasting |
| Scikit-learn | Random Forest model     |
| Pandas       | Data processing         |

### DevOps & Tools

| Tool           | Purpose          |
| -------------- | ---------------- |
| Git            | Version control  |
| GitHub Actions | CI/CD            |
| Docker         | Containerization |
| Husky          | Git hooks        |
| ESLint         | Code linting     |
| Prettier       | Code formatting  |

---

## ✨ Features by Module

### Module 1: User & Role Management

| Feature            | Description                                |
| ------------------ | ------------------------------------------ |
| JWT Authentication | Secure token-based authentication          |
| Google OAuth       | Social login integration                   |
| Role-Based Access  | Admin, Organizer, Volunteer, Sponsor roles |
| Profile Management | User profile editing and avatar upload     |
| Organizer Requests | Volunteer → Organizer approval workflow    |
| Session Management | Persistent login with token refresh        |

### Module 2: Event Management

| Feature                | Description                              |
| ---------------------- | ---------------------------------------- |
| CRUD Operations        | Create, read, update, delete events      |
| Volunteer Registration | Join/leave events with capacity tracking |
| Event Calendar         | Upcoming events listing with filters     |
| Location Mapping       | Beach coordinates with map integration   |
| Automatic Chat Groups  | Event-specific chat groups auto-created  |
| Event Reminders        | Email/notification reminders             |

### Module 3: Waste Data Collection

| Feature                | Description                                 |
| ---------------------- | ------------------------------------------- |
| Waste Entry            | Record plastic type, weight, and conditions |
| Plastic Categorization | PET, HDPE, PVC, LDPE, PP, PS, OTHER         |
| Weather Tracking       | Record temperature, wind, rain conditions   |
| Photo Upload           | Attach images of collected waste            |
| Verification System    | Admin verification of waste records         |
| Bulk Entry             | Quick-add multiple waste entries            |

### Module 4: Analytics Dashboard

| Feature                    | Description                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Real-time Dashboard        | Live metrics: total waste, carbon offset, most polluted beach                        |
| Severity Ranking Algorithm | 4-factor weighted scoring (40% volume, 30% non-recyclable, 20% frequency, 10% trend) |
| Plastic Type Analytics     | Pie/bar charts showing composition breakdown                                         |
| Monthly Trends             | Time-series visualization of waste patterns                                          |
| Carbon Offset Calculation  | Weight × emission factor × plastic multiplier                                        |
| Relatable Equivalents      | CO₂ converted to cars/trees/homes                                                    |
| AI Pollution Prediction    | 7-day forecast using Prophet + Random Forest (89% confidence)                        |
| Report Export              | JSON and CSV export functionality                                                    |

**Severity Score Formula:**

Score = (40% × Volume Score) + (30% × Non-recyclable Score) + (20% × Frequency Score) + (10% × Trend Score)

**Carbon Offset Formula:**

Carbon Offset (kg CO₂) = Weight (kg) × Emission Factor (2.5) × Plastic Multiplier

### Module 5: Community Engagement

| Feature            | Description                            |
| ------------------ | -------------------------------------- |
| Discussion Forums  | Beach/event specific discussions       |
| Comments & Likes   | Social interaction on posts            |
| Awareness Posts    | Environmental tips and news            |
| Achievement Badges | 10+ badges for volunteer milestones    |
| Leaderboard        | Rank volunteers by points and cleanups |
| Points System      | Earn points for participation          |

### Module 6: Chat System

| Feature             | Description                                  |
| ------------------- | -------------------------------------------- |
| Real-time Messaging | Firebase Realtime Database integration       |
| Group Chats         | Global, organizer, and event-specific groups |
| Message Status      | Seen/unseen indicators                       |
| Media Sharing       | Image and file attachments                   |
| Push Notifications  | New message alerts                           |

---

## 📡 API Documentation

### Base URL

http://localhost:4000/api

## Setup

**Requirements:** Node.js 18+, MongoDB 6+, Python 3.10+ (ML service)

```bash
git clone https://github.com/nirmal-404/EcoShore-Backend.git
cd EcoShore-Backend
npm install
```

Create `.env`:

```
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/ecoshore
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
ML_SERVICE_URL=http://localhost:5001
ML_TRAIN_SECRET=ecoshore_train_secret
WEATHER_API_KEY=your_weather_api_key
```

Place `firebase-service-account.json` inside `src/config/`.

**ML service (optional):**

```bash
cd ml-service
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt && python train.py
```

**Run:**

```bash
npm run dev        # API: http://localhost:4000
                   # Swagger UI: http://localhost:4000/api-docs
cd ml-service && python app.py   # ML: http://localhost:5001
```

---

## User Roles

| Role        | Access                          |
| ----------- | ------------------------------- |
| `volunteer` | Join events, post content       |
| `organizer` | Create events and chat groups   |
| `admin`     | Full access                     |
| `agent`     | Submit waste records via portal |

---

## API Endpoints

**Base URL:** `http://localhost:4000/api`
**Auth header:** `Authorization: Bearer <token>`

### Auth

| Method | Endpoint         | Auth |
| ------ | ---------------- | ---- |
| POST   | `/auth/register` | No   |
| POST   | `/auth/login`    | No   |
| GET    | `/auth/google`   | No   |
| GET    | `/auth/me`       | Yes  |

### Beaches

| Method | Endpoint                    | Auth | Role  |
| ------ | --------------------------- | ---- | ----- |
| POST   | `/beaches`                  | Yes  | admin |
| GET    | `/beaches`                  | No   |       |
| GET    | `/beaches/severity-ranking` | No   |       |
| GET    | `/beaches/:beachId`         | No   |       |
| PUT    | `/beaches/:beachId`         | Yes  | admin |
| DELETE | `/beaches/:beachId`         | Yes  | admin |

### Waste Records

| Method         | Endpoint                                  | Auth | Role      |
| -------------- | ----------------------------------------- | ---- | --------- |
| POST           | `/waste-records/portal/submissions`       | Yes  | agent     |
| GET            | `/waste-records/portal/submissions`       | Yes  | agent     |
| POST           | `/waste-records`                          | Yes  | any       |
| GET            | `/waste-records`                          | Yes  | any       |
| GET            | `/waste-records/analytics/plastic-type`   | Yes  | any       |
| GET            | `/waste-records/analytics/monthly-trends` | Yes  | any       |
| GET/PUT/DELETE | `/waste-records/:recordId`                | Yes  | any/admin |
| PATCH          | `/waste-records/:recordId/verify`         | Yes  | any       |

### Analytics _(auth required)_

| Method | Endpoint                          |
| ------ | --------------------------------- |
| GET    | `/analytics/dashboard`            |
| GET    | `/analytics/severity-ranking`     |
| POST   | `/analytics/severity/recalculate` |
| GET    | `/analytics/trend-prediction`     |
| GET    | `/analytics/carbon-offset`        |
| GET    | `/analytics/export/json`          |
| GET    | `/analytics/export/csv`           |

### Heatmap _(auth required)_

| Method | Endpoint           | Role  |
| ------ | ------------------ | ----- |
| GET    | `/heatmap`         | any   |
| GET    | `/heatmap/health`  | any   |
| POST   | `/heatmap/refresh` | admin |

### Agents _(admin only)_

| Method | Endpoint                             |
| ------ | ------------------------------------ |
| POST   | `/agents`                            |
| GET    | `/agents`                            |
| GET    | `/agents/:agentId`                   |
| DELETE | `/agents/:agentId`                   |
| PATCH  | `/agents/:agentId/reassign/:beachId` |

### Carbon Config _(auth required)_

| Method         | Endpoint                            |
| -------------- | ----------------------------------- |
| GET            | `/carbon-config/active`             |
| POST/GET       | `/carbon-config`                    |
| GET/PUT/DELETE | `/carbon-config/:configId`          |
| PATCH          | `/carbon-config/:configId/activate` |
| POST           | `/carbon-config/reset/default`      |

### Events

| Method | Endpoint            | Auth | Role            |
| ------ | ------------------- | ---- | --------------- |
| POST   | `/events`           | Yes  | organizer/admin |
| GET    | `/events`           | No   |                 |
| GET    | `/events/:id`       | No   |                 |
| PATCH  | `/events/:id`       | Yes  | organizer/admin |
| POST   | `/events/:id/join`  | Yes  | volunteer       |
| POST   | `/events/:id/leave` | Yes  | volunteer       |
| DELETE | `/events/:id`       | Yes  | admin/volunteer |

### Chat Groups _(auth required)_

| Method            | Endpoint                                    | Role            |
| ----------------- | ------------------------------------------- | --------------- |
| POST              | `/chat/groups`                              | organizer/admin |
| GET               | `/chat/groups`                              | any             |
| GET               | `/chat/groups/:id`                          | any             |
| POST/DELETE/PATCH | `/chat/groups/:id/members`                  | group admin     |
| POST/GET          | `/chat/groups/:id/messages`                 | group member    |
| DELETE            | `/chat/groups/:id/messages/:messageId`      | group admin     |
| PATCH             | `/chat/groups/:id/messages/:messageId/seen` | group member    |

### Community Content

| Method      | Endpoint                        | Auth         |
| ----------- | ------------------------------- | ------------ |
| POST        | `/community/posts`              | Yes          |
| GET         | `/community/posts`              | Optional     |
| GET/PATCH   | `/community/posts/:id`          | Optional/Yes |
| POST/GET    | `/community/posts/:id/comments` | Yes/Optional |
| POST/DELETE | `/community/posts/:id/like`     | Yes          |
| POST        | `/community/posts/:id/share`    | Yes          |
| DELETE      | `/community/content/:id`        | Yes          |

### Organizer Requests

| Method | Endpoint                         | Role      |
| ------ | -------------------------------- | --------- |
| POST   | `/organizer-requests`            | volunteer |
| GET    | `/organizer-requests`            | admin     |
| GET    | `/organizer-requests/me`         | any       |
| PATCH  | `/organizer-requests/:id/review` | admin     |
| DELETE | `/organizer-requests/:id`        | any       |

### File Upload

| Method | Endpoint       | Auth | Role            |
| ------ | -------------- | ---- | --------------- |
| POST   | `/upload-file` | Yes  | organizer/admin |

### ML Microservice `http://localhost:5001`

| Method | Endpoint   | Description          |
| ------ | ---------- | -------------------- |
| GET    | `/health`  | Health check         |
| POST   | `/predict` | Pollution prediction |
| POST   | `/train`   | Retrain model        |

---

## Request / Response Examples

### Register

```http
POST /api/auth/register
Content-Type: application/json

{ "name": "Jane Doe", "email": "jane@eco.com", "password": "Pass123!" }
```

```json
// 201 Created
{
  "status": "success",
  "data": {
    "token": "<jwt>",
    "user": { "_id": "...", "email": "jane@eco.com", "role": "volunteer" }
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "jane@eco.com", "password": "Pass123!" }
```

```json
// 200 OK
{
  "status": "success",
  "data": { "token": "<jwt>", "user": { "_id": "...", "role": "volunteer" } }
}
```

### Create Beach _(admin)_

```http
POST /api/beaches
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "Galle Face", "location": { "type": "Point", "coordinates": [79.84, 6.91] }, "description": "Urban beach in Colombo." }
```

```json
// 201 Created
{
  "status": "success",
  "data": {
    "beach": { "_id": "...", "name": "Galle Face", "severityScore": 0 }
  }
}
```

### Submit Waste Record _(agent)_

```http
POST /api/waste-records/portal/submissions
Authorization: Bearer <token>
Content-Type: application/json

{ "plasticType": "PET", "weight": 12.5, "source": "shoreline", "collectionDate": "2025-08-01" }
```

```json
// 201 Created
{
  "status": "success",
  "data": { "record": { "_id": "...", "plasticType": "PET", "weight": 12.5 } }
}
```

### Get Dashboard Analytics

```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

```json
// 200 OK
{
  "status": "success",
  "data": {
    "totalWasteKg": 1540.3,
    "activeBeaches": 8,
    "totalVolunteers": 120,
    "totalEvents": 35
  }
}
```

### File Upload

```http
POST /api/upload-file
Authorization: Bearer <token>
Content-Type: multipart/form-data

// Form-data:
// file: [Selected File]
// folder: "beaches" (optional)
```

```json
// 200 OK
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "public_id": "...",
    "resource_type": "image",
    "format": "jpg"
  }
}
```

### Error Response (all endpoints)

```json
// 400 / 401 / 403 / 404 / 500
{ "status": "fail", "message": "Descriptive error message" }
```

---

## HTTP Status Codes

| Code | Meaning          |
| ---- | ---------------- |
| 200  | Success          |
| 201  | Created          |
| 400  | Validation error |
| 401  | Unauthorized     |
| 403  | Forbidden        |
| 404  | Not found        |
| 500  | Server error     |

---

## Deployment

See [DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md) for deployment instructions.

## Testing

See [TESTING_REPORT.md](TESTING_REPORT.md) for testing instructions.

80% completed
