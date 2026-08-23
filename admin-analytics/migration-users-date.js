// Script de migration pour ajouter creationDate aux users
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCjwNuanIruLkOpUnVZUAtBadt9t5exZyM",
  authDomain: "babylist-ae85f.firebaseapp.com",
  projectId: "babylist-ae85f",
  storageBucket: "babylist-ae85f.firebasestorage.app",
  messagingSenderId: "347055639005",
  appId: "1:347055639005:ios:0814badf42f7c16933ce34",
  measurementId: "G-JZSVSH6SJ9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateUsersCreationDate() {
  console.log('🔄 Starting migration...');

  // Date: 03/03/2025
  const creationDate = new Date('2025-03-03T00:00:00Z');
  const timestamp = Timestamp.fromDate(creationDate);

  console.log('📅 Using date:', creationDate.toISOString());

  // Get all users
  const usersRef = collection(db, 'Users');
  const snapshot = await getDocs(usersRef);

  console.log(`📊 Total users: ${snapshot.docs.length}`);

  let updated = 0;
  let skipped = 0;

  for (const userDoc of snapshot.docs) {
    const userData = userDoc.data();

    // Check if creationDate is missing or null
    if (!userData.creationDate) {
      console.log(`✏️  Updating user: ${userDoc.id} (${userData.email || 'no email'})`);

      await updateDoc(doc(db, 'Users', userDoc.id), {
        creationDate: timestamp
      });

      updated++;
    } else {
      skipped++;
    }
  }

  console.log('✅ Migration complete!');
  console.log(`   - Updated: ${updated} users`);
  console.log(`   - Skipped: ${skipped} users (already had creationDate)`);
}

migrateUsersCreationDate()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
