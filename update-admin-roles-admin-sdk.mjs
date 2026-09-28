#!/usr/bin/env node

/**
 * Update admin user roles using firebase-admin SDK
 * This script runs locally and connects to the Firestore emulator
 */

import admin from 'firebase-admin';

async function updateAdminRoles() {
  try {
    console.log('🔗 Connecting to Firestore Emulator...\n');

    // Set emulator host before initializing
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    
    // Initialize firebase-admin - it automatically connects to emulator via env var
    admin.initializeApp({
      projectId: 'demo-tati',
    });

    const db = admin.firestore();

    const uid = 'gubN3Ry88IsIOsKy4IFzE7A0bAGl';
    
    console.log(`📝 Updating roles for admin user: ${uid}\n`);

    // Update the document to add admin role
    await db.collection('users').doc(uid).update({
      roles: admin.firestore.FieldValue.arrayUnion('admin'),
    });

    console.log('✅ Successfully added "admin" role to roles array\n');
    console.log('🌐 Now try signing in at: http://localhost:8080/admin-login');
    console.log('Email: admin@test.com');
    console.log('Password: Admin@12345\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateAdminRoles();
