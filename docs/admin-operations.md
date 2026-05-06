# Administrative Operations

Procedures for system administrators managing the Riskeez instance.

## First-Time Admin Setup

When Riskeez is first deployed, the system will enter a "First Time Setup" mode.
1. Access the application URL.
2. Follow the on-screen prompts to create the primary Organization and Admin User.
3. Once completed, the setup mode is disabled.

## Password Management

**Server-Side Admin Password Reset:**
If the primary admin password is lost:
1. Shell into the backend container.
2. Run the admin management script (future): `npm run admin:reset-password <email>`.
3. Alternatively, manually update the `profiles` table in the database with a temporary hash and flag for password change upon next login.

## Data Maintenance

**Database Backups (Postgres):**
To manually trigger a backup:
```bash
docker exec riskeez-postgres pg_dump -U riskeez riskeez > backup_$(date +%Y%m%d).sql
```

**Restoring from Backup:**
```bash
cat backup_file.sql | docker exec -i riskeez-postgres psql -U riskeez riskeez
```

## Secret Rotation

To rotate the `JWT_SECRET`:
1. Update the `.env` file with the new secret.
2. Restart the backend service.
3. Note: This will invalidate all currently active sessions, requiring users to log in again.

## Monitoring Logs

View live backend logs:
```bash
docker logs -f riskeez-backend
```

Check for error severity counts:
```bash
grep -c "CRITICAL" /var/log/riskeez/audit.log
```
