// seed-all-categories.js
// Injecte des données réalistes sur 7 jours pour toutes les catégories.
// Usage : node seed-all-categories.js [BABY_CODE]
// Nettoyer : node seed-all-categories.js [BABY_CODE] --clean

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BABY_CODE   = process.argv[2] ?? 'DBFYQ8';
const CLEAN       = process.argv.includes('--clean');
const SEED_PREFIX = 'seed_all_';

const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randf = (min, max, dec = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const pad   = n => String(n).padStart(2, '0');
const uid   = tag => `${SEED_PREFIX}${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function dateStr(date, h, m = 0) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.toISOString().split('T')[0]} ${pad(h)}:${pad(m)}:00`;
}

function generateDay(date) {
  const tasks = [];
  const base  = new Date(date).toISOString().split('T')[0];

  // ── Biberons (id=0) : 5-7 par jour, 80-230ml ─────────────────────────────
  const bottleTimes = [6, 9, 12, 15, 18, 21].sort(() => Math.random() - 0.5).slice(0, rand(5, 7));
  for (const h of bottleTimes) {
    tasks.push({
      taskId: uid(`bib_${base}_${h}`),
      id: 0,
      date: dateStr(date, h, rand(0, 45)),
      label: String(rand(80, 230)),
    });
  }

  // ── Couches (id=1) : 6-9 par jour ────────────────────────────────────────
  const diaperTimes = [7, 9, 11, 13, 15, 17, 19, 21, 23].sort(() => Math.random() - 0.5).slice(0, rand(6, 9));
  for (const h of diaperTimes) {
    tasks.push({
      taskId:     uid(`couche_${base}_${h}`),
      id:         1,
      date:       dateStr(date, h, rand(0, 50)),
      diaperType: rand(0, 2),
    });
  }

  // ── Sommeil (id=3) : 1 nuit + 1-2 siestes ────────────────────────────────
  // Nuit (démarre la veille au soir)
  tasks.push({
    taskId: uid(`nuit_${base}`),
    id:     3,
    date:   dateStr(date, rand(20, 22), rand(0, 45)),
    label:  String(rand(420, 600)),
    sleepType: 'night',
  });
  // Sieste 1
  tasks.push({
    taskId: uid(`sieste1_${base}`),
    id:     3,
    date:   dateStr(date, rand(9, 10), rand(0, 30)),
    label:  String(rand(45, 90)),
    sleepType: 'nap',
  });
  // Sieste 2 (pas toujours)
  if (Math.random() > 0.35) {
    tasks.push({
      taskId: uid(`sieste2_${base}`),
      id:     3,
      date:   dateStr(date, rand(13, 15), rand(0, 30)),
      label:  String(rand(30, 75)),
      sleepType: 'nap',
    });
  }

  // ── Allaitement (id=5) : 4-7 par jour ────────────────────────────────────
  // boobLeft/boobRight en secondes (format réel de l'app), côté : 0=G, 1=D, 2=les deux
  const allaitTimes = [6, 8, 11, 14, 17, 20, 23].sort(() => Math.random() - 0.5).slice(0, rand(4, 7));
  for (const h of allaitTimes) {
    const side = rand(0, 2);
    tasks.push({
      taskId:    uid(`allait_${base}_${h}`),
      id:        5,
      date:      dateStr(date, h, rand(0, 45)),
      boobLeft:  (side === 0 || side === 2) ? rand(5, 20) * 60 : 0,
      boobRight: (side === 1 || side === 2) ? rand(5, 20) * 60 : 0,
      breastfeedingMode: 'manual',
    });
  }

  // ── Température (id=4) : 0-2 par jour ────────────────────────────────────
  if (Math.random() > 0.5) {
    const temp = randf(36.8, 38.4);
    tasks.push({
      taskId: uid(`thermo_${base}`),
      id:     4,
      date:   dateStr(date, rand(8, 20), rand(0, 45)),
      label:  String(temp),
    });
    if (temp > 38.0 && Math.random() > 0.5) {
      tasks.push({
        taskId: uid(`thermo2_${base}`),
        id:     4,
        date:   dateStr(date, rand(18, 22), rand(0, 45)),
        label:  String(randf(37.5, 39.2)),
      });
    }
  }

  return tasks;
}

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
  console.log(`✅ Bébé trouvé : ${babyData.name ?? '(sans nom)'}`);

  const existingTasks = babyData.tasks ?? [];

  if (CLEAN) {
    const cleaned = existingTasks.filter(t => !String(t.taskId ?? '').startsWith(SEED_PREFIX));
    await babyRef.update({ tasks: cleaned });
    console.log(`🧹 ${existingTasks.length - cleaned.length} tâches de test supprimées.\n`);
    return;
  }

  const newTasks = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    newTasks.push(...generateDay(d));
  }

  const withoutOld = existingTasks.filter(t => !String(t.taskId ?? '').startsWith(SEED_PREFIX));
  await babyRef.update({ tasks: [...withoutOld, ...newTasks] });

  const counts = {
    biberon:    newTasks.filter(t => t.id === 0).length,
    couche:     newTasks.filter(t => t.id === 1).length,
    sommeil:    newTasks.filter(t => t.id === 3).length,
    allaitement:newTasks.filter(t => t.id === 5).length,
    temperature:newTasks.filter(t => t.id === 4).length,
  };
  console.log(`\n✅ ${newTasks.length} tâches injectées sur 7 jours :`);
  console.log(`   🍼 Biberon:      ${counts.biberon}`);
  console.log(`   👶 Couches:      ${counts.couche}`);
  console.log(`   😴 Sommeil:      ${counts.sommeil}`);
  console.log(`   🤱 Allaitement:  ${counts.allaitement}`);
  console.log(`   🌡  Température:  ${counts.temperature}`);
  console.log(`\n   Pour nettoyer : node seed-all-categories.js ${BABY_CODE} --clean\n`);
}

run().catch(err => { console.error(err); process.exit(1); });
