# Contributing to Internet Call App

## Branch Naming

- `feature/*` — New features
- `fix/*` — Bug fixes
- `refactor/*` — Code refactoring
- `docs/*` — Documentation
- `test/*` — Test additions/fixes

## Commit Format

We follow [Conventional Commits](https://www.conventionalcommits.org):

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
```
feat(auth): add user registration endpoint
fix(memory): correct pagination offset calculation
test(cron): add unit tests for job scheduler
docs(api): update endpoint reference for /api/agent/git
chore(deps): update drizzle-orm to 0.31.0
refactor(proxy): extract rate limiter to shared middleware
```

## Pull Request Rules

1. All PRs require CI to pass (tests, lint, type check)
2. At least one code review before merge
3. No direct commits to `main` — all changes via PR
4. Squash merge preferred for feature branches

## Code Standards

- TypeScript strict mode enabled
- No `any` types — use `unknown` and narrow
- All functions that can fail must have tests
- Follow existing file structure conventions
- Document complex logic with comments

## Testing

```bash
# Run all backend tests
cd backend && pnpm test

# Run specific test file
cd backend && pnpm test -- tests/models/user.test.js

# Run with coverage
cd backend && pnpm test:coverage
```
