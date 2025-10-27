#!/usr/bin/env node

/**
 * Get Firebase Configuration
 * 
 * This script retrieves Firebase web app configuration using the Firebase Management API
 * 
 * Usage:
 *   node scripts/get-firebase-config.js <project-id>
 */

const https = require('https');
const { execSync } = require('child_process');

const projectId = process.argv[2];

if (!projectId) {
  console.error('❌ Error: Project ID required');
  console.error('Usage: node scripts/get-firebase-config.js <project-id>');
  process.exit(1);
}

console.log(`🔍 Fetching Firebase config for project: ${projectId}\n`);

// Get access token
let accessToken;
try {
  accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
} catch (error) {
  console.error('❌ Error: Failed to get access token. Please run: gcloud auth login');
  process.exit(1);
}

// Step 1: List web apps
const listAppsOptions = {
  hostname: 'firebase.googleapis.com',
  path: `/v1beta1/projects/${projectId}/webApps`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
};

console.log('📱 Listing web apps...');

const listAppsRequest = https.request(listAppsOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ Error: Failed to list apps (${res.statusCode})`);
      console.error(data);
      process.exit(1);
    }

    const response = JSON.parse(data);
    
    if (!response.apps || response.apps.length === 0) {
      console.error('❌ Error: No web apps found. Creating one...');
      createWebApp(projectId, accessToken);
      return;
    }

    const appId = response.apps[0].appId;
    const appName = response.apps[0].name;
    
    console.log(`✅ Found web app: ${appId}\n`);
    
    // Step 2: Get app config
    getAppConfig(appName, accessToken);
  });
});

listAppsRequest.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

listAppsRequest.end();

function getAppConfig(appName, accessToken) {
  console.log('⚙️  Fetching app configuration...');
  
  const getConfigOptions = {
    hostname: 'firebase.googleapis.com',
    path: `/v1beta1/${appName}/config`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  };

  const getConfigRequest = https.request(getConfigOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`❌ Error: Failed to get config (${res.statusCode})`);
        console.error(data);
        process.exit(1);
      }

      const config = JSON.parse(data);
      
      console.log('\n✅ Firebase Configuration:\n');
      console.log('NEXT_PUBLIC_FIREBASE_API_KEY=' + config.apiKey);
      console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=' + config.authDomain);
      console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID=' + config.projectId);
      console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=' + config.storageBucket);
      console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=' + config.messagingSenderId);
      console.log('NEXT_PUBLIC_FIREBASE_APP_ID=' + config.appId);
      
      if (config.measurementId) {
        console.log('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=' + config.measurementId);
      }
      
      console.log('\n✅ Copy these values to your .env.local file\n');
    });
  });

  getConfigRequest.on('error', (error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });

  getConfigRequest.end();
}

function createWebApp(projectId, accessToken) {
  console.log('🔨 Creating web app...');
  
  const createAppOptions = {
    hostname: 'firebase.googleapis.com',
    path: `/v1beta1/projects/${projectId}/webApps`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  const requestBody = JSON.stringify({
    displayName: 'Insight Dashboard',
  });

  const createAppRequest = https.request(createAppOptions, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`❌ Error: Failed to create app (${res.statusCode})`);
        console.error(data);
        process.exit(1);
      }

      const response = JSON.parse(data);
      console.log('✅ Web app created');
      
      // Wait a moment for the app to be ready, then get config
      setTimeout(() => {
        getAppConfig(response.name, accessToken);
      }, 2000);
    });
  });

  createAppRequest.on('error', (error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });

  createAppRequest.write(requestBody);
  createAppRequest.end();
}

