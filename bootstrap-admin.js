#!/usr/bin/env node

/**
 * Bootstrap admin user for TATI development
 * Creates admin@test.com with admin role in Firebase Emulator
 */

// Set emulator env vars before importing Firebase Admin
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    projectId: 'demo-tati',
  });
}

const auth = getAuth();
const db = getFirestore();

async function bootstrap() {
  try {
    console.log('Creating admin user in Firebase Emulator...');

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: 'admin@test.com',
      password: 'Admin@12345',
      displayName: 'Test Admin',
    });

    console.log('✓ Auth user created:', userRecord.uid);

    // Create Firestore user document with admin role
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      roles: ['admin'],
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('✓ Firestore document created with admin role');
    console.log('\nAdmin user bootstrapped successfully!');
    console.log('Email: admin@test.com');
    console.log('Password: Admin@12345');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error bootstrapping admin user:', error.message);
    process.exit(1);
  }
}

bootstrap();
