// Script to set up H3.3 QA test data in Firestore
// Run this via Firebase Admin SDK or Firestore REST API

const QA_ACCOUNTS = {
  'admin-h33-qa-a': {
    uid: '32cde835-c1af-4439-a797-00fb165c56d1',
    email: 'admin-h33-qa-a@childsave.test',
    role: 'admin'
  },
  'admin-h33-qa-b': {
    uid: 'fc1d52d5-7200-4e38-bc97-058145fb4f9e',
    email: 'admin-h33-qa-b@childsave.test',
    role: 'admin'
  },
  'facilitator-h33-qa-a': {
    uid: '7525a372-0e4d-4b43-9185-4281f29b0608',
    email: 'facilitator-h33-qa-a@childsave.test',
    role: 'facilitator'
  },
  'facilitator-h33-qa-b': {
    uid: '2964b466-3ee6-4f84-a4c1-212bdd03baab',
    email: 'facilitator-h33-qa-b@childsave.test',
    role: 'facilitator'
  },
  'parent-h33-qa-a': {
    uid: '8bcbf7e9-eb0f-4d8f-aaf3-9162a64ca014',
    email: 'parent-h33-qa-a@childsave.test',
    role: 'parent'
  }
};

const QA_SCHOOLS = {
  'qa-school-h33-a': {
    id: 'qa-school-h33-a',
    name: 'H3.3 QA School A',
    status: 'active',
    adminUid: '32cde835-c1af-4439-a797-00fb165c56d1',
    facilitatorUid: '7525a372-0e4d-4b43-9185-4281f29b0608'
  },
  'qa-school-h33-b': {
    id: 'qa-school-h33-b',
    name: 'H3.3 QA School B',
    status: 'active',
    adminUid: 'fc1d52d5-7200-4e38-bc97-058145fb4f9e',
    facilitatorUid: '2964b466-3ee6-4f84-a4c1-212bdd03baab'
  }
};

// QA Cohorts and Learners (synthetic)
const QA_COHORTS = {
  'qa-cohort-a1': {
    id: 'qa-cohort-a1',
    schoolId: 'qa-school-h33-a',
    name: 'QA Cohort A1',
    facilitatorUid: '7525a372-0e4d-4b43-9185-4281f29b0608',
    status: 'active',
    learnerIds: ['qa-learner-a1', 'qa-learner-a2']
  },
  'qa-cohort-b1': {
    id: 'qa-cohort-b1',
    schoolId: 'qa-school-h33-b',
    name: 'QA Cohort B1',
    facilitatorUid: '2964b466-3ee6-4f84-a4c1-212bdd03baab',
    status: 'active',
    learnerIds: ['qa-learner-b1']
  }
};

// Learner data (requires family relationships)
const QA_LEARNERS = {
  'qa-learner-a1': {
    id: 'qa-learner-a1',
    name: 'QA Learner A1',
    familyId: 'qa-family-a',
    avatar: 'scene-77.png',
    age: 10
  },
  'qa-learner-a2': {
    id: 'qa-learner-a2',
    name: 'QA Learner A2',
    familyId: 'qa-family-a',
    avatar: 'scene-78.png',
    age: 12
  },
  'qa-learner-b1': {
    id: 'qa-learner-b1',
    name: 'QA Learner B1',
    familyId: 'qa-family-b',
    avatar: 'scene-79.png',
    age: 11
  }
};

console.log('H3.3 QA Test Data Configuration');
console.log('================================');
console.log('QA Accounts:', Object.keys(QA_ACCOUNTS).length);
console.log('QA Schools:', Object.keys(QA_SCHOOLS).length);
console.log('QA Cohorts:', Object.keys(QA_COHORTS).length);
console.log('QA Learners:', Object.keys(QA_LEARNERS).length);
