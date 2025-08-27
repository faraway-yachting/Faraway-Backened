#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 Starting production deployment process...');

interface DeploymentConfig {
    environment: 'production' | 'staging';
    backupDatabase: boolean;
    runTests: boolean;
    healthCheck: boolean;
    rollbackOnFailure: boolean;
}

const config: DeploymentConfig = {
    environment: 'production',
    backupDatabase: true,
    runTests: true,
    healthCheck: true,
    rollbackOnFailure: true
};

async function deploy(): Promise<void> {
    const startTime = Date.now();
    
    try {
        // 1. Pre-deployment checks
        console.log('🔍 Running pre-deployment checks...');
        await runPreDeploymentChecks();
        
        // 2. Backup current deployment
        if (config.backupDatabase) {
            console.log('💾 Creating database backup...');
            await createDatabaseBackup();
        }
        
        // 3. Build the project
        console.log('📦 Building project for production...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // 4. Run tests
        if (config.runTests) {
            console.log('🧪 Running production tests...');
            execSync('npm test', { stdio: 'inherit' });
        }
        
        // 5. Update package.json for production
        console.log('🔧 Updating package.json for production...');
        await updatePackageForProduction();
        
        // 6. Install production dependencies
        console.log('📥 Installing production dependencies...');
        execSync('npm ci --only=production', { stdio: 'inherit' });
        
        // 7. Deploy to production
        console.log('🚀 Deploying to production...');
        await deployToProduction();
        
        // 8. Health check
        if (config.healthCheck) {
            console.log('🏥 Running health checks...');
            await runHealthChecks();
        }
        
        const deploymentTime = Date.now() - startTime;
        console.log(`✅ Production deployment completed successfully in ${deploymentTime}ms!`);
        
    } catch (error) {
        console.error('❌ Production deployment failed:', error);
        
        if (config.rollbackOnFailure) {
            console.log('🔄 Rolling back to previous version...');
            await rollbackDeployment();
        }
        
        process.exit(1);
    }
}

async function runPreDeploymentChecks(): Promise<void> {
    // Check if production environment file exists
    if (!existsSync('.env.production')) {
        throw new Error('Production environment file not found');
    }
    
    // Check if Docker is running
    try {
        execSync('docker --version', { stdio: 'pipe' });
    } catch {
        throw new Error('Docker is not running');
    }
    
    // Check if required environment variables are set
    const envContent = readFileSync('.env.production', 'utf-8');
    const requiredVars = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME'];
    
    for (const varName of requiredVars) {
        if (!envContent.includes(varName)) {
            throw new Error(`Required environment variable ${varName} not found`);
        }
    }
}

async function createDatabaseBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `backups/${timestamp}`;
    
    execSync(`mkdir -p ${backupDir}`, { stdio: 'inherit' });
    
    // Create MongoDB backup (if running locally)
    try {
        execSync(`mongodump --out ${backupDir}/database`, { stdio: 'inherit' });
        console.log(`Database backup created in ${backupDir}/database`);
    } catch (error) {
        console.warn('⚠️  Could not create database backup (MongoDB might not be running locally)');
    }
}

async function updatePackageForProduction(): Promise<void> {
    const packagePath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    // Remove dev dependencies and scripts
    delete packageJson.devDependencies;
    delete packageJson.scripts.build;
    delete packageJson.scripts.dev;
    delete packageJson.scripts.test;
    
    // Update start script
    packageJson.scripts.start = 'node dist/server.js';
    
    // Add production-specific scripts
    packageJson.scripts.health = 'node -e "require(\'http\').get(\'http://localhost:8100/health\', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"';
    
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
}

async function deployToProduction(): Promise<void> {
    // Stop existing containers
    try {
        execSync('docker-compose -f docker/docker-compose.production.yml down', { stdio: 'inherit' });
    } catch (error) {
        console.warn('⚠️  Could not stop existing containers');
    }
    
    // Build and start new containers
    execSync('docker-compose -f docker/docker-compose.production.yml up --build -d', { stdio: 'inherit' });
    
    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
}

async function runHealthChecks(): Promise<void> {
    const maxRetries = 5;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            execSync('docker-compose -f docker/docker-compose.production.yml exec app npm run health', { stdio: 'inherit' });
            console.log('✅ Health check passed');
            return;
        } catch (error) {
            retries++;
            console.log(`⚠️  Health check failed (attempt ${retries}/${maxRetries})`);
            
            if (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            }
        }
    }
    
    throw new Error('Health check failed after maximum retries');
}

async function rollbackDeployment(): Promise<void> {
    try {
        execSync('docker-compose -f docker/docker-compose.production.yml down', { stdio: 'inherit' });
        console.log('🔄 Rollback completed');
    } catch (error) {
        console.error('❌ Rollback failed:', error);
    }
}

// Run deployment
deploy().catch(console.error);
