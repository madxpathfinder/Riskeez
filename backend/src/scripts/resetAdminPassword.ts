import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import * as readline from 'readline';

dotenv.config();

async function resetPassword() {
  const args = process.argv.slice(2);
  const emailArgIdx = args.indexOf('--email');

  if (emailArgIdx === -1 || !args[emailArgIdx + 1]) {
    console.error('Error: Please provide an email address using --email');
    console.error('Usage: npm run admin:reset-password -- --email admin@example.com');
    process.exit(1);
  }

  const email = args[emailArgIdx + 1];

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const check = await pool.query('SELECT id, name, role FROM users WHERE email = $1', [email]);
    if (check.rows.length === 0) {
      console.error(`Error: No user found with email: ${email}`);
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
      console.error('Error: Password must be at least 8 characters.');
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
