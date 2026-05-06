# Riskeez Deployment Guide

This document outlines the procedures for deploying Riskeez in both development and production environments.

## Local Development (Native)

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   ```
3. Configure environment variables in `.env`.
4. Start the frontend: `npm run dev`
5. Start the backend: `npm run dev` (inside `backend/`)

## Containerized Deployment (Docker Compose)

Riskeez is designed for containerized orchestration. Use the provided `docker-compose.yml` for a full-stack local deployment.

1. Ensure Docker and Docker Compose are installed.
2. Run `docker-compose up -d`.
3. The application will be available at:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`
   - Ollama API: `http://localhost:11434`
   - MinIO Console: `http://localhost:9001`

## Production Checklist

- [ ] Change all default passwords in `.env` (Postgres, MinIO, JWT_SECRET).
- [ ] Ensure all communication is over HTTPS.
- [ ] Configure database backups (see `admin-operations.md`).
- [ ] Set up monitoring and logging (e.g., Prometheus/Grafana or CloudWatch).
- [ ] Scale the backend and frontend services based on anticipated load.

## Database Migration Notes

- Riskeez uses Prisma for database schema management.
- Run `npx prisma migrate deploy` in production before starting the backend service.

## Future Kubernetes Notes

For large-scale enterprise deployments, Riskeez can be deployed to Kubernetes (GKE, EKS, AKS). Helm charts will be provided in future releases.
- Frontend: Nginx-based static serving.
- Backend: Horizontal Pod Autoscaler based on CPU/Memory metrics.
- Database: Managed SQL instance (Cloud SQL, RDS) recommended over in-cluster Postgres.
