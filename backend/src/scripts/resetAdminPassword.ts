import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import * as readline from 'readline';

// Read .env manually — avoids dotenv path resolution issues under tsx
const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

async function resetPassword() {
  const args = process.argv.slice(2);
  const emailArgIdx = args.indexOf('--email');

  if (emailArgIdx === -1 || !args[emailArgIdx + 1]) {
    console.error('Usage: npm run admin:reset-password -- --email admin@example.com');
    process.exit(1);
  }

  const email = args[emailArgIdx + 1];

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL tapılmadı. .env faylını yoxlayın.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const check = await pool.query('SELECT id, name, role FROM users WHERE email = $1', [email]);
    if (check.rows.length === 0) {
      console.error(`İstifadəçi tapılmadı: ${email}`);
      process.exit(1);
    }
    const user = check.rows[0];
    console.log(`İstifadəçi tapıldı: ${user.name} (${user.role})`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const newPassword = await new Promise<string>((resolve) => {
      rl.question('Yeni şifrə (min 8 simvol): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (newPassword.length < 8) {
      console.error('Şifrə minimum 8 simvol olmalıdır.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1, role = 'Admin', status = 'Active' WHERE email = $2`,
      [hash, email]
    );
    console.log(`\nŞifrə sıfırlandı və Admin rolü təyin edildi: ${email}`);
  } finally {
    await pool.end();
  }
}

resetPassword().catch((err) => {
  console.error('Xəta:', err.message);
  process.exit(1);
});
