import 'dotenv/config';
import mysql from 'mysql2/promise.js';
import { env } from '../src/shared/config/env';
import { runMigrations } from '../src/shared/db/migrate';

async function reset({ migrate, force }: { migrate: boolean; force: boolean }) {
  if (env.NODE_ENV !== 'development' && !force) {
    throw new Error('Refusing to reset DB outside development without --force');
  }

  const admin = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });
  try {
    // List and drop all tables in current schema
    const [rows] = await admin.query<{ TABLE_NAME: string }[]>(
      'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?;',[env.DB_NAME],
    );
    const tables = rows.map((r) => r.TABLE_NAME);
    if (tables.length === 0) {
      console.log(`No tables found in ${env.DB_NAME}`);
    } else {
      console.log(`Dropping ${tables.length} tables in ${env.DB_NAME}...`);
      await admin.query('SET FOREIGN_KEY_CHECKS=0;');
      for (const t of tables) {
        await admin.query(`DROP TABLE IF EXISTS \`${t}\`;`);
      }
      await admin.query('SET FOREIGN_KEY_CHECKS=1;');
      console.log('Drop complete.');
    }

    if (migrate) {
      console.log('Re-applying migrations...');
      await runMigrations();
      console.log('Migrations applied.');
    }
  } finally {
    await admin.end();
  }
}

// CLI
if (import.meta.main) {
  const args = new Set(process.argv.slice(2));
  const migrate = !args.has('--no-migrate');
  const force = args.has('--force');
  reset({ migrate, force }).then(
    () => {
      console.log('DB reset done');
      process.exit(0);
    },
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}

