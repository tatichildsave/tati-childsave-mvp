#!/usr/bin/env node

/**
 * Firestore QA Test Data Setup Script
 * Creates all necessary test relationships for H3.3 manual QA
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK (pointed at emulator)
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-key.json');
admin.initializeApp({
  projectId: 'tatichildsavemvp'
});

// Connect to Firestore Emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`✓ Firestore Emulator detected: ${process.env.FIRESTORE_EMULATOR_HOST}`);
} else {
  console.error('ERROR: FIRESTORE_EMULATOR_HOST not set!');
  process.exit(1);
}

const db = admin.firestore();

// Test user UIDs from Auth Emulator
const TEST_USERS = {
  adminA: { uid: 'wJD6Ic8C0ez5SCpHhlipOzGWhcOY', email: 'admin-a-qa@school-a.test' },
  adminB: { uid: 'uh2hcrCd0gpf7AikU2V7dOzbXIyt', email: 'admin-b-qa@school-b.test' },
  facilitatorA: { uid: 'zg3xWd0PT4Zz96rJ2NVZDTY0jARu', email: 'facilitator-a-qa@school-a.test' },
  facilitatorB: { uid: '3UOeaDqC9E0EvDUJ04m3WqsMUPaT', email: 'facilitator-b-qa@school-b.test' },
  parentA: { uid: 'My7deaCqCQwg85vykCvrYLpigIna', email: 'parent-a-qa@school-a.test' },
  parentB: { uid: 'K87r74ua1eOl3jIHqLlyPdpIK15t', email: 'parent-b-qa@school-b.test' },
  learnerA1: { uid: 'hw7cJPNIkR2cljpOORFzN6VfkGlc', email: 'learner-a1-qa@school-a.test' },
  learnerA2: { uid: '1ysYvB0D8TyExjLkz21k84ISYroy', email: 'learner-a2-qa@school-a.test' },
  learnerB1: { uid: '0M3ShNp7pIaz6sFuMldJrchaLHYm', email: 'learner-b1-qa@school-b.test' }
};

// School IDs
const SCHOOL_A_ID = '9fjwvit4DPteKu5D6mZ7';
const SCHOOL_B_ID = 'school-b-qa-test';

async function setupFirestoreQA() {
  console.log('\n🚀 Starting Firestore QA Test Data Setup\n');
  
  try {
    // ============================================
    // 1. Create School B
    // ============================================
    console.log('📚 Creating School B...');
    await db.collection('schools').doc(SCHOOL_B_ID).set({
      name: 'School B - Test School',
      description: 'Test school for QA testing',
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ School B created with ID: ${SCHOOL_B_ID}`);

    // ============================================
    // 2. Create schoolAdministrators relationships
    // ============================================
    console.log('\n👨‍💼 Creating schoolAdministrators...');
    
    // Admin A -> School A
    await db.collection('schools').doc(SCHOOL_A_ID)
      .collection('schoolAdministrators').doc(TEST_USERS.adminA.uid).set({
        uid: TEST_USERS.adminA.uid,
        email: TEST_USERS.adminA.email,
        role: 'schoolAdmin',
        displayName: 'Admin A QA Test',
        createdAt: new Date().toISOString()
      });
    console.log(`✓ Admin A linked to School A`);

    // Admin B -> School B
    await db.collection('schools').doc(SCHOOL_B_ID)
      .collection('schoolAdministrators').doc(TEST_USERS.adminB.uid).set({
        uid: TEST_USERS.adminB.uid,
        email: TEST_USERS.adminB.email,
        role: 'schoolAdmin',
        displayName: 'QA Admin B',
        createdAt: new Date().toISOString()
      });
    console.log(`✓ Admin B linked to School B`);

    // ============================================
    // 3. Create facilitators
    // ============================================
    console.log('\n👨‍🏫 Creating facilitators...');
    
    // Facilitator A -> School A
    await db.collection('facilitators').doc(TEST_USERS.facilitatorA.uid).set({
      uid: TEST_USERS.facilitatorA.uid,
      schoolId: SCHOOL_A_ID,
      email: TEST_USERS.facilitatorA.email,
      displayName: 'QA Facilitator A',
      role: 'facilitator',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Facilitator A created for School A`);

    // Facilitator B -> School B
    await db.collection('facilitators').doc(TEST_USERS.facilitatorB.uid).set({
      uid: TEST_USERS.facilitatorB.uid,
      schoolId: SCHOOL_B_ID,
      email: TEST_USERS.facilitatorB.email,
      displayName: 'QA Facilitator B',
      role: 'facilitator',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Facilitator B created for School B`);

    // ============================================
    // 4. Create cohorts
    // ============================================
    console.log('\n📚 Creating cohorts...');
    
    const cohortA1Id = 'cohort-a1-qa-test';
    const cohortA2Id = 'cohort-a2-qa-test';
    const cohortB1Id = 'cohort-b1-qa-test';

    // Cohort A1 (School A, Facilitator A)
    await db.collection('cohorts').doc(cohortA1Id).set({
      name: 'QA Cohort A1',
      schoolId: SCHOOL_A_ID,
      facilitatorId: TEST_USERS.facilitatorA.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Cohort A1 created (${cohortA1Id})`);

    // Cohort A2 (School A, Facilitator A)
    await db.collection('cohorts').doc(cohortA2Id).set({
      name: 'QA Cohort A2',
      schoolId: SCHOOL_A_ID,
      facilitatorId: TEST_USERS.facilitatorA.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Cohort A2 created (${cohortA2Id})`);

    // Cohort B1 (School B, Facilitator B)
    await db.collection('cohorts').doc(cohortB1Id).set({
      name: 'QA Cohort B1',
      schoolId: SCHOOL_B_ID,
      facilitatorId: TEST_USERS.facilitatorB.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Cohort B1 created (${cohortB1Id})`);

    // ============================================
    // 5. Create learners
    // ============================================
    console.log('\n👤 Creating learners...');
    
    // Learner A1 (School A, Cohort A1, Parent A)
    await db.collection('learners').doc(TEST_USERS.learnerA1.uid).set({
      uid: TEST_USERS.learnerA1.uid,
      email: TEST_USERS.learnerA1.email,
      displayName: 'QA Learner A1',
      schoolId: SCHOOL_A_ID,
      cohortId: cohortA1Id,
      parentId: TEST_USERS.parentA.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Learner A1 created (School A, Cohort A1)`);

    // Learner A2 (School A, Cohort A2, Parent A)
    await db.collection('learners').doc(TEST_USERS.learnerA2.uid).set({
      uid: TEST_USERS.learnerA2.uid,
      email: TEST_USERS.learnerA2.email,
      displayName: 'QA Learner A2',
      schoolId: SCHOOL_A_ID,
      cohortId: cohortA2Id,
      parentId: TEST_USERS.parentA.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Learner A2 created (School A, Cohort A2)`);

    // Learner B1 (School B, Cohort B1, Parent B)
    await db.collection('learners').doc(TEST_USERS.learnerB1.uid).set({
      uid: TEST_USERS.learnerB1.uid,
      email: TEST_USERS.learnerB1.email,
      displayName: 'QA Learner B1',
      schoolId: SCHOOL_B_ID,
      cohortId: cohortB1Id,
      parentId: TEST_USERS.parentB.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log(`✓ Learner B1 created (School B, Cohort B1)`);

    // ============================================
    // 6. Create family relationships
    // ============================================
    console.log('\n👨‍👩‍👧 Creating family relationships...');
    
    // Family A: Parent A with Learners A1 and A2
    const familyAId = 'family-a-qa-test';
    await db.collection('families').doc(familyAId).set({
      name: 'QA Family A',
      schoolId: SCHOOL_A_ID,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    
    // Add parent A to family A
    await db.collection('families').doc(familyAId)
      .collection('members').doc(TEST_USERS.parentA.uid).set({
        uid: TEST_USERS.parentA.uid,
        email: TEST_USERS.parentA.email,
        displayName: 'QA Parent A',
        role: 'parent',
        status: 'active'
      });
    
    // Add learners A1 and A2 to family A
    await db.collection('families').doc(familyAId)
      .collection('members').doc(TEST_USERS.learnerA1.uid).set({
        uid: TEST_USERS.learnerA1.uid,
        email: TEST_USERS.learnerA1.email,
        displayName: 'QA Learner A1',
        role: 'child',
        status: 'active'
      });
    
    await db.collection('families').doc(familyAId)
      .collection('members').doc(TEST_USERS.learnerA2.uid).set({
        uid: TEST_USERS.learnerA2.uid,
        email: TEST_USERS.learnerA2.email,
        displayName: 'QA Learner A2',
        role: 'child',
        status: 'active'
      });
    console.log(`✓ Family A created with Parent A, Learner A1, Learner A2`);

    // Family B: Parent B with Learner B1
    const familyBId = 'family-b-qa-test';
    await db.collection('families').doc(familyBId).set({
      name: 'QA Family B',
      schoolId: SCHOOL_B_ID,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    
    // Add parent B to family B
    await db.collection('families').doc(familyBId)
      .collection('members').doc(TEST_USERS.parentB.uid).set({
        uid: TEST_USERS.parentB.uid,
        email: TEST_USERS.parentB.email,
        displayName: 'QA Parent B',
        role: 'parent',
        status: 'active'
      });
    
    // Add learner B1 to family B
    await db.collection('families').doc(familyBId)
      .collection('members').doc(TEST_USERS.learnerB1.uid).set({
        uid: TEST_USERS.learnerB1.uid,
        email: TEST_USERS.learnerB1.email,
        displayName: 'QA Learner B1',
        role: 'child',
        status: 'active'
      });
    console.log(`✓ Family B created with Parent B, Learner B1`);

    console.log('\n✅ Firestore QA Test Data Setup Complete!\n');
    console.log('Test Resources Created:');
    console.log(`  • Schools: School A (${SCHOOL_A_ID}), School B (${SCHOOL_B_ID})`);
    console.log(`  • Admins: Admin A → School A, Admin B → School B`);
    console.log(`  • Facilitators: Facilitator A → School A, Facilitator B → School B`);
    console.log(`  • Cohorts: A1, A2, B1`);
    console.log(`  • Learners: A1, A2 (School A), B1 (School B)`);
    console.log(`  • Families: Family A (Parent A + 2 learners), Family B (Parent B + 1 learner)`);
    console.log('\nYou can now log in with:');
    console.log(`  Admin A: admin-a-qa@school-a.test / QATest123`);
    console.log(`  Admin B: admin-b-qa@school-b.test / QATest123\n`);

  } catch (error) {
    console.error('❌ Error setting up Firestore QA data:', error);
    process.exit(1);
  }
}

// Run the setup
setupFirestoreQA().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
