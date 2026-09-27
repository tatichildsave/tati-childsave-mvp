#!/usr/bin/env node
/**
 * H3.3 QA Setup Script
 * This script creates all necessary Firestore documents for H3.3 QA testing
 * Run: node H3_3_QA_SETUP.mjs
 */

import admin from 'firebase-admin';
import * as fs from 'fs';

const QA_TEST_DATA = {
  accounts: {
    'admin-h33-qa-a': {
      uid: '32cde835-c1af-4439-a797-00fb165c56d1',
      email: 'admin-h33-qa-a@childsave.test',
      displayName: 'QA Admin A',
      roles: ['admin'],
      createdAt: new Date().toISOString()
    },
    'admin-h33-qa-b': {
      uid: 'fc1d52d5-7200-4e38-bc97-058145fb4f9e',
      email: 'admin-h33-qa-b@childsave.test',
      displayName: 'QA Admin B',
      roles: ['admin'],
      createdAt: new Date().toISOString()
    },
    'facilitator-h33-qa-a': {
      uid: '7525a372-0e4d-4b43-9185-4281f29b0608',
      email: 'facilitator-h33-qa-a@childsave.test',
      displayName: 'QA Facilitator A',
      roles: ['facilitator'],
      createdAt: new Date().toISOString()
    },
    'facilitator-h33-qa-b': {
      uid: '2964b466-3ee6-4f84-a4c1-212bdd03baab',
      email: 'facilitator-h33-qa-b@childsave.test',
      displayName: 'QA Facilitator B',
      roles: ['facilitator'],
      createdAt: new Date().toISOString()
    },
    'parent-h33-qa-a': {
      uid: '8bcbf7e9-eb0f-4d8f-aaf3-9162a64ca014',
      email: 'parent-h33-qa-a@childsave.test',
      displayName: 'QA Parent A',
      roles: [],
      createdAt: new Date().toISOString()
    }
  },
  schools: [
    {
      id: 'qa-school-h33-a',
      name: 'H3.3 QA School A',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: '32cde835-c1af-4439-a797-00fb165c56d1'
    },
    {
      id: 'qa-school-h33-b',
      name: 'H3.3 QA School B',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'fc1d52d5-7200-4e38-bc97-058145fb4f9e'
    }
  ],
  schoolAdmins: [
    {
      schoolId: 'qa-school-h33-a',
      adminUid: '32cde835-c1af-4439-a797-00fb165c56d1',
      role: 'school_admin'
    },
    {
      schoolId: 'qa-school-h33-b',
      adminUid: 'fc1d52d5-7200-4e38-bc97-058145fb4f9e',
      role: 'school_admin'
    }
  ],
  cohorts: [
    {
      id: 'qa-cohort-a1',
      schoolId: 'qa-school-h33-a',
      name: 'QA Cohort A1',
      facilitatorUid: '7525a372-0e4d-4b43-9185-4281f29b0608',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'qa-cohort-b1',
      schoolId: 'qa-school-h33-b',
      name: 'QA Cohort B1',
      facilitatorUid: '2964b466-3ee6-4f84-a4c1-212bdd03baab',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  families: [
    {
      id: 'qa-family-a',
      parentUid: '8bcbf7e9-eb0f-4d8f-aaf3-9162a64ca014',
      name: 'QA Family A',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  learners: [
    {
      id: 'qa-learner-a1',
      name: 'QA Learner A1',
      familyId: 'qa-family-a',
      cohortId: 'qa-cohort-a1',
      age: 10,
      avatar: 'scene-77.png',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'qa-learner-a2',
      name: 'QA Learner A2',
      familyId: 'qa-family-a',
      cohortId: 'qa-cohort-a1',
      age: 12,
      avatar: 'scene-78.png',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'qa-learner-b1',
      name: 'QA Learner B1',
      familyId: 'qa-family-a', // simplified: using same family
      cohortId: 'qa-cohort-b1',
      age: 11,
      avatar: 'scene-79.png',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ]
};

async function setupQAData() {
  try {
    // Initialize Firebase Admin SDK (assumes credentials are configured)
    if (!admin.apps.length) {
      console.log('Initializing Firebase Admin SDK...');
      admin.initializeApp();
    }

    const db = admin.firestore();
    console.log('\n📝 H3.3 QA Data Setup Started');
    console.log('================================\n');

    let totalCreated = 0;

    // 1. Create user documents
    console.log('1️⃣  Creating user documents...');
    for (const [key, user] of Object.entries(QA_TEST_DATA.accounts)) {
      const docRef = db.collection('users').doc(user.uid);
      await docRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        status: 'active',
        createdAt: admin.firestore.Timestamp.fromDate(new Date(user.createdAt)),
        qaMarker: 'h33-qa'
      });
      console.log(`   ✓ ${user.email} (${user.roles.join(', ') || 'no roles'})`);
      totalCreated++;
    }

    // 2. Create schools
    console.log('\n2️⃣  Creating QA schools...');
    for (const school of QA_TEST_DATA.schools) {
      const docRef = db.collection('schools').doc(school.id);
      await docRef.set({
        id: school.id,
        name: school.name,
        status: school.status,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(school.createdAt)),
        createdBy: school.createdBy,
        qaMarker: 'h33-qa'
      });
      console.log(`   ✓ ${school.name} (${school.id})`);
      totalCreated++;
    }

    // 3. Create school admin assignments
    console.log('\n3️⃣  Creating school admin assignments...');
    for (const admin_assign of QA_TEST_DATA.schoolAdmins) {
      const docRef = db.collection('schools')
        .doc(admin_assign.schoolId)
        .collection('admins')
        .doc(admin_assign.adminUid);
      await docRef.set({
        adminUid: admin_assign.adminUid,
        role: admin_assign.role,
        assignedAt: admin.firestore.Timestamp.now(),
        qaMarker: 'h33-qa'
      });
      console.log(`   ✓ Admin assignment for ${admin_assign.schoolId}`);
      totalCreated++;
    }

    // 4. Create cohorts
    console.log('\n4️⃣  Creating QA cohorts...');
    for (const cohort of QA_TEST_DATA.cohorts) {
      const docRef = db.collection('academyCohorts').doc(cohort.id);
      await docRef.set({
        id: cohort.id,
        schoolId: cohort.schoolId,
        name: cohort.name,
        facilitatorUid: cohort.facilitatorUid,
        status: cohort.status,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(cohort.createdAt)),
        qaMarker: 'h33-qa'
      });
      console.log(`   ✓ ${cohort.name} (${cohort.schoolId})`);
      totalCreated++;
    }

    // 5. Create families
    console.log('\n5️⃣  Creating QA families...');
    for (const family of QA_TEST_DATA.families) {
      const docRef = db.collection('families').doc(family.id);
      await docRef.set({
        id: family.id,
        parentUid: family.parentUid,
        name: family.name,
        status: family.status,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(family.createdAt)),
        qaMarker: 'h33-qa'
      });
      console.log(`   ✓ ${family.name} (parent: ${family.parentUid.substring(0, 8)}...)`);
      totalCreated++;
    }

    // 6. Create learners
    console.log('\n6️⃣  Creating QA learners...');
    for (const learner of QA_TEST_DATA.learners) {
      const docRef = db.collection('users').doc(learner.id);
      await docRef.set({
        id: learner.id,
        name: learner.name,
        familyId: learner.familyId,
        cohortId: learner.cohortId,
        age: learner.age,
        avatar: learner.avatar,
        status: learner.status,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(learner.createdAt)),
        qaMarker: 'h33-qa'
      });
      console.log(`   ✓ ${learner.name} (family: ${learner.familyId})`);
      totalCreated++;
    }

    console.log('\n✅ QA Data Setup Complete');
    console.log(`📊 Total documents created: ${totalCreated}`);
    console.log('\n📋 QA Test Data Summary:');
    console.log(`   Users: ${Object.keys(QA_TEST_DATA.accounts).length}`);
    console.log(`   Schools: ${QA_TEST_DATA.schools.length}`);
    console.log(`   School Admin Assignments: ${QA_TEST_DATA.schoolAdmins.length}`);
    console.log(`   Cohorts: ${QA_TEST_DATA.cohorts.length}`);
    console.log(`   Families: ${QA_TEST_DATA.families.length}`);
    console.log(`   Learners: ${QA_TEST_DATA.learners.length}`);

    // Save QA references to file
    const qaReferences = {
      createdAt: new Date().toISOString(),
      accounts: QA_TEST_DATA.accounts,
      schools: QA_TEST_DATA.schools,
      cohorts: QA_TEST_DATA.cohorts,
      families: QA_TEST_DATA.families,
      learners: QA_TEST_DATA.learners
    };

    fs.writeFileSync('H3_3_QA_REFERENCES.json', JSON.stringify(qaReferences, null, 2));
    console.log('\n💾 QA references saved to H3_3_QA_REFERENCES.json');

    return qaReferences;

  } catch (error) {
    console.error('❌ Error during QA setup:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupQAData()
    .then(() => {
      console.log('\n✨ QA setup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('🚨 QA setup script failed:', error);
      process.exit(1);
    });
}

export { setupQAData, QA_TEST_DATA };
