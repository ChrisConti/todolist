// seed-sleep-round.js
// Remplace toutes les tâches sommeil seedées par des sessions aux heures rondes.
// Toutes les sessions démarrent à 00:30 (même jour) pour éviter le split cross-midnight.
// Usage : node seed-sleep-round.js BC8BVB

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const BABY_CODE   = process.argv[2] ?? 'BC8BVB';
const SEED_PREFIX = 'seed_all_';
const pad = n => String(n).padStart(2, '0');

function dateStr(year, month, day, h, m = 0) {
  return `${year}-${pad(month)}-${pad(day)} ${pad(h)}:${pad(m)}:00`;
}

// Plan : toutes les sessions démarrent dans le même jour calendaire (00:30)
// → getSleepMinutesForDay calcule un overlap 100 % dans le jour visé → heures rondes garanties
//
// Date       Nuit      Nap1  Nap2  Total
// May 13    480 min   75    45    600 min = 10h
// May 14    420 min   75    45    540 min = 9h
// May 15    510 min   90    60    660 min = 11h
// May 16    480 min   75    45    600 min = 10h
// May 17    480 min   75    45    600 min = 10h
// May 18    510 min   90    60    660 min = 11h
// May 19    510 min   90    60    660 min = 11h
// May 20    420 min   75    45    540 min = 9h

const SLEEP_PLAN = [
  { month: 5, day: 13, night: 480, nap1: 75, nap2: 45 },
  { month: 5, day: 14, night: 420, nap1: 75, nap2: 45 },
  { month: 5, day: 15, night: 510, nap1: 90, nap2: 60 },
  { month: 5, day: 16, night: 480, nap1: 75, nap2: 45 },
  { month: 5, day: 17, night: 480, nap1: 75, nap2: 45 },
  { month: 5, day: 18, night: 510, nap1: 90, nap2: 60 },
  { month: 5, day: 19, night: 510, nap1: 90, nap2: 60 },
  { month: 5, day: 20, night: 420, nap1: 75, nap2: 45 },
];

function buildSleepTasks(year = 2026) {
  const tasks = [];
  for (const { month, day, night, nap1, nap2 } of SLEEP_PLAN) {
    const tag = `${year}-${pad(month)}-${pad(day)}`;
    // Nuit : démarre à 00:30, reste entièrement dans le jour
    tasks.push({
      taskId:    `${SEED_PREFIX}nuit_${tag}`,
      id:        3,
      date:      dateStr(year, month, day, 0, 30),
      label:     String(night),
      sleepType: 'night',
    });
    // Sieste 1 : 10h00
    tasks.push({
      taskId:    `${SEED_PREFIX}sieste1_${tag}`,
      id:        3,
      date:      dateStr(year, month, day, 10, 0),
      label:     String(nap1),
      sleepType: 'nap',
    });
    // Sieste 2 : 14h00
    tasks.push({
      taskId:    `${SEED_PREFIX}sieste2_${tag}`,
      id:        3,
      date:      dateStr(year, month, day, 14, 0),
      label:     String(nap2),
      sleepType: 'nap',
    });
  }
  return tasks;
}

async function run() {
  console.log(`\nRecherche bébé : ${BABY_CODE}`);
  const snap = await db.collection('Baby').where('id', '==', BABY_CODE).get();
  if (snap.empty) {
    console.error(`Aucun bébé trouvé avec id == "${BABY_CODE}"`);
    process.exit(1);
  }

  const babyDoc  = snap.docs[0];
  const babyRef  = babyDoc.ref;
  const babyData = babyDoc.data();
  console.log(`Bébé : ${babyData.name ?? '(sans nom)'}`);

  const existing = babyData.tasks ?? [];

  // Supprimer toutes les tâches sommeil seedées
  const withoutSleepSeed = existing.filter(t => {
    const isSeed = String(t.taskId ?? '').startsWith(SEED_PREFIX);
    const isSleep = t.id === 3;
    return !(isSeed && isSleep);
  });

  const removed = existing.length - withoutSleepSeed.length;
  console.log(`Suppression de ${removed} tâches sommeil seedées`);

  const newSleep = buildSleepTasks(2026);
  const updated  = [...withoutSleepSeed, ...newSleep];

  await babyRef.update({ tasks: updated });

  console.log(`\n${newSleep.length} sessions sommeil injectées :`);
  for (const { month, day, night, nap1, nap2 } of SLEEP_PLAN) {
    const total = night + nap1 + nap2;
    console.log(`  2026-${pad(month)}-${pad(day)}  ${String(total / 60).padStart(4)}h  (nuit ${night}min + ${nap1}min + ${nap2}min)`);
  }
  console.log('');
}

run().catch(err => { console.error(err); process.exit(1); });
