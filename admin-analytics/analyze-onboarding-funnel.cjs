// Funnel onboarding : signup → bébé → 1re tâche → 3+ tâches, par cohorte mensuelle
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TEST_EMAILS = new Set(['android@android.com', 'test@apple.com']);

function toDate(v) {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? null : d; }
  return null;
}
const monthKey = d => d.toISOString().slice(0, 7);
// 5 derniers mois glissants (mois courant inclus) — évite de figer la fenêtre à chaque review
const MONTHS = Array.from({ length: 5 }, (_, i) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - (4 - i));
  return monthKey(d);
});

async function main() {
  const [usersSnap, babiesSnap] = await Promise.all([
    db.collection('Users').get(),
    db.collection('Baby').get(),
  ]);

  const testUserIds = new Set();
  usersSnap.docs.forEach(d => { if (TEST_EMAILS.has(d.data().email)) testUserIds.add(d.id); });

  const babies = babiesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(b => !b.admin || !testUserIds.has(b.admin));

  const memberOf = new Map();   // uid -> babies where member
  const adminOf = new Map();    // uid -> babies where admin
  babies.forEach(b => {
    (b.user || []).forEach(uid => {
      if (!memberOf.has(uid)) memberOf.set(uid, []);
      memberOf.get(uid).push(b);
    });
    if (b.admin) {
      if (!adminOf.has(b.admin)) adminOf.set(b.admin, []);
      adminOf.get(b.admin).push(b);
    }
  });

  // --- Funnel users par cohorte ---
  console.log('=== FUNNEL USERS (cohorte = mois de création du compte) ===');
  const noBabyUsers = [];
  MONTHS.forEach(mk => {
    let total = 0, created = 0, joined = 0, none = 0, deleted = 0;
    usersSnap.docs.forEach(doc => {
      const u = { userId: doc.id, ...doc.data() };
      if (TEST_EMAILS.has(u.email)) return;
      const d = toDate(u.creationDate);
      if (!d || monthKey(d) !== mk) return;
      total++;
      if (u.deleted) deleted++;
      if (adminOf.has(u.userId)) created++;
      else if (memberOf.has(u.userId)) joined++;
      else { none++; noBabyUsers.push({ ...u, cohort: mk, signupDate: d }); }
    });
    console.log(`${mk}  signups:${total}  créé bébé:${created} (${(100*created/total).toFixed(0)}%)  rejoint:${joined} (${(100*joined/total).toFixed(0)}%)  AUCUN bébé:${none} (${(100*none/total).toFixed(0)}%)  [dont deleted:${deleted}]`);
  });

  // --- Profil des users sans bébé ---
  console.log('\n=== USERS SANS BÉBÉ (avril→juillet) — profil ===');
  const byProvider = {}, byPlatform = {};
  noBabyUsers.forEach(u => {
    const p = u.provider || 'email';
    byProvider[p] = (byProvider[p] || 0) + 1;
    const pl = (u.platform || u.signupPlatform || 'unknown').toLowerCase();
    byPlatform[pl] = (byPlatform[pl] || 0) + 1;
  });
  console.log('par provider:', JSON.stringify(byProvider));
  console.log('par platform:', JSON.stringify(byPlatform));
  console.log('deleted:', noBabyUsers.filter(u => u.deleted).length, '/', noBabyUsers.length);

  // --- Funnel bébés par cohorte (mois de création du bébé) ---
  console.log('\n=== FUNNEL BÉBÉS (cohorte = mois de création du bébé) ===');
  MONTHS.forEach(mk => {
    const cohort = babies.filter(b => {
      const d = toDate(b.createdDate) || toDate(b.CreatedDate);
      return d && monthKey(d) === mk;
    });
    const n = cohort.length;
    if (!n) return;
    const zero = cohort.filter(b => !(b.tasks || []).length).length;
    const t12 = cohort.filter(b => { const c = (b.tasks || []).length; return c >= 1 && c <= 2; }).length;
    const t3plus = cohort.filter(b => (b.tasks || []).length >= 3).length;
    const t10plus = cohort.filter(b => (b.tasks || []).length >= 10).length;
    console.log(`${mk}  bébés:${n}  0 tâche:${zero} (${(100*zero/n).toFixed(0)}%)  1-2:${t12} (${(100*t12/n).toFixed(0)}%)  3+:${t3plus} (${(100*t3plus/n).toFixed(0)}%)  10+:${t10plus} (${(100*t10plus/n).toFixed(0)}%)`);
  });

  // --- Timing 1re tâche vs création bébé (cohortes avril→juillet) ---
  console.log('\n=== DÉLAI création bébé → 1re tâche (bébés avec ≥1 tâche, avril→juillet) ===');
  const delays = [];
  babies.forEach(b => {
    const bd = toDate(b.createdDate) || toDate(b.CreatedDate);
    if (!bd || !MONTHS.includes(monthKey(bd))) return;
    const first = (b.tasks || []).map(t => toDate(t.date)).filter(Boolean).sort((a, b2) => a - b2)[0];
    if (first) delays.push((first - bd) / 36e5); // heures
  });
  delays.sort((a, b) => a - b);
  const pct = p => delays[Math.floor(delays.length * p)]?.toFixed(1);
  const within = h => (100 * delays.filter(d => d <= h).length / delays.length).toFixed(0);
  console.log(`n=${delays.length}  ≤1h:${within(1)}%  ≤24h:${within(24)}%  ≤72h:${within(72)}%  médiane:${pct(0.5)}h  p75:${pct(0.75)}h`);

  // --- Les bébés 0 tâche : anciens ou récents ? multi-parent ? ---
  console.log('\n=== BÉBÉS 0 TÂCHE (avril→juillet) — détail ===');
  const zeros = babies.filter(b => {
    const d = toDate(b.createdDate) || toDate(b.CreatedDate);
    return d && MONTHS.includes(monthKey(d)) && !(b.tasks || []).length;
  });
  const ageDays = zeros.map(b => {
    const d = toDate(b.createdDate) || toDate(b.CreatedDate);
    return Math.floor((Date.now() - d) / 864e5);
  }).sort((a, b) => a - b);
  console.log(`n=${zeros.length}  âge du compte (jours) min:${ageDays[0]} médiane:${ageDays[Math.floor(ageDays.length/2)]} max:${ageDays[ageDays.length-1]}`);
  console.log('avec birthDate renseignée:', zeros.filter(b => b.birthDate).length);
  console.log('multi-parent:', zeros.filter(b => (b.user || []).length > 1).length);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
