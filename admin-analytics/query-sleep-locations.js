import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCjwNuanIruLkOpUnVZUAtBadt9t5exZyM",
  authDomain: "babylist-ae85f.firebaseapp.com",
  projectId: "babylist-ae85f",
  storageBucket: "babylist-ae85f.firebasestorage.app",
  messagingSenderId: "347055639005",
  appId: "1:347055639005:ios:0814badf42f7c16933ce34",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function querySleepLocations() {
  const snapshot = await getDocs(collection(db, 'Baby'));

  const locationCount = {};
  let totalSleep = 0;
  let noLocation = 0;

  for (const babyDoc of snapshot.docs) {
    const tasks = babyDoc.data().tasks ?? [];
    const sleepTasks = tasks.filter(t => t.id === 3);
    totalSleep += sleepTasks.length;

    for (const task of sleepTasks) {
      const loc = task.sleepLocation ?? null;
      if (!loc) {
        noLocation++;
      } else {
        locationCount[loc] = (locationCount[loc] ?? 0) + 1;
      }
    }
  }

  console.log(`\n📊 Sleep tasks total: ${totalSleep}`);
  console.log(`❌ No location set:   ${noLocation} (${Math.round(noLocation / totalSleep * 100)}%)\n`);

  const sorted = Object.entries(locationCount).sort((a, b) => b[1] - a[1]);
  for (const [loc, count] of sorted) {
    const pct = Math.round(count / totalSleep * 100);
    console.log(`  ${loc.padEnd(16)} ${count} (${pct}%)`);
  }
}

querySleepLocations().catch(console.error);
