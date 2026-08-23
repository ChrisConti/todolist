const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function queryBiberon() {
  const snapshot = await db.collection('Baby').get();

  const quantities = {};
  const milkTypes = {};
  const byHour = Array(24).fill(0);
  const ranges = { '0-49': 0, '50-79': 0, '80-99': 0, '100-119': 0, '120-149': 0, '150-179': 0, '180-209': 0, '210+': 0 };
  let total = 0;
  let noQty = 0;
  let totalMl = 0;
  const roundedValues = {};

  for (const babyDoc of snapshot.docs) {
    const tasks = babyDoc.data().tasks ?? [];
    const biberonTasks = tasks.filter(t => t.id === 0);
    total += biberonTasks.length;

    for (const task of biberonTasks) {
      // Quantity
      const raw = task.label ?? task.labelTask ?? '';
      const ml = parseInt(raw);

      if (!ml || isNaN(ml)) {
        noQty++;
      } else {
        totalMl += ml;
        quantities[ml] = (quantities[ml] ?? 0) + 1;

        // Rounded to nearest 10
        const r = Math.round(ml / 10) * 10;
        roundedValues[r] = (roundedValues[r] ?? 0) + 1;

        // Ranges
        if (ml < 50) ranges['0-49']++;
        else if (ml < 80) ranges['50-79']++;
        else if (ml < 100) ranges['80-99']++;
        else if (ml < 120) ranges['100-119']++;
        else if (ml < 150) ranges['120-149']++;
        else if (ml < 180) ranges['150-179']++;
        else if (ml < 210) ranges['180-209']++;
        else ranges['210+']++;
      }

      // Milk type
      const mt = task.milkType ?? 'non renseigné';
      milkTypes[mt] = (milkTypes[mt] ?? 0) + 1;

      // Hour of day
      const date = task.date?.toDate ? task.date.toDate() : new Date(task.date);
      if (!isNaN(date)) byHour[date.getHours()]++;
    }
  }

  const withQty = total - noQty;
  const avgMl = Math.round(totalMl / withQty);

  console.log(`\n🍼 Biberons total : ${total}`);
  console.log(`❌ Sans quantité  : ${noQty} (${Math.round(noQty/total*100)}%)`);
  console.log(`📊 Moyenne        : ${avgMl} ml\n`);

  console.log('── Répartition par tranche ──────────────────────');
  for (const [range, count] of Object.entries(ranges)) {
    const pct = Math.round(count / withQty * 100);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${range.padEnd(10)} ${String(count).padStart(5)} (${String(pct).padStart(2)}%)  ${bar}`);
  }

  console.log('\n── Top 20 quantités exactes (ml) ───────────────');
  const sortedQty = Object.entries(quantities).sort((a, b) => b[1] - a[1]);
  for (const [ml, count] of sortedQty.slice(0, 20)) {
    const pct = Math.round(count / withQty * 100);
    console.log(`  ${String(ml).padStart(4)} ml   ${String(count).padStart(5)}x  (${pct}%)`);
  }

  console.log('\n── Top quantités arrondies à 10ml ──────────────');
  const sortedRounded = Object.entries(roundedValues).sort((a, b) => b[1] - a[1]);
  for (const [ml, count] of sortedRounded.slice(0, 15)) {
    const pct = Math.round(count / withQty * 100);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${String(ml).padStart(4)} ml   ${String(count).padStart(5)}x  (${pct}%)  ${bar}`);
  }

  console.log('\n── Type de lait ─────────────────────────────────');
  for (const [type, count] of Object.entries(milkTypes).sort((a, b) => b[1] - a[1])) {
    const pct = Math.round(count / total * 100);
    console.log(`  ${type.padEnd(16)} ${String(count).padStart(5)} (${pct}%)`);
  }

  console.log('\n── Heures de la journée ─────────────────────────');
  const maxH = Math.max(...byHour);
  for (let h = 0; h < 24; h++) {
    const count = byHour[h];
    const pct = Math.round(count / total * 100);
    const bar = '█'.repeat(Math.round(count / maxH * 20));
    console.log(`  ${String(h).padStart(2)}h  ${String(count).padStart(5)} (${String(pct).padStart(2)}%)  ${bar}`);
  }
}

queryBiberon().catch(console.error);
