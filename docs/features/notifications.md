# Notification System Implementation Guide

Complete guide for implementing email and push notifications.

## Features Overview

1. **Email Notifications** - Story updates, moderation status, etc.
2. **Push Notifications** - Real-time browser notifications
3. **In-App Notifications** - Notification center in the app
4. **Notification Preferences** - User controls what they receive

---

## Database Schema

```prisma
model Notification {
  id         String   @id @default(cuid())
  user_id    String
  type       String   // "story_approved", "comment_reply", "new_follower"
  title      String
  message    String   @db.Text
  data       Json?    // Additional data (story_id, comment_id, etc.)
  read       Boolean  @default(false)
  created_at DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, read])
  @@index([created_at])
}

model NotificationPreference {
  id         String   @id @default(cuid())
  user_id    String   @unique
  email      Boolean  @default(true)
  push       Boolean  @default(true)
  in_app     Boolean  @default(true)

  // Granular preferences
  story_approved       Boolean @default(true)
  story_rejected       Boolean @default(true)
  comment_reply        Boolean @default(true)
  new_follower         Boolean @default(true)
  story_update         Boolean @default(true)

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

---

## Email Notifications

### 1. Setup Email Service (SendGrid)

```bash
npm install @sendgrid/mail
```

```typescript
// email.service.ts
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {
    sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
  }

  async sendEmail(to: string, subject: string, html: string) {
    const msg = {
      to,
      from: this.configService.get('EMAIL_FROM'),
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  }

  async sendStoryApprovedEmail(user: User, story: Story) {
    const subject = '✅ Your story has been approved!';
    const html = `
      <h1>Congratulations!</h1>
      <p>Your story "${story.title}" has been approved and is now published.</p>
      <a href="${process.env.APP_URL}/play/${story.id}">View Story</a>
    `;

    await this.sendEmail(user.email, subject, html);
  }

  async sendStoryRejectedEmail(user: User, story: Story, reason: string) {
    const subject = '❌ Your story needs revision';
    const html = `
      <h1>Story Review Result</h1>
      <p>Your story "${story.title}" requires some changes before publication.</p>
      <p><strong>Moderator Notes:</strong> ${reason}</p>
      <a href="${process.env.APP_URL}/creator/${story.id}">Edit Story</a>
    `;

    await this.sendEmail(user.email, subject, html);
  }
}
```

### 2. Email Templates

```typescript
// email-templates/
├── story-approved.hbs
├── story-rejected.hbs
├── new-comment.hbs
└── weekly-digest.hbs
```

Example template (Handlebars):

```html
<!-- story-approved.hbs -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .button { background: #0ea5e9; color: white; padding: 10px 20px; }
  </style>
</head>
<body>
  <h1>Great News!</h1>
  <p>Your story <strong>{{storyTitle}}</strong> has been approved!</p>
  <a href="{{storyUrl}}" class="button">View Story</a>
</body>
</html>
```

---

## Push Notifications

### 1. Setup Web Push

```bash
npm install web-push
```

### 2. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### 3. Backend Service

```typescript
// push.service.ts
import webpush from 'web-push';

@Injectable()
export class PushService {
  constructor(private configService: ConfigService) {
    webpush.setVapidDetails(
      'mailto:admin@cyoa-platform.dev',
      this.configService.get('VAPID_PUBLIC_KEY'),
      this.configService.get('VAPID_PRIVATE_KEY'),
    );
  }

  async sendPushNotification(subscription: any, payload: any) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Push notification failed:', error);
    }
  }

  async notifyUser(userId: string, notification: any) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { user_id: userId },
    });

    await Promise.all(
      subscriptions.map((sub) =>
        this.sendPushNotification(sub.subscription, notification),
      ),
    );
  }
}
```

### 4. Frontend Integration

```typescript
// lib/push-notifications.ts
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push not supported');
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Send subscription to backend
  await apiClient.post('/push/subscribe', {
    subscription: subscription.toJSON(),
  });
}

// Service Worker (public/sw.js)
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.message,
    icon: '/icon.png',
    badge: '/badge.png',
    data: {
      url: data.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

---

## In-App Notifications

### 1. Backend API

```typescript
// notifications.controller.ts
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  @Get()
  async getNotifications(
    @GetUser('id') userId: string,
    @Query('unread') unread?: boolean,
  ) {
    return this.notificationsService.getUserNotifications(userId, unread);
  }

  @Patch(':id/read')
  async markAsRead(
    @GetUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Post('mark-all-read')
  async markAllAsRead(@GetUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get('unread-count')
  async getUnreadCount(@GetUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }
}
```

### 2. Frontend Component

```tsx
// components/NotificationCenter.tsx
export function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await apiClient.get('/notifications');
    setNotifications(data);
  };

  const fetchUnreadCount = async () => {
    const { data } = await apiClient.get('/notifications/unread-count');
    setUnreadCount(data.count);
  };

  const markAsRead = async (id: string) => {
    await apiClient.patch(`/notifications/${id}/read`);
    fetchNotifications();
    fetchUnreadCount();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-game-panel rounded-lg shadow-xl max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-game-border flex justify-between">
            <h3 className="font-bold">Notifications</h3>
            <button onClick={() => markAllAsRead()}>Mark all as read</button>
          </div>

          {notifications.length === 0 ? (
            <p className="p-4 text-gray-400 text-center">No notifications</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 border-b border-game-border cursor-pointer hover:bg-game-hover ${
                  !notif.read ? 'bg-primary-500/5' : ''
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <h4 className="font-semibold">{notif.title}</h4>
                <p className="text-sm text-gray-400">{notif.message}</p>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notif.created_at))} ago
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Notification Types

```typescript
enum NotificationType {
  STORY_APPROVED = 'story_approved',
  STORY_REJECTED = 'story_rejected',
  COMMENT_REPLY = 'comment_reply',
  NEW_FOLLOWER = 'new_follower',
  STORY_UPDATE = 'story_update',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
}

// Usage
await this.notificationsService.create({
  user_id: author.id,
  type: NotificationType.STORY_APPROVED,
  title: 'Story Approved!',
  message: `Your story "${story.title}" is now published`,
  data: {
    story_id: story.id,
    story_url: `/play/${story.id}`,
  },
});
```

---

## User Preferences

```tsx
// components/NotificationSettings.tsx
export function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    email: true,
    push: true,
    in_app: true,
    story_approved: true,
    story_rejected: true,
    comment_reply: true,
  });

  const handleSave = async () => {
    await apiClient.put('/notifications/preferences', prefs);
  };

  return (
    <div className="game-panel p-6">
      <h2 className="text-xl font-bold mb-4">Notification Preferences</h2>

      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={prefs.email}
            onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })}
          />
          <span>Email Notifications</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={prefs.push}
            onChange={(e) => setPrefs({ ...prefs, push: e.target.checked })}
          />
          <span>Push Notifications</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={prefs.story_approved}
            onChange={(e) => setPrefs({ ...prefs, story_approved: e.target.checked })}
          />
          <span>Story approval notifications</span>
        </label>

        {/* More preferences */}

        <button onClick={handleSave} className="game-button">
          Save Preferences
        </button>
      </div>
    </div>
  );
}
```

---

## Best Practices

1. **Rate Limiting** - Don't spam users
2. **Batching** - Group similar notifications
3. **Timing** - Respect user timezones
4. **Opt-out** - Always allow users to disable
5. **Testing** - Test all notification flows

---

## Summary

Notification system keeps users engaged:
- 📧 **Email** for important updates
- 🔔 **Push** for real-time alerts
- 📱 **In-app** for browsing updates
- ⚙️ **Preferences** for user control

Implement gradually based on priority!
