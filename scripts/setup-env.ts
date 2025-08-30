import { existsSync, copyFileSync } from 'fs';

const src = '.env.sample';
const dst = '.env';

if (!existsSync(dst)) {
  copyFileSync(src, dst);
  console.log('Created .env from .env.sample');
} else {
  console.log('.env already exists');
}

