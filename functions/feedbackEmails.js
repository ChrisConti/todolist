const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const https = require('https');
const { buildNoBabyEmail, buildChurnEmail } = require('./feedbackEmailTemplates');

const BREVO_API_KEY = defineSecret('BREVO_API_KEY');
const SENDER = { name: 'Delphine & Christopher · TribuBaby', email: 'tribubabytracker@gmail.com' };
const ADMIN_RECIPIENTS = [
  'continente.christopher@gmail.com',
  'bardou.delphine@gmail.com',
];
const TEST_EMAILS = new Set(['android@android.com', 'test@apple.com']);
const SUPPORTED_LANGS = new Set(['fr', 'en', 'es']);

// Bornes des segments — cf. discussion produit du 2026-08-09
const NO_BABY_MIN_ACCOUNT_AGE_MS = 48 * 60 * 60 * 1000; // 48h
// Borne haute anti-spam : évite de mailer tous les comptes historiques sans bébé au premier déploiement
const NO_BABY_MAX_ACCOUNT_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30j
const CHURN_MAX_ACCOUNT_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30j
const CHURN_MIN_SILENCE_MS = 3 * 24 * 60 * 60 * 1000; // 3j sans tâche

// Anti-spam : borne le nombre d'envois par exécution (le reliquat repasse au run suivant)
const MAX_EMAILS_PER_RUN = 40;
const DELAY_BETWEEN_SENDS_MS = 300;

const ES_COUNTRIES = new Set(['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR']);
const EN_COUNTRIES = new Set(['US', 'GB', 'AU', 'IE', 'NZ']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUserDate(user) {
  if (!user.creationDate) return null;
  if (typeof user.creationDate === 'object' && user.creationDate.toDate) {
    return user.creationDate.toDate();
  }
  const d = new Date(user.creationDate);
  return isNaN(d.getTime()) ? null : d;
}

function resolveLanguage(user) {
  if (user.language && SUPPORTED_LANGS.has(user.language)) return user.language;
  const country = (user.country || '').toUpperCase();
  if (ES_COUNTRIES.has(country)) return 'es';
  if (EN_COUNTRIES.has(country)) return 'en';
  return 'fr';
}

// Le tableau tasks[] des bébés peut être volumineux — on ne le charge jamais pour l'ensemble
// de la collection (ça a fait planter dailyStats en OOM le 5 août), seulement pour les bébés
// des utilisateurs déjà éligibles au segment churn (cf. fetchBabiesWithTasks).
async function fetchUsersAndBabiesLight() {
  const db = admin.firestore();
  const [usersSnap, babiesSnap] = await Promise.all([
    db.collection('Users').get(),
    db.collection('Baby').select('admin', 'user').get(),
  ]);
  const allUsers = usersSnap.docs
    .map((doc) => ({ docId: doc.id, ...doc.data() }))
    .filter((u) => !TEST_EMAILS.has(u.email));
  const allBabiesLight = babiesSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return { allUsers, allBabiesLight };
}

async function fetchBabiesWithTasks(babyIds) {
  if (babyIds.length === 0) return [];
  const db = admin.firestore();
  const chunks = [];
  for (let i = 0; i < babyIds.length; i += 10) chunks.push(babyIds.slice(i, i + 10));

  const snaps = await Promise.all(
    chunks.map((chunk) =>
      db.collection('Baby').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get()
    )
  );
  return snaps.flatMap((snap) => snap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
}

function findNoBabyCandidates(allUsers, allBabiesLight, now) {
  const userIdsWithAnyBaby = new Set(allBabiesLight.flatMap((b) => b.user || []));
  const minCreatedAt = new Date(now.getTime() - NO_BABY_MAX_ACCOUNT_AGE_MS);
  const maxCreatedAt = new Date(now.getTime() - NO_BABY_MIN_ACCOUNT_AGE_MS);

  return allUsers.filter((u) => {
    if (!u.emailOptIn) return false;
    if (u.feedbackEmailSent?.noBaby) return false;
    if (!u.userId || !u.email) return false;
    const created = parseUserDate(u);
    if (!created || created > maxCreatedAt || created < minCreatedAt) return false;
    if (userIdsWithAnyBaby.has(u.userId)) return false;
    return true;
  });
}

// Pré-filtre sans avoir besoin des tâches : compte < 30j, opt-in, pas déjà mailé pour ce motif
function prefilterChurnUsers(allUsers, now) {
  const minCreatedAt = new Date(now.getTime() - CHURN_MAX_ACCOUNT_AGE_MS);
  return allUsers.filter((u) => {
    if (!u.emailOptIn) return false;
    if (u.feedbackEmailSent?.churn) return false;
    if (!u.userId || !u.email) return false;
    const created = parseUserDate(u);
    if (!created || created < minCreatedAt) return false;
    return true;
  });
}

function babyIdsForUser(userId, allBabiesLight) {
  return allBabiesLight
    .filter((b) => b.admin === userId || (b.user || []).includes(userId))
    .map((b) => b.id);
}

function lastTaskDateForUser(userId, allBabiesLight, tasksByBabyId) {
  const babyIds = babyIdsForUser(userId, allBabiesLight);
  const tasks = babyIds.flatMap((id) => (tasksByBabyId.get(id) || []).filter((t) => t.createdBy === userId));
  if (tasks.length === 0) return null;
  let latest = null;
  for (const task of tasks) {
    const d = new Date(task.date);
    if (!isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
  }
  return latest;
}

function findChurnCandidates(prefiltered, allBabiesLight, tasksByBabyId, now) {
  const silenceCutoff = new Date(now.getTime() - CHURN_MIN_SILENCE_MS);
  return prefiltered.filter((u) => {
    const lastTask = lastTaskDateForUser(u.userId, allBabiesLight, tasksByBabyId);
    if (!lastTask) return false; // n'a jamais rien saisi -> pas ce segment
    if (lastTask > silenceCutoff) return false; // encore actif récemment
    return true;
  });
}

function sendBrevoEmail(apiKey, { to, subject, html }) {
  const recipients = Array.isArray(to) ? to : [to];
  const body = JSON.stringify({
    sender: SENDER,
    to: recipients.map((email) => ({ email })),
    replyTo: SENDER,
    subject,
    htmlContent: html,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`Brevo error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildSummaryEmail({ reportDate, noBabySent, noBabyTotal, churnSent, churnTotal, budgetLeft }) {
  const row = (label, sent, total) =>
    `<tr>
      <td style="padding:6px 0;font-size:14px;color:#374151;">${label}</td>
      <td style="padding:6px 0;text-align:right;font-size:14px;font-weight:700;color:#111827;">${sent} / ${total}</td>
    </tr>`;

  const note = budgetLeft <= 0
    ? `<p style="margin:16px 0 0;font-size:12px;color:#dc2626;">⚠️ Plafond de ${MAX_EMAILS_PER_RUN} emails/run atteint — du monde reste en attente pour demain.</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border-radius:14px;padding:20px 24px;">
      <tr><td>
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#7c3aed;text-transform:uppercase;margin-bottom:12px;">📬 Emails feedback — ${reportDate}</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row('👤 Pas de bébé', noBabySent, noBabyTotal)}
          ${row('💤 Décroché', churnSent, churnTotal)}
        </table>
        ${note}
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;

  return { subject: `TribuBaby 📬 Emails feedback envoyés — ${reportDate}`, html };
}

async function sendSummaryEmail(apiKey, stats) {
  const { subject, html } = buildSummaryEmail(stats);
  await sendBrevoEmail(apiKey, { to: ADMIN_RECIPIENTS, subject, html });
}

async function markSent(docId, segment) {
  await admin.firestore().collection('Users').doc(docId).update({
    [`feedbackEmailSent.${segment}`]: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function processSegment(apiKey, candidates, segment, buildFn, budget) {
  let sent = 0;
  for (const user of candidates) {
    if (budget.remaining <= 0) break;
    const lang = resolveLanguage(user);
    const { subject, html } = buildFn(lang, user.username);
    try {
      await sendBrevoEmail(apiKey, { to: user.email, subject, html });
      await markSent(user.docId, segment);
      sent++;
      budget.remaining--;
    } catch (err) {
      console.error(`Failed to send ${segment} email to user ${user.userId}:`, err.message);
    }
    await sleep(DELAY_BETWEEN_SENDS_MS);
  }
  return sent;
}

async function runFeedbackEmails(apiKey) {
  const now = new Date();
  const { allUsers, allBabiesLight } = await fetchUsersAndBabiesLight();

  const noBabyCandidates = findNoBabyCandidates(allUsers, allBabiesLight, now);

  const churnPrefiltered = prefilterChurnUsers(allUsers, now);
  const relevantBabyIds = [...new Set(
    churnPrefiltered.flatMap((u) => babyIdsForUser(u.userId, allBabiesLight))
  )];
  const babiesWithTasks = await fetchBabiesWithTasks(relevantBabyIds);
  const tasksByBabyId = new Map(babiesWithTasks.map((b) => [b.id, b.tasks || []]));
  const churnCandidates = findChurnCandidates(churnPrefiltered, allBabiesLight, tasksByBabyId, now);

  // Budget partagé entre les 2 segments sur ce run — le reliquat repasse au run suivant
  const budget = { remaining: MAX_EMAILS_PER_RUN };

  const noBabySent = await processSegment(apiKey, noBabyCandidates, 'noBaby', buildNoBabyEmail, budget);
  const churnSent = await processSegment(apiKey, churnCandidates, 'churn', buildChurnEmail, budget);

  console.log(
    `Feedback emails — segment noBaby: ${noBabySent}/${noBabyCandidates.length} envoyés, ` +
    `segment churn: ${churnSent}/${churnCandidates.length} envoyés (budget/run: ${MAX_EMAILS_PER_RUN}).`
  );

  try {
    await sendSummaryEmail(apiKey, {
      reportDate: now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      noBabySent,
      noBabyTotal: noBabyCandidates.length,
      churnSent,
      churnTotal: churnCandidates.length,
      budgetLeft: budget.remaining,
    });
  } catch (err) {
    console.error('Failed to send admin summary email:', err.message);
  }
}

exports.feedbackEmails = onSchedule(
  { schedule: '0 10 * * *', timeZone: 'Europe/Paris', secrets: [BREVO_API_KEY], memory: '512MiB', timeoutSeconds: 300 },
  async () => {
    await runFeedbackEmails(BREVO_API_KEY.value());
  }
);
