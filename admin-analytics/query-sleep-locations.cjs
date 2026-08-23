const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function querySleepLocations() {
  const snapshot = await db.collection('Baby').get();

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
