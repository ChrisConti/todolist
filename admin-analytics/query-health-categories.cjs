const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CARE_KEYWORDS = ['bain', 'lavage nez', 'lavage', 'nez', 'soin', 'soins', 'cordon', 'dents', 'gencive', 'crème', 'creme', 'onguent'];
const VITAMIN_KEYWORDS = ['vitamine', 'vitamin', 'vit d', 'zyma', 'vitamina'];
const MED_KEYWORDS = ['gaviscon', 'doliprane', 'dafalgan', 'paracetamol', 'inexium', 'omeprazol', 'aspegic', 'aspirine', 'probiotique', 'babybiane', 'biogaia', 'pediakid', 'camilia', 'mycostatine', 'keppra', 'suppo', 'médicament', 'medicament', 'colique'];

function classify(label) {
  const l = label.toLowerCase();
  if (MED_KEYWORDS.some(k => l.includes(k))) return 'médicament';
  if (VITAMIN_KEYWORDS.some(k => l.includes(k))) return 'vitamine';
  if (l.includes('bain')) return 'bain';
  if (l.includes('nez') || l.includes('drp') || l.includes('lavage')) return 'lavage nez';
  if (l.includes('cordon')) return 'soins cordon';
  if (l.includes('dent') || l.includes('genciv')) return 'dents';
  if (l.includes('soin') || l.includes('creme') || l.includes('crème')) return 'soins';
  return 'autre';
}

async function queryHealthCategories() {
  const snapshot = await db.collection('Baby').get();

  const categories = {};
  const uncategorized = {};
  let total = 0;

  for (const babyDoc of snapshot.docs) {
    const tasks = babyDoc.data().tasks ?? [];
    for (const task of tasks.filter(t => t.id === 2)) {
      const raw = (task.label ?? '').toString().trim();
      if (!raw || raw === '0') continue;
      total++;
      const cat = classify(raw);
      categories[cat] = (categories[cat] ?? 0) + 1;
      if (cat === 'autre') {
        const key = raw.toLowerCase();
        uncategorized[key] = (uncategorized[key] ?? 0) + 1;
      }
    }
  }

  console.log(`\n💊 Total tâches santé (avec label): ${total}\n`);
  console.log('── Par catégorie ─────────────────────────────────');
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    const pct = Math.round(count / total * 100);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${cat.padEnd(18)} ${String(count).padStart(4)} (${String(pct).padStart(2)}%)  ${bar}`);
  }

  console.log('\n── "Autre" détail (top 20) ───────────────────────');
  const sortedOther = Object.entries(uncategorized).sort((a, b) => b[1] - a[1]);
  for (const [label, count] of sortedOther.slice(0, 20)) {
    console.log(`  ${String(count).padStart(4)}x  ${label}`);
  }
}

queryHealthCategories().catch(console.error);
