import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import * as readline from 'readline';
import { resolve } from 'path';

// .env is at backend root — two levels up from src/scripts/
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function resetPassword() {
  const args = process.argv.slice(2);
  const emailArgIdx = args.indexOf('--email');

  if (emailArgIdx === -1 || !args[emailArgIdx + 1]) {
    console.error('Usage: npm run admin:reset-password -- --email admin@example.com');
    process.exit(1);
  }

  const email = args[emailArgIdx + 1];

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found. Make sure you run this from /var/www/riskeez/backend');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const check = await pool.query('SELECT id, name, role FROM users WHERE email = $1', [email]);
    if (check.rows.length === 0) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    const user = check.rows[0];
    console.log(`User found: ${user.name} (${user.role})`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const newPassword = await new Promise<string>((resolve) => {
      rl.question('New password (min 8 chars): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (newPassword.length < 8) {
      console.error('Password must be at least 8 characters.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
    console.log(`\nPassword successfully reset for: ${email}`);
  } finally {
    await pool.end();
  }
}

resetPassword().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
