#!/usr/bin/env node
/**
 * Setup QA Test Data for H3.3 Manual Testing
 * 
 * This script creates synthetic test data in the Firestore Emulator
 * for manual QA testing of the school admin dashboard.
 * 
 * Usage: node scripts/setup-qa-test-data.js
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (uses FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST env vars)
const app = admin.initializeApp({
  projectId: 'demo-tati'
});

const auth = admin.auth();
const db = admin.firestore();

// Test data to create
const testData = {
  users: [
    {
      uid: 'admin_a_user_id',
      email: 'admin-a@school-a.edu',
      password: 'TestAdminA123!',
      displayName: 'Admin A',
      role: 'schoolAdmin'
    },
    {
      uid: 'admin_b_user_id',
      email: 'admin-b@school-b.edu',
      password: 'TestAdminB123!',
      displayName: 'Admin B',
      role: 'schoolAdmin'
    },
    {
      uid: 'facilitator_a_user_id',
      email: 'facilitator-a@school-a.edu',
      password: 'TestFacA123!',
      displayName: 'Facilitator A',
      role: 'facilitator'
    },
    {
      uid: 'facilitator_b_user_id',
      email: 'facilitator-b@school-b.edu',
      password: 'TestFacB123!',
      displayName: 'Facilitator B',
      role: 'facilitator'
    }
  ]
};

async function createTestData() {
  console.log('🔧 Setting up QA test data in Firebase Emulator...\n');

  try {
    // 1. Create test users in Auth Emulator
    console.log('📝 Creating test users...');
    const createdUsers = {};
    for (const user of testData.users) {
      try {
        const userRecord = await auth.createUser({
          uid: user.uid,
          email: user.email,
          password: user.password,
          displayName: user.displayName
        });
        createdUsers[user.uid] = userRecord;
        console.log(`  ✅ Created user: ${user.email} (${user.uid})`);
      } catch (error) {
        console.error(`  ❌ Error creating user ${user.email}:`, error.message);
      }
    }

    // 2. Create test schools
    console.log('\n🏫 Creating test schools...');
    const schoolA = await db.collection('schools').add({
      name: 'School A - Test School',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created School A: ${schoolA.id}`);

    const schoolB = await db.collection('schools').add({
      name: 'School B - Test School',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created School B: ${schoolB.id}`);

    // 3. Create school administrators
    console.log('\n👨‍💼 Creating school administrators...');
    const adminA = await db.collection('schoolAdministrators').add({
      uid: 'admin_a_user_id',
      schoolId: schoolA.id,
      role: 'admin',
      email: 'admin-a@school-a.edu',
      displayName: 'Admin A',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created School A Admin: ${adminA.id}`);

    const adminB = await db.collection('schoolAdministrators').add({
      uid: 'admin_b_user_id',
      schoolId: schoolB.id,
      role: 'admin',
      email: 'admin-b@school-b.edu',
      displayName: 'Admin B',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created School B Admin: ${adminB.id}`);

    // 4. Create facilitators
    console.log('\n👨‍🏫 Creating facilitators...');
    const facA = await db.collection('facilitators').add({
      uid: 'facilitator_a_user_id',
      schoolId: schoolA.id,
      email: 'facilitator-a@school-a.edu',
      displayName: 'Facilitator A',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created Facilitator A: ${facA.id}`);

    const facB = await db.collection('facilitators').add({
      uid: 'facilitator_b_user_id',
      schoolId: schoolB.id,
      email: 'facilitator-b@school-b.edu',
      displayName: 'Facilitator B',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created Facilitator B: ${facB.id}`);

    // 5. Create cohorts
    console.log('\n👥 Creating cohorts...');
    const cohortA1 = await db.collection('cohorts').add({
      name: 'Cohort A1 - Test',
      schoolId: schoolA.id,
      facilitatorUid: 'facilitator_a_user_id',
      status: 'active',
      learnerCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created Cohort A1: ${cohortA1.id}`);

    const cohortA2 = await db.collection('cohorts').add({
      name: 'Cohort A2 - Test',
      schoolId: schoolA.id,
      facilitatorUid: 'facilitator_a_user_id',
      status: 'active',
      learnerCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created Cohort A2: ${cohortA2.id}`);

    const cohortB1 = await db.collection('cohorts').add({
      name: 'Cohort B1 - Test',
      schoolId: schoolB.id,
      facilitatorUid: 'facilitator_b_user_id',
      status: 'active',
      learnerCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✅ Created Cohort B1: ${cohortB1.id}`);

    // 6. Create learners
    console.log('\n👶 Creating learners...');
    const learners = [
      { name: 'Learner A1-1', cohortId: cohortA1.id, schoolId: schoolA.id },
      { name: 'Learner A1-2', cohortId: cohortA1.id, schoolId: schoolA.id },
      { name: 'Learner A2-1', cohortId: cohortA2.id, schoolId: schoolA.id },
      { name: 'Learner B1-1', cohortId: cohortB1.id, schoolId: schoolB.id }
    ];

    for (const learner of learners) {
      const learnerDoc = await db.collection('learners').add({
        name: learner.name,
        cohortId: learner.cohortId,
        schoolId: learner.schoolId,
        age: Math.floor(Math.random() * 4) + 8, // Ages 8-12
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`  ✅ Created ${learner.name}: ${learnerDoc.id}`);
    }

    console.log('\n✨ Test data setup complete!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin A: admin-a@school-a.edu / TestAdminA123!');
    console.log('  Admin B: admin-b@school-b.edu / TestAdminB123!');
    console.log('  Facilitator A: facilitator-a@school-a.edu / TestFacA123!');
    console.log('  Facilitator B: facilitator-b@school-b.edu / TestFacB123!');
    console.log('\n🔗 Access at: http://localhost:8081/academy/admin/schools');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  }

  await app.delete();
  process.exit(0);
}

createTestData();
