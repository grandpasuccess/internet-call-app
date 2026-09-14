# Setup Guide

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14
- Redis >= 7

## Installation

```bash
# Clone the repository
git clone https://github.com/grandpasuccess/internet-call-app.git
cd internet-call-app

# Install dependencies
pnpm install
```

## Environment Configuration

### Backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=internet_call_app
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:3000,http://localhost:19000
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```

### Frontend Web

```bash
cp frontend/web/.env.example frontend/web/.env
```

## Database Setup

```bash
# Create database
createdb internet_call_app

# Run migrations
cd backend && pnpm migrate
```

## Running the Application

### Start Backend

```bash
cd backend
pnpm dev
```

The API will be available at `http://localhost:3001`.

### Start Web Frontend

```bash
cd frontend/web
pnpm dev
```

The web app will be available at `http://localhost:3000`.

## Running Tests

```bash
# Backend tests
cd backend && pnpm test

# Frontend tests (when implemented)
cd frontend/web && pnpm test
```

## Docker (Optional)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

## Troubleshooting

- **Port already in use:** Change `PORT` in `.env` files
- **Database connection failed:** Verify PostgreSQL is running and credentials are correct
- **Redis connection failed:** Verify Redis is running (`redis-server`)
- **CORS errors:** Add your frontend URL to `CORS_ORIGIN` in backend `.env`
