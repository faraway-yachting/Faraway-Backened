#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

console.log('🚀 Starting build process...');

// Clean previous build
const distPath = join(process.cwd(), 'dist');
if (existsSync(distPath)) {
    console.log('🧹 Cleaning previous build...');
    rmSync(distPath, { recursive: true, force: true });
}

try {
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    // Run tests
    console.log('🧪 Running tests...');
    execSync('npm test', { stdio: 'inherit' });

    // Build project
    console.log('🔨 Building project...');
    execSync('npm run build', { stdio: 'inherit' });

    // Copy necessary files
    console.log('📋 Copying configuration files...');
    execSync('cp .env.example dist/', { stdio: 'inherit' });
    execSync('cp -r uploads dist/', { stdio: 'inherit' });

    console.log('✅ Build completed successfully!');
    console.log(`📁 Build output: ${distPath}`);
} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
}
