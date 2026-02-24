#!/usr/bin/env node

/**
 * Setup script to link root .env to all apps
 * This ensures each Vite/app can find environment variables
 * without duplicating the .env file across the monorepo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rootEnv = path.resolve(rootDir, '.env');
const appsDir = path.resolve(rootDir, 'apps');

// Apps that need the .env file
const appsNeedingEnv = ['web', 'extension'];

if (!fs.existsSync(rootEnv)) {
  console.error('❌ Root .env file not found at', rootEnv);
  process.exit(1);
}

appsNeedingEnv.forEach((app) => {
  const appDir = path.resolve(appsDir, app);
  const appEnv = path.resolve(appDir, '.env');
  const envLocal = path.resolve(appDir, '.env.local');

  if (!fs.existsSync(appDir)) {
    console.warn(`⚠️  App directory not found: ${appDir}`);
    return;
  }

  // Remove existing symlink/file if it exists
  if (fs.existsSync(appEnv)) {
    try {
      fs.unlinkSync(appEnv);
      console.log(`🗑️  Removed existing ${app}/.env`);
    } catch (err) {
      console.error(`❌ Failed to remove ${app}/.env:`, err.message);
    }
  }

  // Remove .env.local to avoid precedence conflicts
  if (fs.existsSync(envLocal)) {
    try {
      fs.unlinkSync(envLocal);
      console.log(`🗑️  Removed ${app}/.env.local`);
    } catch (err) {
      console.warn(`⚠️  Failed to remove ${app}/.env.local:`, err.message);
    }
  }

  // Create symlink from app/.env to root/.env
  try {
    fs.symlinkSync(rootEnv, appEnv, 'file');
    console.log(`✅ Linked ${app}/.env → root/.env`);
  } catch (err) {
    console.error(`❌ Failed to create symlink for ${app}:`, err.message);
    process.exit(1);
  }
});

console.log('\n✨ Environment setup complete!');
