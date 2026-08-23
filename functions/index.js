const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const https = require('https');

admin.initializeApp();

const BREVO_API_KEY = defineSecret('BREVO_API_KEY');
const RECIPIENTS = [
  'continente.christopher@gmail.com',
  'bardou.delphine@gmail.com',
];

const TEST_EMAILS = new Set(['android@android.com', 'test@apple.com']);

// --- Helpers date ---

function parseBabyDate(baby) {
  if (baby.createdDate && typeof baby.createdDate === 'object' && baby.createdDate.toDate) {
    return baby.createdDate.toDate();
  }
  if (baby.CreatedDate) {
    const d = new Date(baby.CreatedDate);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseUserDate(user) {
  if (!user.creationDate) return null;
  if (typeof user.creationDate === 'object' && user.creationDate.toDate) {
    return user.creationDate.toDate();
  }
  const d = new Date(user.creationDate);
  return isNaN(d.getTime()) ? null : d;
}

// Returns { start, end } for a specific day offset from today (1 = yesterday, 2 = day before)
function dayRange(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Semaine calendaire lundi->dimanche. weeksAgo=1 -> semaine qui vient de se terminer hier
// (semaine pleine si on tourne un lundi), weeksAgo=2 -> celle d'avant.
function weekRange(weeksAgo) {
  const end = new Date();
  end.setDate(end.getDate() - 1 - (weeksAgo - 1) * 7);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function fmtShort(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
}

// --- Fetch data ---
// Le tableau `tasks[]` des bébés peut devenir volumineux (des mois de logs) — on ne le charge
// jamais pour l'ensemble de la collection, seulement pour les quelques bébés créés dans la
// fenêtre du rapport (cf. fetchBabiesWithTasks). C'est ce qui faisait dépasser la limite mémoire.

async function fetchUsersAndBabiesLight() {
  const db = admin.firestore();
  const [usersSnap, babiesSnap] = await Promise.all([
    db.collection('Users').get(),
    db.collection('Baby').select('admin', 'user', 'createdDate', 'CreatedDate').get(),
  ]);

  const allUsersRaw = usersSnap.docs.map(doc => ({ userId: doc.id, ...doc.data() }));
  const testIds = new Set(allUsersRaw.filter(u => TEST_EMAILS.has(u.email)).map(u => u.userId));

  const allUsers = allUsersRaw.filter(u => !TEST_EMAILS.has(u.email));
  const allBabiesLight = babiesSnap.docs
    .map(doc => ({ ...doc.data(), id: doc.id }))
    .filter(b => !b.admin || !testIds.has(b.admin));

  return { allUsers, allBabiesLight };
}

// Récupère le champ tasks[] uniquement pour les bébés dont on a besoin (ceux créés dans la
// fenêtre du rapport), par lots de 10 (limite sûre pour une clause 'in' sur documentId()).
async function fetchBabiesWithTasks(babyIds) {
  if (babyIds.length === 0) return [];
  const db = admin.firestore();
  const chunks = [];
  for (let i = 0; i < babyIds.length; i += 10) chunks.push(babyIds.slice(i, i + 10));

  const snaps = await Promise.all(
    chunks.map(chunk =>
      db.collection('Baby').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get()
    )
  );
  return snaps.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
}

// --- Email template ---

function fmt(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function diffTag(a, b) {
  if (a === b) return `<span style="color:#9ca3af;font-size:12px;">—</span>`;
  const diff = a - b;
  const color = diff > 0 ? '#16a34a' : '#dc2626';
  const sign = diff > 0 ? '▲' : '▼';
  return `<span style="color:${color};font-size:12px;font-weight:600;">${sign}${Math.abs(diff)}</span>`;
}

function section(title, titleColor, rows) {
  return `
    <div style="background:#ffffff;border-radius:14px;padding:16px 20px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:${titleColor};text-transform:uppercase;margin-bottom:12px;">${title}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows}
      </table>
    </div>`;
}

function row(icon, label, value, tag = '') {
  return `
    <tr>
      <td style="padding:7px 0;font-size:14px;color:#374151;">${icon} ${label}</td>
      <td style="padding:7px 0;text-align:right;font-size:14px;font-weight:700;color:#111827;">${value}&nbsp;&nbsp;${tag}</td>
    </tr>`;
}

function separator(cols = 2) {
  return `<tr><td colspan="${cols}" style="border-top:1px solid #f3f4f6;padding:0;"></td></tr>`;
}

function weeklyHeaderRow() {
  return `
    <tr>
      <td></td>
      <td style="padding:0 0 8px;text-align:right;font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;">Dernière</td>
      <td style="padding:0 0 8px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;">D'avant</td>
      <td style="padding:0 0 8px 10px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;">Écart</td>
    </tr>`;
}

function weeklyRow(icon, label, thisWeek, lastWeek, sub = '') {
  return `
    <tr>
      <td style="padding:7px 0;font-size:14px;color:#374151;">${icon} ${label}</td>
      <td style="padding:7px 0;text-align:right;font-size:14px;font-weight:700;color:#111827;">${thisWeek}${sub}</td>
      <td style="padding:7px 0;text-align:right;font-size:13px;color:#9ca3af;">${lastWeek}</td>
      <td style="padding:7px 0 7px 10px;text-align:right;">${diffTag(thisWeek, lastWeek)}</td>
    </tr>`;
}

function buildHtml({ yesterday, dayBefore, weekly, reportDate }) {
  const yesterdayRows = [
    row('👤', 'Comptes créés', `${yesterday.accounts} <span style="color:#6b7280;font-size:12px;font-weight:400;">· 🍎 ${yesterday.accountsIos} · 🤖 ${yesterday.accountsAndroid}</span>`, diffTag(yesterday.accounts, dayBefore.accounts)),
    separator(),
    row('👶', 'Ont créé un bébé', yesterday.createdBaby),
    separator(),
    row('🔗', 'Ont rejoint un bébé', yesterday.joinedBaby),
    separator(),
    row('🍼', 'Bébés créés', yesterday.babies, yesterday.babies > yesterday.createdBaby ? `<span style="color:#dc2626;font-size:12px;font-weight:600;">⚠️ doublons ?</span>` : ''),
    separator(),
    row('⚠️', 'Sans bébé', yesterday.noBaby),
    separator(),
    row('🚫', 'Bébés créés hier, sans tâche', yesterday.babiesNoTasks),
    separator(),
    row('✏️', 'Bébés créés hier, 1-2 tâches', yesterday.babies1to2Tasks),
    separator(),
    row('🔥', 'Bébés créés hier, 3+ tâches', yesterday.babies3PlusTasks),
  ].join('');

  const weeklyRows = weekly ? [
    weeklyHeaderRow(),
    weeklyRow(
      '👤', 'Comptes créés',
      weekly.lastWeek.accounts, weekly.weekBefore.accounts,
      ` <span style="color:#6b7280;font-size:11px;font-weight:400;">(🍎${weekly.lastWeek.accountsIos}·🤖${weekly.lastWeek.accountsAndroid})</span>`
    ),
    separator(4),
    weeklyRow('👶', 'Ont créé un bébé', weekly.lastWeek.createdBaby, weekly.weekBefore.createdBaby),
    separator(4),
    weeklyRow('🔗', 'Ont rejoint un bébé', weekly.lastWeek.joinedBaby, weekly.weekBefore.joinedBaby),
    separator(4),
    weeklyRow('🍼', 'Bébés créés', weekly.lastWeek.babies, weekly.weekBefore.babies),
    separator(4),
    weeklyRow('⚠️', 'Sans bébé', weekly.lastWeek.noBaby, weekly.weekBefore.noBaby),
    separator(4),
    weeklyRow('🚫', 'Bébés sans tâche', weekly.lastWeek.babiesNoTasks, weekly.weekBefore.babiesNoTasks),
    separator(4),
    weeklyRow('✏️', 'Bébés 1-2 tâches', weekly.lastWeek.babies1to2Tasks, weekly.weekBefore.babies1to2Tasks),
    separator(4),
    weeklyRow('🔥', 'Bébés 3+ tâches', weekly.lastWeek.babies3PlusTasks, weekly.weekBefore.babies3PlusTasks),
  ].join('') : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TribuBaby — Rapport quotidien</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:20px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;">

        <!-- Header -->
        <tr><td style="padding-bottom:16px;">
          <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:16px;padding:24px 20px;text-align:center;">
            <div style="font-size:28px;margin-bottom:6px;">🍼</div>
            <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">TribuBaby</div>
            <div style="color:#e9d5ff;font-size:13px;margin-top:4px;">Rapport du ${reportDate}</div>
          </div>
        </td></tr>

        <!-- Hier -->
        <tr><td>
          ${section(`Hier · ${yesterday.label}`, '#7c3aed', yesterdayRows)}
        </td></tr>

        ${weekly ? `<!-- Semaine (lundi uniquement) -->
        <tr><td>
          ${section(`📅 Semaine dernière · ${weekly.label}`, '#0284c7', weeklyRows)}
        </td></tr>` : ''}

        <!-- Footer -->
        <tr><td style="text-align:center;padding:8px 0 20px;">
          <div style="font-size:11px;color:#9ca3af;">Envoyé automatiquement par TribuBaby · chaque matin à 8h</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// --- Scheduled function ---

function buildDayStats(allUsers, allBabiesLight, range, taskCountByBabyId) {
  const users = allUsers.filter(u => { const d = parseUserDate(u); return d && d >= range.start && d <= range.end; });
  const babies = allBabiesLight.filter(b => { const d = parseBabyDate(b); return d && d >= range.start && d <= range.end; });
  const babyAdminIds = new Set(babies.map(b => b.admin).filter(Boolean));
  const userIdsWithAnyBaby = new Set(allBabiesLight.flatMap(b => b.user || []));
  const taskCount = (b) => taskCountByBabyId.get(b.id) || 0;
  return {
    label: fmt(range.start),
    accounts: users.length,
    accountsIos: users.filter(u => u.platform === 'ios').length,
    accountsAndroid: users.filter(u => u.platform === 'android').length,
    createdBaby: users.filter(u => babyAdminIds.has(u.userId)).length,
    joinedBaby: users.filter(u => !babyAdminIds.has(u.userId) && userIdsWithAnyBaby.has(u.userId)).length,
    babies: babies.length,
    noBaby: users.filter(u => !userIdsWithAnyBaby.has(u.userId)).length,
    babiesNoTasks: babies.filter(b => taskCount(b) === 0).length,
    babies1to2Tasks: babies.filter(b => taskCount(b) >= 1 && taskCount(b) <= 2).length,
    babies3PlusTasks: babies.filter(b => taskCount(b) >= 3).length,
  };
}

async function sendStats(apiKey, subjectPrefix = '') {
  const { allUsers, allBabiesLight } = await fetchUsersAndBabiesLight();
  const yd = dayRange(1);
  const dayBeforeRange = dayRange(2);
  const isMonday = new Date().getDay() === 1;
  const lastWeekRange = isMonday ? weekRange(1) : null;
  const weekBeforeRange = isMonday ? weekRange(2) : null;

  // Seuls les bébés créés dans la fenêtre du rapport ont besoin de leur tasks[] complet
  // (lastWeekRange.end === yd.end : la fenêtre s'étend juste plus loin dans le passé le lundi)
  const earliestStart = isMonday ? weekBeforeRange.start : dayBeforeRange.start;
  const recentBabyIds = allBabiesLight
    .filter(b => { const d = parseBabyDate(b); return d && d >= earliestStart && d <= yd.end; })
    .map(b => b.id);
  const recentBabiesWithTasks = await fetchBabiesWithTasks(recentBabyIds);
  const taskCountByBabyId = new Map(recentBabiesWithTasks.map(b => [b.id, b.tasks?.length || 0]));

  const stats = {
    yesterday: buildDayStats(allUsers, allBabiesLight, yd, taskCountByBabyId),
    dayBefore: buildDayStats(allUsers, allBabiesLight, dayBeforeRange, taskCountByBabyId),
    weekly: isMonday ? {
      lastWeek: buildDayStats(allUsers, allBabiesLight, lastWeekRange, taskCountByBabyId),
      weekBefore: buildDayStats(allUsers, allBabiesLight, weekBeforeRange, taskCountByBabyId),
      label: `${fmtShort(lastWeekRange.start)} → ${fmtShort(lastWeekRange.end)}`,
    } : null,
    reportDate: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
  const html = buildHtml(stats);
  const today = new Date();
  const subject = `${subjectPrefix}TribuBaby 📊 ${today.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}`;

  const body = JSON.stringify({
    sender: { name: 'TribuBaby Stats', email: 'tribubabytracker@gmail.com' },
    to: RECIPIENTS.map(email => ({ email })),
    subject,
    htmlContent: html,
  });

  await new Promise((resolve, reject) => {
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
      res.on('data', chunk => { data += chunk; });
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

exports.dailyStats = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Europe/Paris', secrets: [BREVO_API_KEY], memory: '512MiB' },
  async () => {
    await sendStats(BREVO_API_KEY.value());
    console.log('Daily stats email sent to', RECIPIENTS);
  }
);

exports.feedbackEmails = require('./feedbackEmails').feedbackEmails;
