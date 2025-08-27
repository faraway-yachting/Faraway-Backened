#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Starting deployment process...');

try {
  // Build the project
  console.log('📦 Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Update package.json for production
  console.log('🔧 Updating package.json for production...');
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  
  // Remove dev dependencies and scripts
  delete packageJson.devDependencies;
  delete packageJson.scripts.build;
  delete packageJson.scripts.dev;
  
  // Update start script
  packageJson.scripts.start = 'node dist/server.js';
  
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

  // Install production dependencies
  console.log('📥 Installing production dependencies...');
  execSync('npm ci --only=production', { stdio: 'inherit' });

  // Run tests
  console.log('🧪 Running tests...');
  execSync('npm test', { stdio: 'inherit' });

  console.log('✅ Deployment completed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
}
