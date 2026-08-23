const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CATEGORIES = { 0: 'Biberon', 1: 'Couche', 2: 'Santé', 3: 'Sommeil', 4: 'Température', 5: 'Allaitement' };

async function queryComments() {
  const snapshot = await db.collection('Baby').get();

  const byCategory = {};
  const commentSamples = {};
  const wordFreq = {};
  let totalTasks = 0;
  let totalWithComment = 0;

  for (const babyDoc of snapshot.docs) {
    const tasks = babyDoc.data().tasks ?? [];
    for (const task of tasks) {
      const cat = CATEGORIES[task.id] ?? 'Inconnu';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, withComment: 0 };
      if (!commentSamples[cat]) commentSamples[cat] = [];

      byCategory[cat].total++;
      totalTasks++;

      const comment = (task.comment ?? task.note ?? '').toString().trim();
      if (comment && comment !== '0' && comment !== 'null') {
        byCategory[cat].withComment++;
        totalWithComment++;
        if (commentSamples[cat].length < 60) commentSamples[cat].push(comment);

        // Word frequency (min 3 chars)
        comment.toLowerCase().split(/\s+/).forEach(w => {
          const word = w.replace(/[^a-zàâäéèêëîïôùûüç]/g, '');
          if (word.length >= 3) wordFreq[word] = (wordFreq[word] ?? 0) + 1;
        });
      }
    }
  }

  console.log(`\n💬 Commentaires — analyse globale`);
  console.log(`   Total tâches     : ${totalTasks.toLocaleString()}`);
  console.log(`   Avec commentaire : ${totalWithComment.toLocaleString()} (${Math.round(totalWithComment/totalTasks*100)}%)\n`);

  console.log('── Par catégorie ─────────────────────────────────────');
  const sorted = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  for (const [cat, { total, withComment }] of sorted) {
    const pct = Math.round(withComment / total * 100);
    const bar = '█'.repeat(Math.round(pct / 4));
    console.log(`  ${cat.padEnd(14)} ${String(withComment).padStart(5)} / ${String(total).padStart(6)}  (${String(pct).padStart(2)}%)  ${bar}`);
  }

  console.log('\n── Top 40 mots dans les commentaires ────────────────');
  const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 40);
  for (const [word, count] of topWords) {
    console.log(`  ${String(count).padStart(5)}x  ${word}`);
  }

  console.log('\n── Exemples de commentaires par catégorie ───────────');
  for (const [cat, samples] of Object.entries(commentSamples)) {
    if (samples.length === 0) continue;
    console.log(`\n  [${cat}] (${samples.length} exemples)`);
    // Dédoublonner et trier par longueur pour voir la diversité
    const unique = [...new Set(samples.map(s => s.toLowerCase()))].sort((a, b) => a.length - b.length);
    for (const s of unique.slice(0, 25)) {
      console.log(`    · ${s}`);
    }
  }
}

queryComments().catch(console.error);
