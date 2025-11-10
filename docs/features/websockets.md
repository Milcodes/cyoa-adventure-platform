# WebSockets Implementation Guide

Real-time features using WebSockets with NestJS and Next.js.

## Features Overview

1. **Real-time Notifications** - Instant notification delivery
2. **Multiplayer Stories** - Collaborative story playing
3. **Live Comments** - Real-time comment updates
4. **Presence System** - Show who's online
5. **Story Updates** - Live story editing for co-authors

---

## Backend Setup (NestJS)

### 1. Install Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### 2. Create WebSocket Gateway

```typescript
// websockets/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Extract user from JWT token
    const token = client.handshake.auth.token;
    if (token) {
      try {
        const user = await this.validateToken(token);
        this.connectedUsers.set(user.id, client.id);

        // Join user's personal room
        client.join(`user:${user.id}`);

        // Broadcast online status
        this.server.emit('user:online', { userId: user.id });
      } catch (error) {
        client.disconnect();
      }
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Find and remove user
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        this.server.emit('user:offline', { userId });
        break;
      }
    }
  }

  // Subscribe to story room
  @SubscribeMessage('story:join')
  @UseGuards(WsJwtGuard)
  handleJoinStory(
    @MessageBody() data: { storyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`story:${data.storyId}`);
    return { event: 'story:joined', data: { storyId: data.storyId } };
  }

  @SubscribeMessage('story:leave')
  handleLeaveStory(
    @MessageBody() data: { storyId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`story:${data.storyId}`);
  }

  // Real-time comment
  @SubscribeMessage('comment:new')
  @UseGuards(WsJwtGuard)
  async handleNewComment(
    @MessageBody() data: { storyId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Save comment to database
    const comment = await this.commentsService.create(data);

    // Broadcast to all clients in the story room
    this.server.to(`story:${data.storyId}`).emit('comment:created', comment);

    return { event: 'comment:created', data: comment };
  }

  // Typing indicator
  @SubscribeMessage('comment:typing')
  handleTyping(
    @MessageBody() data: { storyId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`story:${data.storyId}`).emit('comment:typing', data);
  }

  // Utility: Send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Utility: Send to all users in a story
  sendToStory(storyId: string, event: string, data: any) {
    this.server.to(`story:${storyId}`).emit(event, data);
  }
}
```

### 3. Create WS JWT Guard

```typescript
// guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth.token;

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = this.jwtService.verify(token);
      client.user = payload;
      return true;
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }
}
```

### 4. Register Gateway in Module

```typescript
// app.module.ts
import { EventsGateway } from './websockets/events.gateway';

@Module({
  // ... other imports
  providers: [
    // ... other providers
    EventsGateway,
  ],
})
export class AppModule {}
```

---

## Frontend Setup (Next.js)

### 1. Install Socket.io Client

```bash
npm install socket.io-client
```

### 2. Create WebSocket Context

```typescript
// lib/contexts/SocketContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/authStore';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const socketInstance = io(`${process.env.NEXT_PUBLIC_API_URL}/ws`, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
```

### 3. Use WebSockets in Components

```tsx
// components/LiveComments.tsx
import { useSocket } from '@/lib/contexts/SocketContext';
import { useEffect, useState } from 'react';

export function LiveComments({ storyId }: { storyId: string }) {
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [typing, setTyping] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Join story room
    socket.emit('story:join', { storyId });

    // Listen for new comments
    socket.on('comment:created', (comment) => {
      setComments((prev) => [...prev, comment]);
    });

    // Listen for typing indicators
    socket.on('comment:typing', (data) => {
      if (data.isTyping) {
        setTyping((prev) => [...prev, data.userId]);
      } else {
        setTyping((prev) => prev.filter((id) => id !== data.userId));
      }
    });

    return () => {
      socket.emit('story:leave', { storyId });
      socket.off('comment:created');
      socket.off('comment:typing');
    };
  }, [socket, storyId]);

  const handleSendComment = (content: string) => {
    if (!socket) return;
    socket.emit('comment:new', { storyId, content });
  };

  return (
    <div>
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="game-panel p-3">
            <p className="font-semibold">{comment.user.display_name}</p>
            <p className="text-sm">{comment.content}</p>
          </div>
        ))}
      </div>

      {typing.length > 0 && (
        <p className="text-sm text-gray-400 mt-2">
          {typing.length} {typing.length === 1 ? 'person is' : 'people are'} typing...
        </p>
      )}

      <CommentInput onSend={handleSendComment} storyId={storyId} />
    </div>
  );
}
```

### 4. Typing Indicator

```tsx
// components/CommentInput.tsx
import { useSocket } from '@/lib/contexts/SocketContext';
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';

export function CommentInput({ storyId, onSend }: Props) {
  const { socket } = useSocket();
  const [content, setContent] = useState('');

  // Debounced typing indicator
  const emitTyping = useCallback(
    debounce((isTyping: boolean) => {
      if (socket) {
        socket.emit('comment:typing', { storyId, isTyping });
      }
    }, 500),
    [socket, storyId],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    emitTyping(e.target.value.length > 0);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSend(content);
    setContent('');
    emitTyping(false);
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Write a comment..."
        className="w-full p-3 bg-game-panel rounded-lg"
      />
      <button onClick={handleSubmit} className="game-button mt-2">
        Send
      </button>
    </div>
  );
}
```

---

## Real-time Notifications

```typescript
// Integration with notification system
@Injectable()
export class NotificationsService {
  constructor(private eventsGateway: EventsGateway) {}

  async create(notification: CreateNotificationDto) {
    const saved = await this.prisma.notification.create({
      data: notification,
    });

    // Send via WebSocket immediately
    this.eventsGateway.sendToUser(notification.user_id, 'notification:new', saved);

    return saved;
  }
}
```

Frontend:

```tsx
// Listen for notifications
useEffect(() => {
  if (!socket) return;

  socket.on('notification:new', (notification) => {
    // Show toast notification
    toast.success(notification.title);

    // Update notification count
    setUnreadCount((prev) => prev + 1);
  });

  return () => {
    socket.off('notification:new');
  };
}, [socket]);
```

---

## Presence System

```typescript
// Track online users
@SubscribeMessage('presence:subscribe')
handlePresenceSubscribe(@ConnectedSocket() client: Socket) {
  const onlineUsers = Array.from(this.connectedUsers.keys());
  client.emit('presence:users', { users: onlineUsers });
}
```

Frontend:

```tsx
export function OnlineIndicator({ userId }: { userId: string }) {
  const { socket } = useSocket();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('user:online', (data) => {
      if (data.userId === userId) {
        setIsOnline(true);
      }
    });

    socket.on('user:offline', (data) => {
      if (data.userId === userId) {
        setIsOnline(false);
      }
    });

    return () => {
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [socket, userId]);

  return (
    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
  );
}
```

---

## Scaling WebSockets

### Redis Adapter (for multiple server instances)

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
// main.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

// In bootstrap()
const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

---

## Best Practices

1. **Authentication** - Always verify JWT tokens
2. **Rate Limiting** - Prevent spam
3. **Error Handling** - Handle disconnections gracefully
4. **Rooms** - Use rooms for targeted broadcasting
5. **Heartbeat** - Ping/pong to detect dead connections
6. **Fallback** - Have REST API fallback if WS fails

---

## Summary

WebSockets enable real-time features:
- 💬 **Live Comments** for community engagement
- 🔔 **Instant Notifications** for better UX
- 👥 **Presence** to show who's online
- 🎮 **Multiplayer** for collaborative stories

Perfect for interactive experiences!
