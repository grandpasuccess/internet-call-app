# Internet Call App

A production-ready 1-to-1 audio/video calling application supporting web and mobile platforms.

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL, Redis, Socket.io, WebRTC
- **Web Frontend:** React 18, Vite, Socket.io Client
- **Mobile Frontend:** React Native (Expo), react-native-webrtc
- **Infrastructure:** Docker, Docker Compose

## Features

- Real-time 1-to-1 audio/video calls
- WebRTC-based peer-to-peer communication
- NAT traversal via STUN/TURN servers
- User authentication (JWT tokens)
- Real-time user presence (online/offline status)
- Call management (initiate, accept, reject, end)
- Adaptive bitrate for network resilience
- Cross-platform: Web + iOS + Android

## Project Structure

```
internet-call-app/
├── backend/          # Node.js/Express server
│   ├── src/          # Source code
│   ├── tests/        # Test suites (94 tests)
│   └── scripts/      # DB migrations
├── frontend/
│   ├── web/         # React web app (Vite)
│   └── mobile/      # React Native app (Expo)
├── docs/            # Documentation
├── .github/         # GitHub Actions
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14
- Redis >= 7

### 1. Clone and Install

```bash
git clone https://github.com/grandpasuccess/internet-call-app.git
cd internet-call-app
pnpm install
```

### 2. Set Up Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database and Redis credentials

# Frontend Web
cp frontend/web/.env.example frontend/web/.env
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb internet_call_app

# Run migrations
cd backend && pnpm migrate
```

### 4. Start Development

```bash
# Terminal 1: Start backend
cd backend && pnpm dev

# Terminal 2: Start web frontend
cd frontend/web && pnpm dev
```

The web app will be available at `http://localhost:3000`.

### 5. Run Tests

```bash
# Backend tests
cd backend && pnpm test

# Frontend tests (when implemented)
cd frontend/web && pnpm test
```

## API Documentation

See [docs/API.md](./docs/API.md) for endpoint reference.

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design details.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, commit format, and PR rules.

## License

MIT
