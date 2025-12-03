# Endpoint Verification Report 🕵️‍♂️

## 🚨 Critical Issues

### 1. Mobile App Path Inconsistency
The mobile app (`ApiService.dart`) is inconsistent with API paths. The backend mounts all routes under `/api`, but the mobile app omits this prefix for several services.

| Service | Mobile Path (Current) | Backend Path (Required) | Status |
|---------|-----------------------|-------------------------|--------|
| **Memory** | `/memories` | `/api/memory/memories` | ❌ Broken |
| **Gamification** | `/gamification/status` | `/api/gamification/status` | ❌ Broken |
| **Daily** | `/daily/challenges` | `/api/daily/challenges` | ❌ Broken |
| **Insights** | `/insights/weekly` | `/api/insights/weekly` | ❌ Broken |
| **Referral** | `/referral/code` | `/api/referral/code` | ❌ Broken |
| **Personality** | `/api/personality/...` | `/api/personality/...` | ✅ Correct |
| **Chat** | `/api/chat/...` | `/api/chat/...` | ✅ Correct |

### 2. Missing Backend Endpoints
The mobile app tries to call these endpoints, but they **do not exist** in the backend code:

*   **Memory**:
    *   `GET /api/memory/memories` (Backend only has `/count`)
    *   `POST /api/memory/:id/favorite`
*   **Referral**:
    *   `GET /api/referral/code` (No referral routes found)
    *   `GET /api/referral/stats`

### 3. Missing Mobile Features
The backend has these endpoints ready, but the mobile app is not using them yet:

*   **Subscription**:
    *   `GET /api/subscription/status`
    *   `POST /api/subscription/create-checkout`
    *   `POST /api/subscription/cancel`
*   **Daily**:
    *   `GET /api/daily/mood/history`
*   **Insights**:
    *   `GET /api/insights/monthly`
    *   `GET /api/insights/evolution`
*   **Chat**:
    *   `DELETE /api/chat/history`
*   **Personality**:
    *   `POST /api/personality/regenerate`

## ✅ Recommendations

1.  **Fix Mobile Paths**: Update `ApiService.dart` to prepend `/api` to all endpoints.
2.  **Implement Missing Backend Routes**:
    *   Update `memory.routes.js` to include `/memories` and `/favorite`.
    *   Create `referral.routes.js` and implement logic.
3.  **Implement Missing Mobile Features**:
    *   Add methods to `ApiService.dart` for subscription, mood history, and insights.
