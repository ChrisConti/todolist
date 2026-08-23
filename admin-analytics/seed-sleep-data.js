// seed-sleep-data.js
// Injecte des données de sommeil de test sur 90 jours pour un bébé donné.
// Usage : node seed-sleep-data.js [BABY_CODE]
// Nettoyer ensuite : node seed-sleep-data.js [BABY_CODE] --clean

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BABY_CODE = process.argv[2] ?? 'DBFYQ8';
const CLEAN     = process.argv.includes('--clean');
const DAYS      = 90;
const SEED_PREFIX = 'seed_sleep_';

// ── helpers ──────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad  = n => String(n).padStart(2, '0');

function dateStr(d, h, m = 0) {
  const iso = new Date(d.getTime());
  iso.setHours(0, 0, 0, 0);
  return `${iso.toISOString().split('T')[0]} ${pad(h)}:${pad(m)}:00`;
}

function uid(tag) {
  return `${SEED_PREFIX}${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── génération d'une journée ──────────────────────────────────────────────────
// OMS 4-11 mois : total ≥ 720 min/jour
// Bonne nuit : 480-600 min (8-10h)   +  siestes 120-180 min → ≥ 720 ✅
// Nuit courte : 300-420 min (5-7h)   +  siestes 60-120 min  →  < 720 ❌

function generateDay(date, scenario) {
  const tasks = [];
  const base  = date.toISOString().split('T')[0];

  if (scenario === 'no_data') return tasks;

  const nightStart = rand(19, 21);
  const nightMin   = scenario === 'good' ? rand(480, 600) : rand(300, 420);
  tasks.push({
    taskId:    uid(`night_${base}`),
    id:        3,
    date:      dateStr(date, nightStart, rand(0, 45)),
    label:     String(nightMin),
    sleepType: 'night',
  });

  const napCount = scenario === 'good' ? rand(1, 2) : rand(0, 1);
  const napTimes = [
    { h: rand(9, 10),  dur: rand(45, 90)  },
    { h: rand(13, 15), dur: rand(60, 120) },
  ];
  for (let i = 0; i < napCount; i++) {
    tasks.push({
      taskId:    uid(`nap${i}_${base}`),
      id:        3,
      date:      dateStr(date, napTimes[i].h, rand(0, 30)),
      label:     String(napTimes[i].dur),
      sleepType: 'nap',
    });
  }

  return tasks;
}

// ── répartition sur 90 jours ──────────────────────────────────────────────────
// ~60 % bons jours, ~25 % mauvais, ~15 % pas de données

function pickScenario() {
  const r = Math.random();
  if (r < 0.60) return 'good';
  if (r < 0.85) return 'bad';
  return 'no_data';
}

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔍 Recherche bébé : ${BABY_CODE}`);

  const snap = await db.collection('Baby').where('id', '==', BABY_CODE).get();
  if (snap.empty) {
    console.error(`❌ Aucun bébé trouvé avec id == "${BABY_CODE}"`);
    process.exit(1);
  }

  const babyDoc  = snap.docs[0];
  const babyRef  = babyDoc.ref;
  const babyData = babyDoc.data();
  console.log(`✅ Bébé trouvé : ${babyData.name ?? '(sans nom)'} — doc ${babyDoc.id}`);

  const existingTasks = babyData.tasks ?? [];

  if (CLEAN) {
    const cleaned = existingTasks.filter(t => !String(t.taskId ?? '').startsWith(SEED_PREFIX));
    const removed = existingTasks.length - cleaned.length;
    await babyRef.update({ tasks: cleaned });
    console.log(`🧹 ${removed} tâches de test supprimées. ${cleaned.length} tâches réelles conservées.`);
    return;
  }

  // Générer les nouvelles tâches
  const newTasks = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0); // midi pour éviter les problèmes de timezone
    newTasks.push(...generateDay(d, pickScenario()));
  }

  // Enlever d'éventuelles anciennes seeds avant de réinjecter
  const withoutOldSeeds = existingTasks.filter(t => !String(t.taskId ?? '').startsWith(SEED_PREFIX));
  const merged = [...withoutOldSeeds, ...newTasks];

  await babyRef.update({ tasks: merged });

  const good    = newTasks.filter(t => t.sleepType === 'night').length;
  const naps    = newTasks.filter(t => t.sleepType === 'nap').length;
  console.log(`\n✅ ${newTasks.length} tâches injectées (${good} nuits + ${naps} siestes) sur ${DAYS} jours`);
  console.log(`   Pour nettoyer : node seed-sleep-data.js ${BABY_CODE} --clean\n`);
}

run().catch(err => { console.error(err); process.exit(1); });
