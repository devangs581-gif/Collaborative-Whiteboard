# Collaborative Whiteboard

A real-time collaborative whiteboard built with React, HTML5 Canvas, Socket.IO, Express, and MongoDB. Create a room, invite collaborators, and draw together on a persistent infinite canvas.

**Live demo:** [collaborative-whiteboard-frontend-qbzp.onrender.com](https://collaborative-whiteboard-frontend-qbzp.onrender.com)

## Highlights

- Real-time drawing and object updates with Socket.IO
- Persistent rooms and drawing data stored in MongoDB
- Guest and authenticated room access with role-based editing
- Pencil, line, rectangle, circle, arrow, text, and eraser tools
- Object selection, drag-to-move, resize handles, and deletion
- Optimistic object updates with server-side revision checks to prevent stale updates overwriting newer changes
- Room-wide Clear action, synchronized and persisted for all editable members
- Infinite canvas with local zoom, pan, fit-to-content, and a world-space dotted grid
- PNG export, presence indicators, remote cursors, and activity feed

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, HTML5 Canvas, React Router |
| Real time | Socket.IO |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Security | JWT, bcrypt, Helmet, CORS, rate limiting |

## How It Works

```text
React Canvas client
        |
 REST API + Socket.IO operations
        |
Express / Socket.IO server
        |
MongoDB room and drawing state
```

Whiteboard items are structured objects with stable IDs. The server persists completed object operations (`create`, `update`, `delete`, `clear`, and `replace`) and broadcasts them only to the relevant room.

Viewport state is intentionally local. One user can zoom or pan without changing another user's view; shared objects always remain in world coordinates.

## Features

### Drawing and manipulation

- Draw freehand pencil strokes and shapes
- Select the topmost object
- Move and resize objects with pointer controls
- Delete selected objects with the toolbar or `Delete` / `Backspace`
- Undo and redo local board changes
- Download the current canvas as PNG

### Infinite canvas controls

| Action | Control |
| --- | --- |
| Zoom in/out | Toolbar controls or `Ctrl/Cmd` + `+` / `-` |
| Reset viewport | Toolbar Reset or `Ctrl/Cmd` + `0` |
| Zoom toward cursor | `Ctrl/Cmd` + mouse wheel |
| Pan | Middle-mouse drag or `Space` + left drag |
| Fit objects | Toolbar Fit |

### Collaboration

- Join the same room URL in multiple browser windows
- See completed object creations, moves, resizes, deletes, and clears in real time
- See connected members, activity, and remote cursors
- Refresh or reconnect without losing persisted drawing data
- Editable roles (`OWNER`, `ADMIN`, and `MEMBER`) can modify and clear a board; `VIEWER` cannot

## Project Structure

```text
client/                  React and Canvas application
  src/components/        Whiteboard, canvas, toolbar, room UI
  src/socket.js          Shared Socket.IO client
server/                  Express and Socket.IO API
  controllers/           Authentication and room endpoints
  models/                MongoDB schemas
  socket/                Real-time room and board handlers
  utils/                 Request and object validation
```

## Run Locally

### Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas database

### 1. Start the backend

Create `server/.env`:

```env
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/collaborative_whiteboard
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

Then run:

```bash
cd server
npm install
npm run dev
```

### 2. Start the frontend

Create `client/.env`:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000/api/v1
```

Then run:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Create an account and receive a JWT |
| `POST` | `/api/v1/auth/login` | Sign in and receive a JWT |
| `GET` | `/api/v1/auth/me` | Get the authenticated user |
| `POST` | `/api/v1/rooms` | Create or open a room |
| `POST` | `/api/v1/rooms/join` | Join a room as a user or guest |
| `GET` | `/api/v1/rooms/:roomId` | Get room and board state |
| `PATCH` | `/api/v1/rooms/:roomId/members/:userId` | Update a member role |

## Socket.IO Events

| Direction | Events |
| --- | --- |
| Client → Server | `room:join`, `whiteboard:operation`, `cursor:update` |
| Server → Client | `whiteboard:sync`, `whiteboard:operation`, `presence:update`, `cursor:update`, `cursor:remove`, `activity` |

`whiteboard:operation` is the single authoritative collaboration channel. It supports object-level `create`, `update`, `delete`, board-level `clear`, and history `replace` operations.

## Verify

```bash
cd server
npm test

cd ../client
npm run build
```

For a collaboration check, open the same room in two browser windows. Create, move, resize, delete, and clear an object in one window; verify it updates in the other, then refresh both windows to confirm persistence.

## Deployment

The frontend is deployed on Render at the live demo link above. For a production deployment:

- Deploy `server` as a Render Web Service with `npm start`
- Deploy `client` as a Render Static Site with `npm run build` and publish directory `dist`
- Set the backend `CLIENT_URL` to the deployed frontend origin
- Set `VITE_BACKEND_URL` and `VITE_API_URL` to the deployed backend URL before building the frontend
- Use MongoDB Atlas or another managed MongoDB deployment for `MONGODB_URI`

## License

This project is available for personal and educational use.
