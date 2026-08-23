const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function queryTemperature() {
  const snapshot = await db.collection('Baby').get();

  const values = [];
  const rawLabels = {};
  const byHour = Array(24).fill(0);
  const ranges = { '<36': 0, '36-36.9': 0, '37-37.9': 0, '38-38.9': 0, '39-39.9': 0, '≥40': 0 };
  let noValue = 0;
  let withComment = 0;
  const commentSamples = [];

  for (const babyDoc of snapshot.docs) {
    const tasks = babyDoc.data().tasks ?? [];
    for (const task of tasks.filter(t => t.id === 4)) {
      const raw = (task.label ?? '').toString().trim();
      const comment = (task.comment ?? '').toString().trim();

      if (!raw || raw === '0') { noValue++; continue; }

      // Normalize: replace comma with dot
      const normalized = raw.replace(',', '.');
      const val = parseFloat(normalized);

      rawLabels[raw] = (rawLabels[raw] ?? 0) + 1;

      if (!isNaN(val) && val > 20 && val < 50) {
        values.push(val);
        if (val < 36) ranges['<36']++;
        else if (val < 37) ranges['36-36.9']++;
        else if (val < 38) ranges['37-37.9']++;
        else if (val < 39) ranges['38-38.9']++;
        else if (val < 40) ranges['39-39.9']++;
        else ranges['≥40']++;

        const date = task.date?.toDate ? task.date.toDate() : new Date(task.date);
        if (!isNaN(date)) byHour[date.getHours()]++;
      }

      if (comment && comment !== '0') {
        withComment++;
        if (commentSamples.length < 80) commentSamples.push({ val: raw, comment });
      }
    }
  }

  const total = values.length + noValue;
  const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 'N/A';
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)].toFixed(1) : 'N/A';
  const min = sorted.length ? sorted[0].toFixed(1) : 'N/A';
  const max = sorted.length ? sorted[sorted.length - 1].toFixed(1) : 'N/A';

  console.log(`\n🌡️  Température — analyse`);
  console.log(`   Total mesures     : ${total}`);
  console.log(`   Sans valeur       : ${noValue} (${Math.round(noValue/total*100)}%)`);
  console.log(`   Avec valeur       : ${values.length} (${Math.round(values.length/total*100)}%)`);
  console.log(`   Avec commentaire  : ${withComment} (${Math.round(withComment/total*100)}%)`);
  console.log(`   Moyenne           : ${avg} °C`);
  console.log(`   Médiane           : ${median} °C`);
  console.log(`   Min / Max         : ${min} / ${max} °C\n`);

  console.log('── Répartition par plage ─────────────────────────');
  for (const [range, count] of Object.entries(ranges)) {
    const pct = Math.round(count / values.length * 100);
    const bar = '█'.repeat(Math.round(pct / 3));
    console.log(`  ${range.padEnd(10)} ${String(count).padStart(5)} (${String(pct).padStart(2)}%)  ${bar}`);
  }

  console.log('\n── Top valeurs saisies (brut) ────────────────────');
  const topRaw = Object.entries(rawLabels).sort((a, b) => b[1] - a[1]).slice(0, 25);
  for (const [val, count] of topRaw) {
    const bar = '█'.repeat(Math.min(Math.round(count / 2), 30));
    console.log(`  ${val.padEnd(8)} ${String(count).padStart(5)}x  ${bar}`);
  }

  console.log('\n── Distribution 0.1°C (37–40°C) ─────────────────');
  const buckets = {};
  for (const v of values) {
    if (v >= 37 && v < 40.5) {
      const b = (Math.round(v * 10) / 10).toFixed(1);
      buckets[b] = (buckets[b] ?? 0) + 1;
    }
  }
  const maxB = Math.max(...Object.values(buckets));
  for (const [b, count] of Object.entries(buckets).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
    const bar = '█'.repeat(Math.round(count / maxB * 25));
    console.log(`  ${b}°C  ${String(count).padStart(4)}x  ${bar}`);
  }

  console.log('\n── Heures de la journée ─────────────────────────');
  const maxH = Math.max(...byHour);
  for (let h = 0; h < 24; h++) {
    const count = byHour[h];
    const pct = Math.round(count / values.length * 100);
    const bar = '█'.repeat(Math.round(count / maxH * 20));
    console.log(`  ${String(h).padStart(2)}h  ${String(count).padStart(4)} (${String(pct).padStart(2)}%)  ${bar}`);
  }

  console.log('\n── Commentaires (50 exemples) ────────────────────');
  const unique = [...new Map(commentSamples.map(s => [s.comment.toLowerCase(), s])).values()];
  for (const { val, comment } of unique.slice(0, 50)) {
    console.log(`  ${val.padEnd(6)} → ${comment}`);
  }
}

queryTemperature().catch(console.error);
