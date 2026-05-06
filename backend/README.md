# Riskeez Backend Implementation Guide

This directory contains the skeleton for the Riskeez Node.js/Express backend.

## Architecture

- **Express**: Web framework for API routes.
- **Zod**: Input validation.
- **JWT**: Stateless authentication.
- **Bcrypt**: Password hashing.
- **Supabase/PostgreSQL**: Planned database provider.

## Security Constraints

1. **Organization Isolation**: Every database query must filter by `organization_id`.
2. **JWT Validation**: Use `authMiddleware.ts` for all private routes.
3. **Audit Trail**: All administrative and data mutation actions must trigger an audit log.
4. **Secrets Management**: Sensitive keys like `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the client.

## API Endpoint Mapping (Planned)

### AUTH
- GET `/setup/status`
- POST `/setup/initial-admin`
- POST `/auth/login`
- POST `/auth/logout`
- POST `/auth/reset-password`
- GET `/auth/me`

### ORGANIZATIONS
- GET `/organization`
- PUT `/organization`

### USERS
- GET `/users`
- POST `/users`
- PUT `/users/:id`
- POST `/users/:id/disable`
- POST `/users/:id/enable`
- POST `/users/:id/reset-password`

### ASSESSMENTS
- GET `/assessments`
- POST `/assessments`
- GET `/assessments/:id`
- PUT `/assessments/:id`
- POST `/assessments/:id/complete`

### RISKS
- GET `/risks`
- POST `/risks`
- GET `/risks/:id`
- PUT `/risks/:id`
- DELETE `/risks/:id`
- POST `/risks/import`
- GET `/risks/export`

### AI
- POST `/ai/chat`
- POST `/ai/analyze-document`
- POST `/ai/suggest-controls`
- POST `/ai/generate-remediation-plan`
- POST `/ai/generate-executive-summary`

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Emergency Recovery

To reset an admin password from the server terminal:
```bash
npm run admin:reset-password -- --email admin@example.com
```
