const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function queryMedications() {
  const snapshot = await db.collection('Baby').get();

  const labelCount = {};
  const commentCount = {};
  let total = 0;
  let noLabel = 0;

  for (const babyDoc of snapshot.docs) {
    const tasks = babyDoc.data().tasks ?? [];
    const healthTasks = tasks.filter(t => t.id === 2);
    total += healthTasks.length;

    for (const task of healthTasks) {
      const raw = (task.label ?? task.labelTask ?? '').toString().trim().toLowerCase();
      const comment = (task.comment ?? '').toString().trim().toLowerCase();

      if (!raw || raw === '0') {
        noLabel++;
      } else {
        labelCount[raw] = (labelCount[raw] ?? 0) + 1;
      }

      if (comment) {
        commentCount[comment] = (commentCount[comment] ?? 0) + 1;
      }
    }
  }

  console.log(`\n💊 Health tasks total: ${total}`);
  console.log(`❌ No label:          ${noLabel} (${Math.round(noLabel / total * 100)}%)\n`);

  console.log('── Labels (médicaments saisis) ──────────────────');
  const sortedLabels = Object.entries(labelCount).sort((a, b) => b[1] - a[1]);
  for (const [label, count] of sortedLabels.slice(0, 40)) {
    console.log(`  ${String(count).padStart(4)}x  ${label}`);
  }

  if (Object.keys(commentCount).length > 0) {
    console.log('\n── Commentaires fréquents ───────────────────────');
    const sortedComments = Object.entries(commentCount).sort((a, b) => b[1] - a[1]);
    for (const [comment, count] of sortedComments.slice(0, 20)) {
      console.log(`  ${String(count).padStart(4)}x  ${comment}`);
    }
  }
}

queryMedications().catch(console.error);
