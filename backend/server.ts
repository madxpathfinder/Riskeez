import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authRouter } from './src/modules/auth/authRoutes.js';
import { userRouter } from './src/modules/users/userRoutes.js';
import { riskRouter } from './src/modules/risks/riskRoutes.js';
import { controlRouter } from './src/modules/controls/controlRoutes.js';
import { assessmentRouter } from './src/modules/assessments/assessmentRoutes.js';
import { documentRouter } from './src/modules/documents/documentRoutes.js';
import { auditLogRouter } from './src/modules/audit-logs/auditLogRoutes.js';
import { notificationRouter } from './src/modules/notifications/notificationRoutes.js';
import { organizationRouter } from './src/modules/organizations/organizationRoutes.js';
import { aiRouter } from './src/modules/ai/aiRoutes.js';
import { dashboardRouter } from './src/modules/dashboard/dashboardRoutes.js';
import { importedSheetRouter } from './src/modules/imported-sheets/importedSheetRoutes.js';
import { reportRouter } from './src/modules/reports/reportRoutes.js';
import { categoryRouter } from './src/modules/categories/categoryRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

// CORS — allow one or more space-separated origins from ALLOWED_ORIGIN env var
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
  .split(' ')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Raise body limit for base64 file uploads (50 MB decoded ≈ ~67 MB base64)
app.use(express.json({ limit: '70mb' }));

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV || 'production' }));

// Public branding (no auth) — returns app name for login page
app.get('/api/branding', async (req, res) => {
  try {
    const { db } = await import('./src/db.js');
    const result = await db.query(`SELECT name, app_name FROM organizations LIMIT 1`);
    if (result.rows.length === 0) {
      return res.json({ appName: process.env.APP_NAME || 'Risk Platform' });
    }
    const row = result.rows[0];
    res.json({ appName: row.app_name || process.env.APP_NAME || row.name || 'Risk Platform' });
  } catch {
    res.json({ appName: process.env.APP_NAME || 'Risk Platform' });
  }
});

// Setup status (used by frontend before login)
app.get('/api/setup/status', async (req, res) => {
  try {
    const { db } = await import('./src/db.js');
    const result = await db.query(`SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'`);
    res.json({ isInitialized: parseInt(result.rows[0].count, 10) > 0 });
  } catch {
    res.json({ isInitialized: false });
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/risks', riskRouter);
app.use('/api/controls', controlRouter);
app.use('/api/assessments', assessmentRouter);
app.use('/api/documents', documentRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/organizations', organizationRouter);
app.use('/api/ai', aiRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/imported-sheets', importedSheetRouter);
app.use('/api/reports', reportRouter);
app.use('/api/categories', categoryRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[GRC API] Running on port ${PORT}`);
});

export default app;
