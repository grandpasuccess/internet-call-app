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
├── frontend/
│   ├── web/         # React web app (Vite)
│   └── mobile/      # React Native app (Expo)
├── docs/            # Documentation
└── docker-compose.yml
```

## Quick Start

See [SETUP.md](./docs/SETUP.md) for detailed setup instructions.

### Prerequisites

- Node.js >= 16.0.0
- pnpm
- Docker & Docker Compose (for local development)
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Commands

```bash
# Install dependencies
pnpm install --recursive

# Start development (all services via Docker)
docker-compose up -d

# Start backend only
cd backend && pnpm dev

# Start web frontend
cd frontend/web && pnpm dev

# Start mobile app
cd frontend/mobile && pnpm start
```

## Architecture

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design details.

## API Documentation

See [API.md](./docs/API.md) for endpoint reference.

## License

MIT
