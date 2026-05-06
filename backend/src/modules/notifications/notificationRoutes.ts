import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const notificationRouter = Router();
notificationRouter.use(authMiddleware);

const toNotif = (row: any) => ({
  id: row.id,
  title: row.title,
  message: row.message,
  type: row.type,
  read: row.read,
  actionPath: row.action_path,
  timestamp: row.timestamp
});

// GET /api/notifications
notificationRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 50`,
      [user.id]
    );
    res.json({ notifications: result.rows.map(toNotif) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications
notificationRouter.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, message, type, actionPath } = req.body;
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await db.query(
      `INSERT INTO notifications (id, user_id, title, message, type, action_path)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, user.id, title, message, type || 'info', actionPath]
    );
    res.status(201).json({ notification: toNotif(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read
notificationRouter.post('/:id/read', async (req, res) => {
  try {
    const user = (req as any).user;
    await db.query(`UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2`, [req.params.id, user.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all
notificationRouter.post('/read-all', async (req, res) => {
  try {
    const user = (req as any).user;
    await db.query(`UPDATE notifications SET read=true WHERE user_id=$1`, [user.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications
notificationRouter.delete('/', async (req, res) => {
  try {
    const user = (req as any).user;
    await db.query(`DELETE FROM notifications WHERE user_id=$1`, [user.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
