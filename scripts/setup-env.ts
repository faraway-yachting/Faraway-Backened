#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const envExamplePath = path.join(projectRoot, 'env.example');
const envDevPath = path.join(projectRoot, '.env.development');

console.log('🚀 Setting up development environment...');

// Check if .env.development already exists
if (fs.existsSync(envDevPath)) {
    console.log('⚠️  .env.development already exists. Skipping...');
    process.exit(0);
}

// Check if env.example exists
if (!fs.existsSync(envExamplePath)) {
    console.error('❌ env.example not found!');
    process.exit(1);
}

try {
    // Read env.example and create .env.development
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envDevPath, envExample);
    
    console.log('✅ .env.development created successfully!');
    console.log('📝 Please edit .env.development with your actual values:');
    console.log('   - MONGO_URI: Your MongoDB connection string');
    console.log('   - JWT_SECRET: A secure random string for JWT signing');
    console.log('   - Other required variables as needed');
    console.log('');
    console.log('🔒 Remember: .env.development is already in .gitignore for security');
    
} catch (error) {
    console.error('❌ Failed to create .env.development:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
}
