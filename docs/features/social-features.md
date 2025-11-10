# Social Features Implementation Guide

This document outlines how to implement social features for the CYOA Platform.

## Features Overview

1. **Story Ratings** - Users can rate stories (1-5 stars)
2. **Story Favorites** - Users can bookmark their favorite stories
3. **Comments** - Users can comment on stories
4. **User Profiles** - Public profiles showing played stories

---

## Database Schema Additions

### Story Ratings Table

```prisma
model StoryRating {
  id         String   @id @default(cuid())
  story_id   String
  user_id    String
  rating     Int      // 1-5 stars
  created_at DateTime @default(now())

  story Story @relation(fields: [story_id], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([story_id, user_id])
  @@index([story_id])
}
```

### Favorites Table

```prisma
model StoryFavorite {
  id         String   @id @default(cuid())
  story_id   String
  user_id    String
  created_at DateTime @default(now())

  story Story @relation(fields: [story_id], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([story_id, user_id])
  @@index([user_id])
}
```

### Comments Table

```prisma
model StoryComment {
  id         String   @id @default(cuid())
  story_id   String
  user_id    String
  content    String   @db.Text
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  story Story @relation(fields: [story_id], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([story_id])
  @@index([user_id])
}
```

---

## API Endpoints

### Ratings

```typescript
// POST /stories/:storyId/ratings
{
  "rating": 5
}

// GET /stories/:storyId/ratings
{
  "avg_rating": 4.5,
  "total_ratings": 42,
  "user_rating": 5
}

// DELETE /stories/:storyId/ratings (remove own rating)
```

### Favorites

```typescript
// POST /stories/:storyId/favorite
// DELETE /stories/:storyId/favorite

// GET /users/me/favorites
{
  "favorites": [
    {
      "id": "...",
      "story": {
        "id": "...",
        "title": "...",
        "genre": "adventure"
      },
      "created_at": "2025-01-10T..."
    }
  ]
}
```

### Comments

```typescript
// POST /stories/:storyId/comments
{
  "content": "Great story!"
}

// GET /stories/:storyId/comments?limit=20&offset=0
{
  "comments": [
    {
      "id": "...",
      "content": "Great story!",
      "user": {
        "display_name": "John Doe"
      },
      "created_at": "2025-01-10T..."
    }
  ],
  "total": 5
}

// DELETE /stories/:storyId/comments/:commentId (own comments only)
```

---

## Implementation Steps

### 1. Update Prisma Schema

Add the tables above to `prisma/schema.prisma`

```bash
npx prisma migrate dev --name add_social_features
```

### 2. Create Social Module

```bash
cd apps/backend/src/api
mkdir social
```

Create:
- `social.controller.ts`
- `social.service.ts`
- `social.module.ts`
- `dto/rate-story.dto.ts`
- `dto/create-comment.dto.ts`

### 3. Implement Service Methods

```typescript
// social.service.ts
async rateStory(userId: string, storyId: string, rating: number) {
  return this.prisma.storyRating.upsert({
    where: {
      story_id_user_id: { story_id: storyId, user_id: userId }
    },
    create: {
      story_id: storyId,
      user_id: userId,
      rating
    },
    update: {
      rating
    }
  });
}

async getStoryRatings(storyId: string, userId?: string) {
  const [avgRating, userRating] = await Promise.all([
    this.prisma.storyRating.aggregate({
      where: { story_id: storyId },
      _avg: { rating: true },
      _count: true
    }),
    userId ? this.prisma.storyRating.findUnique({
      where: {
        story_id_user_id: { story_id: storyId, user_id: userId }
      }
    }) : null
  ]);

  return {
    avg_rating: avgRating._avg.rating,
    total_ratings: avgRating._count,
    user_rating: userRating?.rating
  };
}
```

### 4. Add to AppModule

```typescript
imports: [
  // ... other modules
  SocialModule,
]
```

### 5. Frontend Integration

```typescript
// lib/api/social.ts
export async function rateStory(storyId: string, rating: number) {
  return apiClient.post(`/stories/${storyId}/ratings`, { rating });
}

export async function toggleFavorite(storyId: string, isFavorite: boolean) {
  if (isFavorite) {
    return apiClient.delete(`/stories/${storyId}/favorite`);
  } else {
    return apiClient.post(`/stories/${storyId}/favorite`);
  }
}

export async function addComment(storyId: string, content: string) {
  return apiClient.post(`/stories/${storyId}/comments`, { content });
}
```

---

## UI Components

### Rating Stars

```tsx
// components/StoryRating.tsx
export function StoryRating({ storyId, initialRating }: Props) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleRate = async (value: number) => {
    await rateStory(storyId, value);
    setRating(value);
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            className={
              star <= (hover || rating)
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-gray-400'
            }
          />
        </button>
      ))}
    </div>
  );
}
```

### Favorite Button

```tsx
// components/FavoriteButton.tsx
export function FavoriteButton({ storyId, initialFavorite }: Props) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  const handleToggle = async () => {
    await toggleFavorite(storyId, isFavorite);
    setIsFavorite(!isFavorite);
  };

  return (
    <button onClick={handleToggle}>
      <Heart
        className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
      />
    </button>
  );
}
```

---

## Moderation

### Content Moderation for Comments

```typescript
// Add flagging system
model CommentFlag {
  id         String   @id @default(cuid())
  comment_id String
  user_id    String
  reason     String
  created_at DateTime @default(now())

  comment StoryComment @relation(fields: [comment_id], references: [id], onDelete: Cascade)
  user    User         @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([comment_id, user_id])
}
```

### API Endpoint

```typescript
// POST /comments/:commentId/flag
{
  "reason": "spam" | "offensive" | "inappropriate"
}
```

---

## Analytics Integration

Update analytics to include social metrics:

```typescript
async getStoryStats(storyId: string) {
  const [ratings, favorites, comments] = await Promise.all([
    this.prisma.storyRating.count({ where: { story_id: storyId } }),
    this.prisma.storyFavorite.count({ where: { story_id: storyId } }),
    this.prisma.storyComment.count({ where: { story_id: storyId } })
  ]);

  return {
    total_ratings: ratings,
    total_favorites: favorites,
    total_comments: comments
  };
}
```

---

## Best Practices

1. **Rate Limiting** - Limit rating changes (e.g., once per day)
2. **Validation** - Validate rating values (1-5 only)
3. **Spam Prevention** - Implement comment throttling
4. **Notifications** - Notify authors of new comments/ratings
5. **Privacy** - Allow users to hide their profiles/activity

---

## Summary

Social features enhance user engagement:
- ⭐ **Ratings** help discover quality stories
- ❤️ **Favorites** let users bookmark stories
- 💬 **Comments** enable community discussion
- 👤 **Profiles** showcase user activity

Implement in phases for best results!
