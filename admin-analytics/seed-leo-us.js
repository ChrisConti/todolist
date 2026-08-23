// seed-leo-us.js
// Crée le bébé Léo pour bardou.delphine@gmail.com (si absent) et injecte
// 7 jours de données en unités américaines (oz pour les biberons, °F pour la température).
// Nettoyer : node seed-leo-us.js --clean

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BABY_CODE    = 'BC8BVB';   // vrai Léo de bardou.delphine@gmail.com
const CLEAN        = process.argv.includes('--clean');
const SEED_PREFIX  = 'seed_us_';

const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randf = (min, max, dec = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const pad   = n => String(n).padStart(2, '0');
const uid   = tag => `${SEED_PREFIX}${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function dateStr(date, h, m = 0) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.toISOString().split('T')[0]} ${pad(h)}:${pad(m)}:00`;
}

// Quantités typiques américaines
// Biberons : 2–6 oz par boire (nourrisson ~3 mois)
// Température : °F — normale 98.6°F, fièvre > 100.4°F

function generateDay(date) {
  const tasks = [];
  const base  = new Date(date).toISOString().split('T')[0];

  // ── Biberons (id=0) : 5-6 par jour, 3.0–6.0 oz (typique USA nourrisson) ───
  const bottleTimes = [6, 9, 12, 15, 18, 21].sort(() => Math.random() - 0.5).slice(0, rand(5, 6));
  for (const h of bottleTimes) {
    tasks.push({
      taskId: uid(`bib_${base}_${h}`),
      id: 0,
      date: dateStr(date, h, rand(0, 40)),
      label: String(randf(3.0, 6.0, 1)),
    });
  }

  // ── Couches (id=1) : 6-8 par jour ─────────────────────────────────────────
  const diaperTimes = [7, 9, 11, 13, 15, 17, 19, 21, 23].sort(() => Math.random() - 0.5).slice(0, rand(6, 8));
  for (const h of diaperTimes) {
    tasks.push({
      taskId:     uid(`couche_${base}_${h}`),
      id:         1,
      date:       dateStr(date, h, rand(0, 50)),
      diaperType: rand(0, 2),
    });
  }

  // ── Sommeil (id=3) : 1 nuit + 1-2 siestes ─────────────────────────────────
  tasks.push({
    taskId:    uid(`nuit_${base}`),
    id:        3,
    date:      dateStr(date, rand(20, 22), rand(0, 45)),
    label:     String(rand(360, 540)),
    sleepType: 'night',
  });
  tasks.push({
    taskId:    uid(`sieste1_${base}`),
    id:        3,
    date:      dateStr(date, rand(9, 10), rand(0, 30)),
    label:     String(rand(40, 90)),
    sleepType: 'nap',
  });
  if (Math.random() > 0.4) {
    tasks.push({
      taskId:    uid(`sieste2_${base}`),
      id:        3,
      date:      dateStr(date, rand(13, 15), rand(0, 30)),
      label:     String(rand(30, 60)),
      sleepType: 'nap',
    });
  }

  // ── Température (id=4) : 0-2 par jour, en °F ──────────────────────────────
  if (Math.random() > 0.5) {
    const tempF = randf(98.2, 100.8, 1);   // normale ~98.6°F, légère fièvre possible
    tasks.push({
      taskId: uid(`thermo_${base}`),
      id:     4,
      date:   dateStr(date, rand(8, 20), rand(0, 45)),
      label:  String(tempF),
    });
    // Double mesure si fièvre
    if (tempF > 100.4 && Math.random() > 0.5) {
      tasks.push({
        taskId: uid(`thermo2_${base}`),
        id:     4,
        date:   dateStr(date, rand(18, 22), rand(0, 45)),
        label:  String(randf(99.5, 102.5, 1)),
      });
    }
  }

  return tasks;
}

async function run() {
  console.log(`\n🔍 Recherche bébé Léo (code: ${BABY_CODE})`);

  const snap = await db.collection('Baby').where('id', '==', BABY_CODE).get();
  if (snap.empty) {
    console.error(`❌ Aucun bébé trouvé avec code "${BABY_CODE}"`);
    process.exit(1);
  }
  const babyRef  = snap.docs[0].ref;
  const babyData = snap.docs[0].data();
  console.log(`✅ Bébé trouvé : ${babyData.name ?? '(sans nom)'} (${babyData.birthDate}) — ${(babyData.tasks??[]).length} tâches existantes`);

  const existingTasks = babyData.tasks ?? [];

  if (CLEAN) {
    const cleaned = existingTasks.filter(t => !String(t.taskId ?? '').startsWith(SEED_PREFIX));
    await babyRef.update({ tasks: cleaned });
    console.log(`🧹 ${existingTasks.length - cleaned.length} tâches de test supprimées.\n`);
    return;
  }

  // Générer 7 jours
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
    temperature:newTasks.filter(t => t.id === 4).length,
  };

  console.log(`\n✅ ${newTasks.length} tâches injectées sur 7 jours (unités US) :`);
  console.log(`   🍼 Biberon:     ${counts.biberon}  (valeurs en oz)`);
  console.log(`   👶 Couches:     ${counts.couche}`);
  console.log(`   😴 Sommeil:     ${counts.sommeil}`);
  console.log(`   🌡  Température: ${counts.temperature}  (valeurs en °F)`);
  console.log(`\n   Pour nettoyer : node seed-leo-us.js --clean\n`);
}

run().catch(err => { console.error(err); process.exit(1); });
