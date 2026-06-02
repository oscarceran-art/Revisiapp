# Token Limit Implementation for Revisiapp

## Overview
Token limit functionality has been added to prevent users from exceeding their allocated AI generation quota. Users are now blocked from making AI requests when they reach their daily or weekly token limits.

## Implementation Details

### 1. Backend Changes

#### Main Backend (`backend/server.py`)
The primary backend already had authentication integrated. The following changes were made:

1. **Updated `_charge_tokens` function** - Now accepts an `estimated_tokens` parameter to properly adjust token counts after actual usage is known.

2. **Added pre-checks to all AI endpoints** - Each endpoint now:
   - Calls `auth_module.check_and_charge_tokens(user, estimated_tokens)` BEFORE making the AI API call
   - This ensures users cannot exceed their limits
   - Passes the estimated_tokens to `_charge_tokens()` after the call to adjust for actual usage

3. **Endpoints Updated**:
   - `/api/chat/send` - Chat messages (2000 tokens estimated)
   - `/api/chat/stream-reply` - Streaming chat (2000 tokens estimated)
   - `/api/worksheets/generate` - Worksheet generation (3500 tokens estimated)
   - `/api/worksheets/{worksheet_id}/mark` - Worksheet marking (2500 tokens estimated)
   - `/api/personas/custom` - Custom persona creation (1500 tokens estimated)
   - `/api/chat/sessions/{session_id}/morning-quiz` - Morning quiz generation (2500 tokens estimated)
   - `/api/chat/sessions/{session_id}/summary` - Chat summary (2500 tokens estimated)
   - `/api/notes/{note_id}/worksheet` - Worksheet from notes (3500 tokens estimated)
   - `/api/worksheets/{worksheet_id}/cheat-sheet` - Cheat sheet generation (2500 tokens estimated)
   - `/api/exams/{exam_id}/morning-brief` - Morning brief (1000 tokens estimated)
   - `/api/exams/{exam_id}/plan` - Revision plan (5000 tokens estimated)

#### Full Backend (`full/backend/server.py`)
Added authentication support to this version:

1. **Imported auth module** and initialized it with `auth.set_db(db)`
2. **Added auth endpoints**:
   - `POST /api/auth/register` - User registration
   - `POST /api/auth/login` - User login
   - `GET /api/auth/me` - Get current user info
3. **Added authentication and token checks** to AI generation endpoints:
   - `/api/chat/send`
   - `/api/worksheets/generate`
   - `/api/worksheets/{worksheet_id}/mark`

### 2. How It Works

#### Token Tracking
Each user has the following fields in the database:
```python
{
    "token_limit_daily": 50000,      # Daily token limit (0 = unlimited)
    "token_limit_weekly": 200000,    # Weekly token limit
    "tokens_used_today": 0,          # Tokens used today
    "tokens_used_week": 0,           # Tokens used this week
    "last_reset_daily": "ISO date",  # Last daily reset timestamp
    "last_reset_weekly": "ISO date"  # Last weekly reset timestamp
}
```

#### Request Flow
1. User makes AI generation request with Bearer token in Authorization header
2. Backend validates user authentication
3. **Pre-check**: `auth.check_and_charge_tokens()` is called with estimated token count
   - Checks if user would exceed daily or weekly limit
   - If limit would be exceeded, raises HTTP 429 error with descriptive message
   - If OK, increments the estimated tokens immediately
4. AI API call is made
5. **Post-adjustment**: `_charge_tokens()` adjusts the token count based on actual usage
   - Calculates difference between actual and estimated
   - Updates user's token counters with the difference

#### Error Responses
When a user exceeds their limit, they receive:
```json
{
  "status_code": 429,
  "detail": "Daily token limit reached (50,000 tokens). Resets tomorrow."
}
```
or
```json
{
  "status_code": 429,
  "detail": "Weekly token limit reached (200,000 tokens). Resets next week."
}
```

### 3. Frontend Integration

To make authenticated requests, the frontend must include the JWT token:

```javascript
const response = await fetch('http://localhost:8000/api/chat/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    session_id: sessionId,
    message: userMessage
  })
});

if (response.status === 429) {
  const error = await response.json();
  alert(error.detail); // Show "Daily/Weekly token limit reached" message
}
```

### 4. Admin Controls

Admins can manage user token limits by updating user documents directly in MongoDB:

```javascript
// Set custom limits for a user
db.users.updateOne(
  { username: "john@example.com" },
  {
    $set: {
      token_limit_daily: 100000,    // 100k daily
      token_limit_weekly: 500000,   // 500k weekly
    }
  }
);

// Give unlimited access (set to 0)
db.users.updateOne(
  { username: "premium_user@example.com" },
  {
    $set: {
      token_limit_daily: 0,
      token_limit_weekly: 0
    }
  }
);

// Reset a user's token usage
db.users.updateOne(
  { username: "user@example.com" },
  {
    $set: {
      tokens_used_today: 0,
      tokens_used_week: 0
    }
  }
);
```

### 5. Testing

To test the implementation:

1. **Create a test user with low limits**:
```python
await auth.create_user("testuser", "password", is_admin=False)
await db.users.update_one(
    {"username": "testuser"},
    {"$set": {"token_limit_daily": 1000, "token_limit_weekly": 5000}}
)
```

2. **Make AI requests** until you hit the limit
3. **Verify** you receive 429 error with appropriate message
4. **Check database** to see token counts updated

### 6. Estimated Token Counts

The estimated token counts were chosen based on typical usage:
- Chat messages: 2000 tokens (allows for conversation history + response)
- Worksheet generation: 3500 tokens (larger output with multiple questions)
- Marking: 2500 tokens (analyzing student answers)
- Morning quiz: 2500 tokens
- Study notes: 2500 tokens
- Revision plan: 5000 tokens (longest output, multi-day plans)

These estimates prevent users from making expensive calls when near their limit, while the post-adjustment ensures accurate tracking.

## Files Modified

1. `C:\Users\oscar\Downloads\Revisiapp\backend\server.py` - Main backend (primary)
2. `C:\Users\oscar\Downloads\Revisiapp\full\backend\server.py` - Full backend
3. `C:\Users\oscar\Downloads\Revisiapp\backend\auth.py` - Already had the functionality (no changes needed)

## Notes

- The auth system was already implemented with token tracking infrastructure
- The main change was adding pre-checks BEFORE AI calls instead of only tracking after
- Token limits reset automatically after 24 hours (daily) and 7 days (weekly)
- Admins (username "oscar") are not subject to limits unless explicitly set
