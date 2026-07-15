# Howdy Chat — Backend

Node.js + Express + Socket.IO + MongoDB (Mongoose) backend with JWT auth, built to match
the `howdy-chat` frontend's typed socket contract exactly.

## Architecture

```
src/
├── config/          env.ts (validated env vars via zod), db.ts (Mongoose connection)
├── models/           User, Conversation, Message (Mongoose schemas)
├── middleware/        auth.ts (JWT bearer verification for REST), errorHandler.ts
├── routes/            authRoutes, conversationRoutes
├── controllers/       authController, conversationController
├── services/           authService (JWT sign/verify), conversationService (queries)
├── socket/
│   ├── index.ts         Socket.IO server: JWT handshake auth, handler registration
│   ├── types.ts          Event contracts — mirrors frontend's socket.types.ts exactly
│   └── handlers/         messageHandlers, typingHandlers, presenceHandlers
├── app.ts             Express app assembly
└── server.ts           Entry point: connects DB, starts HTTP + Socket.IO server
```

### Auth flow
1. `POST /api/auth/register` or `/api/auth/login` → returns `{ token, user }` (JWT, 7d expiry by default)
2. Frontend stores the token and sends it two ways:
   - REST: `Authorization: Bearer <token>` header
   - Socket.IO: `io(url, { auth: { token } })` handshake
3. `io.use()` middleware in `socket/index.ts` verifies the token before any event handler runs —
   unauthenticated sockets never connect.

### Real-time flow
- `message:send` → validates the sender is a participant, persists to MongoDB, updates the
  conversation's `lastMessageId` and per-participant unread counts, then emits `message:ack`
  back to the sender (to reconcile their optimistic UI) and `message:new` to everyone else in
  the conversation's Socket.IO room.
- `conversation:join` / `leave` → room membership, checked against actual DB participation
  (not just trusted client input).
- `typing:start` / `stop` → broadcast to the room, no persistence.
- Presence: a user is marked `isOnline: true` on first socket connect and `false` only once
  their *last* connected socket disconnects (multi-tab/device safe), broadcast via
  `presence:update`.

## Setup

### 1. Prerequisites
- Node.js 20+
- A MongoDB instance — either local (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 2. Install & configure
```bash
cd howdy-chat-backend
npm install
cp .env.example .env
```
Edit `.env`:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/howdy-chat
JWT_SECRET=<generate a long random string>
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```
Generate a secret quickly with `openssl rand -hex 32`.

### 3. Run
```bash
npm run dev       # tsx watch mode
npm run build && npm start   # production
```
Health check: `GET http://localhost:4000/health` → `{ "status": "ok" }`

## API reference

| Method | Path | Auth | Body / Query | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, password }` | Create account, returns `{ token, user }` |
| POST | `/api/auth/login` | — | `{ email, password }` | Returns `{ token, user }` |
| GET | `/api/auth/me` | Bearer | — | Returns the current user (used to restore sessions on reload) |
| GET | `/api/conversations` | Bearer | — | List conversations for the current user |
| POST | `/api/conversations` | Bearer | `{ participantIds, name, isGroup }` | Create a conversation |
| GET | `/api/conversations/:id/messages` | Bearer | `?cursor=<messageId>` | Paginated history, newest page first, 30/page |

## Connecting the frontend

The frontend's `.env` should point at this server:
```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```
The frontend already implements the full login/register/session-restore flow against these
exact endpoints (`src/services/authApi.ts`, `src/pages/LoginPage.tsx`,
`src/hooks/useAuthBootstrap.ts`) and authenticates the socket with the stored JWT.

## Notes for production

- Add refresh tokens if you want shorter-lived access tokens.
- Add rate limiting on `/api/auth/*` (e.g. `express-rate-limit`) to slow brute-force attempts.
- Add a Socket.IO Redis adapter (`@socket.io/redis-adapter`) if you scale to multiple server
  instances, so rooms/broadcasts work across nodes.
- Add indexes as query patterns emerge; `Message` already has a compound index on
  `{ conversationId, createdAt }` for the common pagination query.
- Consider soft-deletes / edit history if you need message editing beyond the `editedAt` field
  already on the schema.
