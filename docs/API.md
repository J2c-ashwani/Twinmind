# API Reference

Complete API documentation for TwinMind backend.

**Base URL**: `https://your-api.onrender.com`

All endpoints require authentication unless specified otherwise.

---

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

Get token from Supabase client: `supabase.auth.getSession()`

---

## Endpoints

### Authentication

#### Complete User Signup
```http
POST /api/auth/signup
```

**Body**:
```json
{
  "userId": "uuid",
  "fullName": "string",
  "email": "string",
  "country": "string" (optional)
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "user": { ... }
}
```

---

### Personality

#### Get Questions
```http
GET /api/personality/questions
```

No authentication required.

**Response**: `200 OK`
```json
{
  "questions": [
    {
      "id": 1,
      "question_text": "How do you approach new experiences?",
      "category": "big_five",
      "subcategory": "openness",
      "question_order": 1
    }
  ]
}
```

#### Submit Answers
```http
POST /api/personality/submit-answers
```

**Body**:
```json
{
  "answers": [
    {
      "question_id": 1,
      "answer_text": "I embrace new experiences..."
    }
  ]
}
```

**Response**: `200 OK`

#### Generate Personality
```http
POST /api/personality/generate
```

Triggers AI personality generation from submitted answers.

**Response**: `200 OK`
```json
{
  "success": true,
  "personality": {
    "user_id": "uuid",
    "personality_json": { ... },
    "twin_name": "John's Twin",
    "twin_summary": "..."
  },
  "twinName": "John's Twin",
  "twinSummary": "..."
}
```

#### Get Personality Profile
```http
GET /api/personality/profile
```

**Response**: `200 OK`
```json
{
  "personality": {
    "personality_json": {
      "big_five": { ... },
      "strengths": [...],
      "communication_style": { ... }
    },
    "twin_name": "...",
    "twin_summary": "..."
  }
}
```

---

### Chat

#### Send Message
```http
POST /api/chat/message
```

**Body**:
```json
{
  "message": "Hello, how are you?",
  "mode": "normal"
}
```

Modes: `normal`, `future`, `dark`, `therapist`

**Response**: `200 OK`
```json
{
  "message": "AI response text",
  "mode": "normal",
  "timestamp": "2025-11-27T00:00:00.000Z",
  "memoriesUsed": 15,
  "usage": {
    "messages": 25,
    "limit": 50,
    "remaining": 25
  }
}
```

**Error**: `403 Forbidden` (if mode requires Pro)
```json
{
  "error": "Future Twin mode requires a Pro subscription",
  "upgrade": true
}
```

#### Get Chat History
```http
GET /api/chat/history?limit=50&mode=normal
```

**Query Parameters**:
- `limit` (optional): Number of messages, default 50
- `mode` (optional): Filter by mode

**Response**: `200 OK`
```json
{
  "history": [
    {
      "id": "uuid",
      "message": "...",
      "sender": "user",
      "mode": "normal",
      "created_at": "..."
    }
  ]
}
```

#### Clear Chat History
```http
DELETE /api/chat/history?mode=normal
```

**Query Parameters**:
- `mode` (optional): Clear specific mode only

**Response**: `200 OK`

#### Get Available Modes
```http
GET /api/chat/modes
```

**Response**: `200 OK`
```json
{
  "modes": [
    {
      "id": "normal",
      "name": "Normal Twin",
      "description": "...",
      "available": true,
      "requiresPro": false
    },
    {
      "id": "future",
      "name": "Future Twin",
      "description": "...",
      "available": false,
      "requiresPro": true
    }
  ]
}
```

---

### Subscription

#### Get Subscription Status
```http
GET /api/subscription/status
```

**Response**: `200 OK`
```json
{
  "subscription": {
    "user_id": "uuid",
    "plan_type": "pro",
    "status": "active",
    "current_period_end": "2025-12-27T00:00:00.000Z"
  }
}
```

#### Create Checkout Session
```http
POST /api/subscription/create-checkout
```

**Body**:
```json
{
  "priceId": "price_xyz",
  "planType": "monthly"
}
```

**Response**: `200 OK`
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

Redirect user to this URL to complete payment.

#### Stripe Webhook
```http
POST /api/subscription/webhook
```

Stripe sends events here. Verify webhook signature.

#### Cancel Subscription
```http
POST /api/subscription/cancel
```

**Response**: `200 OK`

---

### Memory

#### Get Memory Count
```http
GET /api/memory/count
```

**Response**: `200 OK`
```json
{
  "count": 245
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Requires Pro subscription |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited or tier limit reached |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Check `X-RateLimit-*` headers in response

**Response** when limited:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Webhooks

### Stripe Webhook Events

Configure webhook endpoint: `POST /api/subscription/webhook`

**Events handled**:
- `checkout.session.completed` - Subscription created
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled

Webhook signing secret required in environment variable.

---

## Example Usage

### JavaScript (Web)

```javascript
const token = await supabase.auth.getSession().access_token

const response = await fetch('https://api.twinmind.ai/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: 'What should I do today?',
    mode: 'normal'
  })
})

const data = await response.json()
console.log(data.message) // AI response
```

### Dart (Flutter)

```dart
final token = Supabase.instance.client.auth.currentSession?.accessToken;

final response = await http.post(
  Uri.parse('$apiUrl/api/chat/message'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  },
  body: json.encode({
    'message': 'What should I do today?',
    'mode': 'normal',
  }),
);

final data = json.decode(response.body);
print(data['message']); // AI response
```

---

## Testing

Use Postman or curl to test endpoints:

```bash
curl -X POST https://api.twinmind.ai/api/chat/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello twin!",
    "mode": "normal"
  }'
```

---

**API Version**: 1.0  
**Last Updated**: 2025-11-27
