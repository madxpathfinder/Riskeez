# Security & Compliance Protocol

This document defines the security architecture and operational requirements for the Riskeez platform.

## Key Security Principles

1. **Secret Management**:
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` or any other sensitive secrets in the frontend.
   - Use server-side environment variables to inject secrets at runtime.

2. **Communication**:
   - ALL production traffic must be served over **HTTPS** (TLS 1.2+).
   - Backend APIs must use secure headers (HSTS, CSP, X-Frame-Options).

3. **Authentication & Authorization**:
   - Passwords must be hashed using SCrypt or Argon2id.
   - Role-Based Access Control (RBAC) must be enforced by the backend, not the UI.
   - Password reset flows must be server-side and involve email verification.

4. **Data Isolation**:
   - Use Database Row Level Security (RLS) to ensure organizations cannot access each other's data.
   - Restrict file access (MinIO/S3) by organization-specific buckets or paths.

5. **Confidentiality**:
   - Documents in the vault may contain highly sensitive information (contracts, network diagrams).
   - Enable encryption at rest for both the database and artifact storage.

6. **Audit & Accountability**:
   - Audit logs must be append-only and protected from unauthorized modification.
   - Log all destructive actions and data exports.

## Operations

- **Backups**: Database backups must be automated and stored offline/separately.
- **Vulnerability Patching**: Regularly update base images in Docker (alpine-based) and npm dependencies.
- **Rotating Secrets**: Rotate JWT_SECRET and API keys at least every 90 days or if a compromise is suspected.
