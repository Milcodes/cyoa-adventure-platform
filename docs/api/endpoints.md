# API Endpoints Reference

Quick reference guide for all API endpoints in the CYOA platform.

**Base URL (Production):** `https://api.cyoa-platform.dev/v1`
**Base URL (Local):** `http://localhost:4000/v1`

**Full OpenAPI Specification:** [`openapi.yaml`](./openapi.yaml)

---

## 🔐 Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | No |
| GET | `/auth/me` | Get current user profile | Yes |
| POST | `/users/me/language` | Update preferred language | Yes |

**Example:**
```bash
# Register
curl -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "securePassword123",
    "display_name": "John Doe",
    "preferred_language": "en",
    "role": "player"
  }'

# Login
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "securePassword123"
  }'
```

---

## 📚 Stories (Public)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/stories` | List published stories | No |
| GET | `/stories/{id}` | Get story details | No |

**Query Parameters:**
- `genre`: Filter by genre (fantasy, sci-fi, horror, etc.)
- `language`: Filter by available language (hu, de, en, etc.)
- `q`: Search query (title, synopsis)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Example:**
```bash
# List all fantasy stories available in German
curl "http://localhost:4000/v1/stories?genre=fantasy&language=de"

# Search for "dragon" stories
curl "http://localhost:4000/v1/stories?q=dragon"

# Get story details in Hungarian
curl "http://localhost:4000/v1/stories/uuid-here?language=hu"
```

---

## 🎮 Gameplay

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/play/{storyId}/state` | Get current play state | Yes |
| POST | `/play/{storyId}/choice` | Make a choice | Yes |
| POST | `/play/{storyId}/roll` | Roll dice | Yes |
| POST | `/play/{storyId}/save` | Create manual save | Yes |
| GET | `/play/{storyId}/saves` | List saves | Yes |
| POST | `/play/{storyId}/saves/{slot}` | Load save | Yes |
| POST | `/play/{storyId}/minigame/score` | Submit minigame score | Yes |

**Example:**
```bash
# Get current state (in German)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/play/story-uuid/state?language=de"

# Make a choice
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"choiceId": "to_house", "language": "de"}' \
  "http://localhost:4000/v1/play/story-uuid/choice"

# Roll dice
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"formula": "1d20+dexterity", "reason": "Trap check"}' \
  "http://localhost:4000/v1/play/story-uuid/roll"

# Create manual save (slot 1)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slot": 1}' \
  "http://localhost:4000/v1/play/story-uuid/save"
```

---

## ✍️ Author (Requires Author Role)

### Stories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/author/stories` | List my stories |
| POST | `/author/stories` | Create new story |
| GET | `/author/stories/{id}` | Get my story details |
| PUT | `/author/stories/{id}` | Update my story |
| DELETE | `/author/stories/{id}` | Delete my story |
| POST | `/author/stories/{id}/publish` | Submit for review |

**Example:**
```bash
# Create new story
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Lost Sword",
    "slug": "the-lost-sword",
    "synopsis": "An epic adventure...",
    "genre": "fantasy",
    "primary_language": "en"
  }' \
  "http://localhost:4000/v1/author/stories"

# Submit for moderation
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/author/stories/uuid-here/publish"
```

### Translations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/author/stories/{id}/translations` | Add story translation |
| PUT | `/author/stories/{id}/translations/{locale}` | Update story translation |
| DELETE | `/author/stories/{id}/translations/{locale}` | Delete story translation |
| GET | `/author/stories/{id}/translation-status` | Get translation progress |

**Example:**
```bash
# Add German translation
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "de",
    "title": "Das verlorene Schwert",
    "synopsis": "Ein episches Abenteuer..."
  }' \
  "http://localhost:4000/v1/author/stories/uuid-here/translations"

# Get translation status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/author/stories/uuid-here/translation-status"
```

### Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/author/nodes` | Create node |
| PUT | `/author/nodes/{nodeId}` | Update node |
| DELETE | `/author/nodes/{nodeId}` | Delete node |
| POST | `/author/nodes/{nodeId}/translations` | Add node translation |
| PUT | `/author/nodes/{nodeId}/translations/{locale}` | Update node translation |
| DELETE | `/author/nodes/{nodeId}/translations/{locale}` | Delete node translation |

**Example:**
```bash
# Create node
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "story_id": "story-uuid",
    "key": "forest_gate",
    "text_md": "You enter the forest...",
    "choices": [
      {
        "id": "to_house",
        "label": "Go to the house",
        "target": "house_front"
      }
    ]
  }' \
  "http://localhost:4000/v1/author/nodes"

# Add node translation (German)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "de",
    "text_md": "Du betrittst den Wald...",
    "choices_labels": {
      "to_house": "Zum Haus gehen"
    }
  }' \
  "http://localhost:4000/v1/author/nodes/node-uuid/translations"
```

---

## 🛡️ Moderator (Requires Moderator Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/moderator/pending` | List pending stories |
| POST | `/moderator/stories/{id}/approve` | Approve story (publish) |
| POST | `/moderator/stories/{id}/reject` | Reject story (back to draft) |

**Example:**
```bash
# Get pending stories
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/moderator/pending"

# Approve story
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/moderator/stories/uuid-here/approve"

# Reject story with notes
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Inappropriate content in node forest_gate. Please revise."
  }' \
  "http://localhost:4000/v1/moderator/stories/uuid-here/reject"
```

---

## 🔧 Admin (Requires Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stories` | List all stories (any status) |
| PUT | `/admin/users/{userId}/role` | Update user role |

**Example:**
```bash
# List all draft stories
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/admin/stories?status=draft"

# Promote user to author
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "author"}' \
  "http://localhost:4000/v1/admin/users/user-uuid/role"
```

---

## 🌍 Localization

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/i18n/locales` | List supported locales | No |

**Example:**
```bash
curl "http://localhost:4000/v1/i18n/locales"
```

**Response:**
```json
[
  {
    "code": "hu",
    "name": "Hungarian",
    "native_name": "Magyar"
  },
  {
    "code": "de",
    "name": "German",
    "native_name": "Deutsch"
  },
  {
    "code": "en",
    "name": "English",
    "native_name": "English"
  }
]
```

---

## 🔑 Authentication Headers

All authenticated endpoints require a JWT token in the `Authorization` header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Refresh:**
- Access tokens expire in 15 minutes
- Use `/auth/refresh` with the refresh token to get a new access token
- Refresh tokens expire in 7 days

---

## 📊 Common Response Formats

### Success Response (200 OK)
```json
{
  "data": { ... }
}
```

### Created Response (201 Created)
```json
{
  "id": "uuid-here",
  "created_at": "2025-01-10T10:00:00Z"
}
```

### Error Response (4xx/5xx)
```json
{
  "error": "Resource not found",
  "details": [
    {
      "field": "storyId",
      "message": "Story with this ID does not exist"
    }
  ]
}
```

### Validation Error (400 Bad Request)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

---

## 🎲 Dice Formula Format

**Supported formats:**
- `XdY` - Roll X dice with Y sides (e.g., `2d6`)
- `XdY+Z` - Roll X dice with Y sides and add modifier Z (e.g., `2d6+3`)
- `XdY+STAT` - Roll X dice with Y sides and add stat modifier (e.g., `1d20+dexterity`)

**Stat keys:**
- `knowledge` (INT)
- `dexterity` (DEX)
- `strength` (STR)
- `luck` (LCK)

**Stat modifier calculation:**
```
modifier = floor((STAT - 10) / 2)
```

**Examples:**
```json
// Simple roll
{"formula": "2d6"}          → 2 six-sided dice

// With numeric modifier
{"formula": "2d6+3"}         → 2d6 + 3

// With stat modifier
{"formula": "1d20+dexterity"} → 1d20 + dex_modifier

// If dexterity = 16 → modifier = +3
// Result: 1d20+3
```

---

## 🚀 Quick Start

### 1. Register & Login
```bash
# Register
TOKEN=$(curl -s -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "password123",
    "display_name": "Player 1"
  }' | jq -r '.access_token')
```

### 2. Browse Stories
```bash
# List stories
curl -s "http://localhost:4000/v1/stories" | jq
```

### 3. Play Story
```bash
# Get initial state
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/v1/play/story-uuid/state?language=en" | jq

# Make choice
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"choiceId": "to_forest"}' \
  "http://localhost:4000/v1/play/story-uuid/choice" | jq
```

---

## 📝 Notes

- All dates are in ISO 8601 format (`2025-01-10T10:00:00Z`)
- All IDs are UUIDs (v4)
- Default pagination: 20 items per page
- Maximum pagination: 100 items per page
- Rate limit: 100 requests per minute per IP (production)

---

**For detailed schema definitions, see:** [`openapi.yaml`](./openapi.yaml)

**Last updated:** 2025-01-10
