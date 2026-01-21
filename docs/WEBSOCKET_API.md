# WebSocket API Documentation

## Overview

The chat system uses **Socket.IO** for real-time communication. This document describes all WebSocket events, authentication, and message formats.

---

## Connection

### URL

```
ws://your-server.com
wss://your-server.com  (production)
```

### Authentication

Include the JWT token in the connection handshake:

```javascript
const socket = io('wss://your-server.com', {
  auth: {
    token: 'your-jwt-token',
  },
});
```

If the token is invalid or expired, the connection will be rejected.

---

## Events

### Client → Server Events

#### `room:join`

Join a team chat room to receive messages.

**Payload:**

```typescript
{
  teamId: string; // UUID of the team
}
```

**Response:** Server emits `user:online` to all room members.

---

#### `room:leave`

Leave a team chat room.

**Payload:**

```typescript
{
  teamId: string; // UUID of the team
}
```

**Response:** Server emits `user:offline` to remaining room members.

---

#### `message:send`

Send a message to a team chat.

**Payload:**

```typescript
{
  teamId: string;        // Required: UUID of the team
  content?: string;      // Optional: Message text (max 5000 chars)
  replyToId?: string;    // Optional: UUID of message being replied to
  attachmentUrl?: string;      // Optional: URL of uploaded attachment
  attachmentType?: 'image' | 'video';  // Required if attachmentUrl provided
  attachmentFileName?: string;  // Optional: Original filename
  attachmentFileSize?: number;  // Optional: File size in bytes
  attachmentMimeType?: string;  // Optional: MIME type (e.g., 'image/jpeg')
}
```

**Validation Rules:**

- Either `content` or `attachmentUrl` must be provided
- If `attachmentUrl` is provided, `attachmentType` is required
- Maximum content length: 5000 characters

**Response:** Server emits `message:new` to all room members (including sender).

**Error:** Server emits `error` event with error details.

---

#### `typing:start`

Notify that user started typing.

**Payload:**

```typescript
{
  teamId: string; // UUID of the team
}
```

**Response:** Server emits `user:typing` to other room members. Typing status auto-expires after 5 seconds.

---

#### `typing:stop`

Notify that user stopped typing.

**Payload:**

```typescript
{
  teamId: string; // UUID of the team
}
```

**Response:** Server emits `user:stopTyping` to other room members.

---

### Server → Client Events

#### `message:new`

New message received in a room.

**Payload:**

```typescript
{
  id: string;
  teamId: string;
  messageType: 'user' | 'system';
  systemMessageType: string | null;  // Only for system messages
  content: string | null;
  metadata: Record<string, unknown> | null;  // Extra data for system messages
  replyToId: string | null;
  sender: {
    id: string;
    username: string;
    nickName: string;
    avatar: string | null;
  } | null;  // null for system messages
  attachment: {
    id: string;
    url: string;
    type: 'image' | 'video';
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    createdAt: string;  // ISO 8601 date
  } | null;
  createdAt: string;  // ISO 8601 date
}
```

---

#### `user:online`

User came online in a room.

**Payload:**

```typescript
{
  userId: string;
  username: string;
  nickName: string;
  avatar: string | null;
}
```

---

#### `user:offline`

User went offline in a room.

**Payload:**

```typescript
{
  userId: string;
}
```

---

#### `user:typing`

User started typing.

**Payload:**

```typescript
{
  userId: string;
  username: string;
  nickName: string;
}
```

---

#### `user:stopTyping`

User stopped typing.

**Payload:**

```typescript
{
  userId: string;
}
```

---

#### `error`

Error occurred.

**Payload:**

```typescript
{
  message: string;
  errors?: Array<{
    path: string[];
    message: string;
  }>;
}
```

---

## Message Types

### User Messages (`messageType: 'user'`)

Regular messages sent by users. Always have a `sender` object.

### System Messages (`messageType: 'system'`)

Automated notifications. `sender` may be null or contain the user the notification is about.

**System Message Types:**
| Type | Description |
|------|-------------|
| `streak_completed` | User completed their daily streak |
| `streak_failed` | User's streak was broken |
| `streak_milestone` | User reached a streak milestone (7 days, 30 days, etc.) |
| `user_joined` | User joined the team |
| `user_left` | User left the team |
| `team_goal_reached` | Team achieved a collective goal |

---

## REST Endpoints

### GET `/chat/:teamId/history`

Get paginated chat history.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Messages per page (1-100) |
| `cursor` | string | - | Message ID for cursor-based pagination |

**Response:**

```typescript
{
  messages: MessageResponseDto[];
  nextCursor: string | null;  // Use this for next page
  hasMore: boolean;
}
```

**Pagination:**
Use cursor-based pagination for infinite scroll:

1. First request: `GET /chat/:teamId/history?limit=50`
2. Next page: `GET /chat/:teamId/history?limit=50&cursor=<nextCursor>`
3. Continue until `hasMore` is `false`

---

## Online Status

### GET `/chat/:teamId/online`

Get list of currently online users.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```typescript
{
  users: Array<{
    id: string;
    username: string;
    nickName: string;
    avatar: string | null;
  }>;
}
```

---

## Uploading Attachments

Attachments must be uploaded separately before sending the message:

1. Upload the file to `/storage/upload` endpoint
2. Get back the file URL
3. Include the URL in the `message:send` event

See the Storage API documentation for upload details.

---

## Example Usage (JavaScript)

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.example.com', {
  auth: { token: localStorage.getItem('accessToken') },
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});

// Join a team room
function joinTeam(teamId) {
  socket.emit('room:join', { teamId });
}

// Leave a team room
function leaveTeam(teamId) {
  socket.emit('room:leave', { teamId });
}

// Send a text message
function sendMessage(teamId, content) {
  socket.emit('message:send', { teamId, content });
}

// Send a message with attachment
function sendImageMessage(teamId, imageUrl, caption) {
  socket.emit('message:send', {
    teamId,
    content: caption || undefined,
    attachmentUrl: imageUrl,
    attachmentType: 'image',
  });
}

// Typing indicators
function startTyping(teamId) {
  socket.emit('typing:start', { teamId });
}

function stopTyping(teamId) {
  socket.emit('typing:stop', { teamId });
}

// Listen for new messages
socket.on('message:new', (message) => {
  if (message.messageType === 'system') {
    // Handle system notification
    displaySystemMessage(message);
  } else {
    // Handle user message
    displayUserMessage(message);
  }
});

// Listen for presence changes
socket.on('user:online', (user) => {
  addToOnlineList(user);
});

socket.on('user:offline', ({ userId }) => {
  removeFromOnlineList(userId);
});

// Listen for typing
socket.on('user:typing', ({ userId, username }) => {
  showTypingIndicator(username);
});

socket.on('user:stopTyping', ({ userId }) => {
  hideTypingIndicator(userId);
});

// Handle errors
socket.on('error', (error) => {
  console.error('Chat error:', error.message);
});
```

---

## Error Codes

| Code               | Description                   |
| ------------------ | ----------------------------- |
| `VALIDATION_ERROR` | Invalid payload format        |
| `NOT_FOUND`        | Team or message not found     |
| `FORBIDDEN`        | User not a member of the team |
| `UNAUTHORIZED`     | Invalid or expired token      |

---

## Best Practices

1. **Reconnection:** Socket.IO handles reconnection automatically. Re-join rooms after reconnect.

2. **Typing Debounce:** Debounce typing events to avoid flooding:

   ```javascript
   let typingTimeout;

   function onInput(teamId) {
     if (!typingTimeout) {
       socket.emit('typing:start', { teamId });
     }
     clearTimeout(typingTimeout);
     typingTimeout = setTimeout(() => {
       socket.emit('typing:stop', { teamId });
       typingTimeout = null;
     }, 2000);
   }
   ```

3. **Optimistic Updates:** Show messages immediately before server confirmation, then update on `message:new`.

4. **Infinite Scroll:** Load history with cursor pagination when user scrolls up.

5. **Attachments:** Compress images before uploading. Show upload progress in UI.
