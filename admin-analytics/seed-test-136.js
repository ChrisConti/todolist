// seed-test-136.js
// Jeux de données de recette 1.3.6, au format exact écrit par l'app (uid, user, createdBy,
// labelTask…), contrairement aux anciens seed-* qui écrivent des tâches sans uid : l'app
// identifie une tâche par son uid pour la modifier ou la supprimer.
//
// Usage :
//   node seed-test-136.js <CODE_BEBE>                    aperçu, n'écrit rien
//   node seed-test-136.js <CODE_BEBE> --yes              profil « complet » (90 jours)
//   node seed-test-136.js <CODE_BEBE> --profil tirage --yes
//   node seed-test-136.js <CODE_BEBE> --profil lourd --yes
//   node seed-test-136.js <CODE_BEBE> --clean --yes      retire uniquement les tâches de ce script
//
// Profils :
//   complet : 90 jours, toutes catégories — biberons (lait infantile + maternel), couches,
//             santé, sommeil (avec lieu), température, tétées chrono et manuelles, tirages.
//   tirage  : 30 jours, uniquement des tirages et des biberons de lait maternel
//             (mère qui tire exclusivement : onglet Tire-lait et bilan production/consommation).
//   lourd   : 130 jours du profil complet, ~850-900 Ko : la taille des 1 % de bébés les plus
//             lourds en production (~950 Ko), pour mesurer la vitesse d'enregistrement.
//   (complet ≈ 590 Ko ≈ 10 % des bébés les plus lourds ; tirage ≈ 130 Ko ≈ bébé médian)
//
// Les tâches sont attribuées au créateur du bébé (champ admin), comme s'il les avait saisies.
// À n'utiliser que sur un bébé de TEST : le script réécrit le tableau tasks[] du document.

import admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const args = process.argv.slice(2);
const BABY_CODE = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--profil');
const PROFILE = args.includes('--profil') ? args[args.indexOf('--profil') + 1] : 'complet';
const CLEAN = args.includes('--clean');
const CONFIRMED = args.includes('--yes');
const UID_PREFIX = 'seed136-';
const FIRESTORE_LIMIT_KB = 1024;

if (!BABY_CODE || !['complet', 'tirage', 'lourd'].includes(PROFILE)) {
  console.error('Usage : node seed-test-136.js <CODE_BEBE> [--profil complet|tirage|lourd] [--clean] [--yes]');
  process.exit(1);
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rand(0, list.length - 1)];
const pad = (n) => String(n).padStart(2, '0');

// Heure locale, au format de l'app : 'YYYY-MM-DD HH:mm:ss'
function at(daysAgo, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

const LABELS = { 0: 'biberon', 1: 'couche', 2: 'Sante', 3: 'sommeil', 4: 'thermo', 5: 'allaitement' };

function makeTask(owner, id, date, fields) {
  return {
    uid: UID_PREFIX + randomUUID(),
    id,
    labelTask: LABELS[id],
    date,
    label: 0,
    boobLeft: 0,
    boobRight: 0,
    breastfeedingMode: null,
    milkType: null,
    sleepType: null,
    sleepLocation: null,
    user: owner.userId,
    createdBy: owner.username,
    comment: '',
    ...fields,
  };
}

function bottle(owner, daysAgo, h, milkType) {
  return makeTask(owner, 0, at(daysAgo, h, rand(0, 50)), { label: String(pick([90, 120, 150, 180, 210])), milkType });
}

function pumping(owner, daysAgo, h) {
  const left = pick([0, 40, 60, 80, 90, 120]);
  const right = left === 0 ? pick([60, 90, 120]) : pick([0, 40, 60, 90, 120]);
  return makeTask(owner, 5, at(daysAgo, h, rand(0, 50)), {
    breastfeedingMode: null,
    nursingType: 'pumping',
    pumpedLeftMl: left,
    pumpedRightMl: right,
    pumpedMl: left + right,
    ...(Math.random() > 0.5 && { pumpedDurationMin: pick([10, 15, 20, 25]) }),
  });
}

function fullDay(owner, d) {
  const tasks = [];
  // Biberons : un sur trois au lait maternel (bilan production / consommation)
  for (const h of [6, 10, 14, 18, 22].slice(0, rand(3, 5))) {
    tasks.push(bottle(owner, d, h, Math.random() < 0.33 ? 'maternal' : 'artificial'));
  }
  // Couches : type (0 dur, 1 mou, 2 liquide) et contenu (0 pipi, 1 caca, 2 les deux)
  for (const h of [7, 10, 13, 16, 19, 23].slice(0, rand(5, 6))) {
    const content = pick([0, 0, 1, 2]);
    const type = rand(0, 2);
    tasks.push(makeTask(owner, 1, at(d, h, rand(0, 50)), {
      diaperContent: content,
      // idCaca : ancien nom du champ, écrit en double par l'app pour les anciennes versions
      ...(content !== 0 && { diaperType: type, idCaca: type }),
    }));
  }
  // Santé : vitamine D chaque matin
  tasks.push(makeTask(owner, 2, at(d, 9, rand(0, 30)), { label: 'Vitamine D' }));
  // Sommeil : nuit + 1 à 2 siestes, label en minutes
  tasks.push(makeTask(owner, 3, at(d, rand(20, 21), rand(0, 45)), { label: String(rand(420, 600)), sleepType: 'night', sleepLocation: 'bed' }));
  tasks.push(makeTask(owner, 3, at(d, 10, rand(0, 30)), { label: String(rand(45, 90)), sleepType: 'nap', sleepLocation: pick(['bed', 'arms', 'bouncer']) }));
  if (Math.random() > 0.4) {
    tasks.push(makeTask(owner, 3, at(d, 15, rand(0, 30)), { label: String(rand(30, 75)), sleepType: 'nap', sleepLocation: pick(['bed', 'arms', 'breastfeeding']) }));
  }
  // Température : un jour sur trois
  if (d % 3 === 0) {
    tasks.push(makeTask(owner, 4, at(d, rand(8, 20), rand(0, 50)), { label: String((36.6 + Math.random() * 1.6).toFixed(1)) }));
  }
  // Tétées : alternance chrono / manuel, durées en secondes
  for (const h of [5, 8, 12, 17, 21].slice(0, rand(3, 5))) {
    const mode = Math.random() < 0.5 ? 'timer' : 'manual';
    const left = pick([0, 5, 10, 15]) * 60 + (mode === 'timer' ? rand(0, 59) : 0);
    const right = (left === 0 ? pick([5, 10, 15]) : pick([0, 5, 10])) * 60 + (mode === 'timer' ? rand(0, 59) : 0);
    tasks.push(makeTask(owner, 5, at(d, h, rand(0, 50)), { boobLeft: left, boobRight: right, breastfeedingMode: mode, nursingType: 'direct' }));
  }
  // Tirages : 1 à 2 par jour
  for (const h of [11, 20].slice(0, rand(1, 2))) tasks.push(pumping(owner, d, h));
  return tasks.map((t) => JSON.parse(JSON.stringify(t))); // retire les undefined, refusés par Firestore
}

function exclusivePumpingDay(owner, d) {
  const tasks = [];
  for (const h of [6, 10, 14, 18, 22].slice(0, rand(4, 5))) tasks.push(pumping(owner, d, h));
  for (const h of [7, 11, 15, 19, 23].slice(0, rand(4, 5))) tasks.push(bottle(owner, d, h, 'maternal'));
  return tasks;
}

function generate(owner) {
  const days = PROFILE === 'lourd' ? 130 : PROFILE === 'tirage' ? 30 : 90;
  const tasks = [];
  // On s'arrête à hier : aujourd'hui reste libre pour les saisies manuelles du test
  for (let d = days; d >= 1; d--) {
    tasks.push(...(PROFILE === 'tirage' ? exclusivePumpingDay(owner, d) : fullDay(owner, d)));
  }
  return tasks;
}

const sizeKb = (data) => Math.round(Buffer.byteLength(JSON.stringify(data)) / 1024);

async function run() {
  const snap = await db.collection('Baby').where('id', '==', BABY_CODE).get();
  if (snap.empty) {
    console.error(`❌ Aucun bébé avec le code « ${BABY_CODE} »`);
    process.exit(1);
  }
  const babyDoc = snap.docs[0];
  const baby = babyDoc.data();
  const existing = baby.tasks || [];
  const kept = existing.filter((t) => !String(t.uid || '').startsWith(UID_PREFIX));

  const ownerSnap = await db.collection('Users').where('userId', '==', baby.admin).get();
  if (ownerSnap.empty) {
    console.error('❌ Créateur du bébé introuvable dans Users');
    process.exit(1);
  }
  const ownerData = ownerSnap.docs[0].data();
  const owner = { userId: baby.admin, username: ownerData.username || 'Test' };

  console.log(`\nBébé : ${baby.name} (${BABY_CODE}) — créé par ${ownerData.email}`);
  console.log(`Membres : ${(baby.user || []).length} — tâches actuelles : ${existing.length} (dont ${existing.length - kept.length} de ce script)`);

  const next = CLEAN ? kept : [...kept, ...generate(owner)];
  const added = next.length - kept.length;
  const kb = sizeKb({ ...baby, tasks: next });

  console.log(CLEAN
    ? `Action : retirer ${existing.length - kept.length} tâches de test`
    : `Action : profil « ${PROFILE} », ${added} tâches ajoutées (les anciennes tâches de ce script sont remplacées)`);
  console.log(`Taille estimée de la fiche après écriture : ~${kb} Ko (limite Firestore ${FIRESTORE_LIMIT_KB} Ko)`);

  if (kb > FIRESTORE_LIMIT_KB * 0.95) {
    console.error('❌ Trop proche de la limite Firestore : écriture annulée.');
    process.exit(1);
  }
  if (!CONFIRMED) {
    console.log('\nAperçu seulement. Relancez avec --yes pour écrire.\n');
    return;
  }

  await babyDoc.ref.update({ tasks: next });
  console.log('✅ Écrit.\n');
}

run().catch((err) => { console.error(err); process.exit(1); });
