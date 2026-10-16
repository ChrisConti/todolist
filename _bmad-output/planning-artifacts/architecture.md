# Architecture — PUMP IT

**Date :** 2026-04-30
**Stack :** React Native 0.73+ / Expo SDK 50+ / Firebase / RevenueCat

---

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────┐
│                  CLIENT (React Native)               │
│  Navigation │ Zustand Store │ i18next │ VisionCamera │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / Firestore SDK / FCM
┌──────────────────────▼──────────────────────────────┐
│                    FIREBASE                          │
│  Auth │ Firestore │ Storage │ FCM │ Cloud Functions  │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   RevenueCat     Claude API     Firebase Analytics
  (IAP / IAPs)  (Chambrage IA)   (Events tracking)
```

---

## Schéma Firestore

### Collection `users/{uid}`

```typescript
{
  uid: string,                    // Firebase Auth UID
  username: string,               // Pseudo affiché
  avatarId: AvatarId,             // 'duck'|'fox'|'wolf'|'bear'|'bull'|'rhino'|'shark'|'gorilla'|'dragon'|'phoenix'
  teamId: string | null,          // Équipe courante (null si sans équipe)
  fcmToken: string | null,        // Token FCM pour push notifications
  trashLevel: 'soft'|'medium'|'hardcore',  // Préférence chambrage
  isPremium: boolean,             // true si Pack Savage actif pour son équipe
  language: 'fr'|'en'|'es'|'de'|'it',
  totalReps: number,              // Cumulatif all-time
  currentStreak: number,          // Jours consécutifs avec ≥1 session
  longestStreak: number,
  createdAt: Timestamp,
  lastActiveAt: Timestamp,
}
```

**Index :** `teamId` (pour lister les membres d'une équipe)

---

### Collection `teams/{teamId}`

```typescript
{
  teamId: string,                 // Auto-généré
  name: string,                   // Nom de l'équipe
  inviteCode: string,             // 6 caractères uppercase ex: 'BR4X9K'
  adminUid: string,               // UID du créateur / admin courant
  memberUids: string[],           // Array max 10 UIDs
  memberCount: number,            // Dénormalisé pour règles de sécurité
  isPremium: boolean,             // true si ≥1 membre a acheté Pack Savage
  premiumActivatedBy: string | null,  // UID de l'acheteur
  weeklyScores: {                 // Scores de la semaine courante
    [uid: string]: number         // reps totaux cette semaine
  },
  currentWeekId: string,          // Format: '2026-W18'
  createdAt: Timestamp,
}
```

**Index :**
- `inviteCode` (unique, pour rejoindre via code)
- `memberUids` array-contains (pour trouver l'équipe d'un user)

---

### Collection `sessions/{sessionId}`

```typescript
{
  sessionId: string,
  userId: string,
  teamId: string,
  repsCount: number,
  durationSeconds: number,
  cadenceRpm: number,             // Reps par minute (calculé)
  isPersonalRecord: boolean,
  weekId: string,                 // '2026-W18'
  reactions: {
    props: string[],              // UIDs ayant mis 💪
    trash: string[],              // UIDs ayant mis 🗑️
  },
  clipUrl: string | null,         // Firebase Storage URL (Lot 5 uniquement)
  clipExpiresAt: Timestamp | null,// +24h après upload (Lot 5)
  postedAt: Timestamp,
}
```

**Index :**
- `teamId` + `postedAt` desc (feed de l'équipe)
- `userId` + `postedAt` desc (historique perso)
- `teamId` + `weekId` (stats semaine)

---

### Collection `weeklyRecaps/{teamId_weekId}`

```typescript
{
  teamId: string,
  weekId: string,                 // '2026-W18'
  generatedAt: Timestamp,
  champion: {
    uid: string,
    username: string,
    avatarId: string,
    reps: number,
  },
  absentHonteux: {
    uid: string,
    username: string,
    avatarId: string,
  } | null,
  finalRanking: Array<{
    rank: number,
    uid: string,
    username: string,
    avatarId: string,
    reps: number,
  }>,
  funStats: {
    biggestSession: { uid: string, reps: number },
    mostConsistent: { uid: string, activeDays: number },
    mostProps: { uid: string, propsReceived: number },
    mostTrashed: { uid: string, trashReceived: number },
    bestProgression: { uid: string, progressionPct: number } | null,
  },
  shareCardUrl: string | null,    // Firebase Storage, générée à la demande
}
```

**Index :** `teamId` + `generatedAt` desc (historique des récaps)

---

### Collection `chambrages/{chambrageId}` *(Lot 5 — IA)*

```typescript
{
  chambrageId: string,
  teamId: string,
  targetUid: string,
  senderUid: string | null,       // null si déclenché par le système
  degree: 1 | 2 | 3 | 4,
  message: string,                // Message généré (template ou IA)
  isAiGenerated: boolean,
  trigger: 'overtaken'|'inactivity_48h'|'inactivity_72h'|'trash_reaction'|'auto',
  sentAt: Timestamp,
  openedAt: Timestamp | null,
}
```

---

## Règles de Sécurité Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users : lecture publique aux membres de la même équipe, écriture self only
    match /users/{uid} {
      allow read: if request.auth != null &&
        (request.auth.uid == uid ||
         isTeamMate(request.auth.uid, resource.data.teamId));
      allow write: if request.auth.uid == uid;
    }

    // Teams : lecture membres uniquement, écriture admin uniquement
    match /teams/{teamId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.memberUids;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.adminUid;
      allow create: if request.auth != null;
    }

    // Sessions : lecture membres de l'équipe, création self uniquement
    match /sessions/{sessionId} {
      allow read: if request.auth != null &&
        isTeamMate(request.auth.uid, resource.data.teamId);
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null &&
        isTeamMate(request.auth.uid, resource.data.teamId) &&
        onlyUpdatingReactions(request.resource.data, resource.data);
    }

    // WeeklyRecaps : lecture membres uniquement, écriture Cloud Functions
    match /weeklyRecaps/{recapId} {
      allow read: if request.auth != null &&
        isTeamMember(request.auth.uid, resource.data.teamId);
      allow write: if false; // Cloud Functions only
    }

    function isTeamMate(uid, teamId) {
      return teamId != null &&
        uid in get(/databases/$(database)/documents/teams/$(teamId)).data.memberUids;
    }

    function isTeamMember(uid, teamId) {
      return isTeamMate(uid, teamId);
    }

    function onlyUpdatingReactions(newData, oldData) {
      return newData.diff(oldData).affectedKeys().hasOnly(['reactions']);
    }
  }
}
```

---

## Cloud Functions

### `weeklyReset` — Cron lundi 00h01 UTC+1

**Trigger :** Cloud Scheduler — `1 0 * * MON` (Europe/Paris)

**Comportement :**
1. Récupère toutes les équipes actives (`memberCount > 0`)
2. Pour chaque équipe : archive `weeklyScores` dans `weeklyRecaps` (snapshot pré-récap)
3. Remet `weeklyScores` à `{}` et met à jour `currentWeekId`
4. Envoie notification push à tous les membres : *"Reset ! La semaine repart à zéro."*
5. Met à jour `lastActiveAt` sur l'équipe

**Tolérance :** retry automatique si échec, alerte Slack si 3 échecs consécutifs

---

### `sundayRecap` — Cron dimanche 20h heure locale

**Trigger :** Cloud Scheduler — `0 19 * * SUN` (UTC, = 20h Paris)

**Comportement :**
1. Pour chaque équipe active de la semaine
2. Calcule le classement final depuis `weeklyScores`
3. Calcule les `funStats` depuis les sessions de la semaine
4. Identifie le champion (max reps) et l'absent honteux (0 reps ou absent)
5. Écrit le document `weeklyRecaps/{teamId}_{weekId}`
6. Envoie notification push haute priorité à tous les membres

---

### `onSessionPosted` — Trigger Firestore onCreate `sessions/{sessionId}`

**Comportement :**
1. Met à jour `weeklyScores[userId]` dans le document équipe (+repsCount)
2. Met à jour `totalReps` et `lastActiveAt` dans le document user
3. Vérifie si `isPersonalRecord` → notif de félicitation à l'auteur
4. Vérifie si l'auteur dépasse quelqu'un → notif de dépassement à la victime
5. Notifie les membres de l'équipe (session postée, max 1 notif / 10 min / équipe)

---

### `onTrashReaction` — Trigger Firestore onUpdate `sessions/{sessionId}` (réactions.trash)

**Comportement :**
1. Génère un message de chambrage selon le `degree` courant de la semaine
2. **Lot 3 (templates) :** Sélectionne un template depuis la banque selon degree + contexte
3. **Lot 5 (IA) :** Appel Claude API avec contexte groupe → message personnalisé
4. Envoie notification push à l'auteur de la session
5. Écrit dans `chambrages/` pour historique et modération

---

### `chambrageScheduler` — Cron toutes les 6h

**Comportement :**
1. Scan les users avec `lastActiveAt` > 48h dans une équipe active
2. Si 48h d'inactivité → envoie chambrage degree selon jour de semaine
3. Si 72h → chambrage degree +1 (plus intense)
4. Rate limit : max 1 chambrage automatique / 24h / user
5. Respecte le `trashLevel` de l'utilisateur

---

### `onPackSavagePurchased` — Webhook RevenueCat

**Endpoint :** `POST /webhooks/revenuecat`

**Comportement :**
1. Vérifie la signature RevenueCat
2. Récupère le `teamId` depuis les metadata de l'achat
3. Met à jour `teams/{teamId}.isPremium = true` et `premiumActivatedBy`
4. Met à jour `isPremium = true` pour tous les `memberUids`
5. Envoie notification à tous les membres : *"[Username] vient d'offrir le Pack Savage à tout le groupe 👑"*

---

### `onReferralCompleted` — Trigger Firestore onUpdate `users/{uid}` (referralCount)

**Comportement :**
1. Quand `referralCount >= 3` et `isPremium == false`
2. Active le Pack Savage sur l'équipe (même logique que `onPackSavagePurchased`)
3. Écrit un event Firebase Analytics `referral_completed`

---

### `dailyCleanup` — Cron quotidien 04h00 UTC *(Lot 5)*

**Comportement :**
1. Liste les fichiers Firebase Storage dans `/clips/` avec `metadata.customTime < now - 24h`
2. Supprime chaque fichier expiré
3. Met à jour `clipUrl = null` et `clipExpiresAt = null` dans la session correspondante

---

## Détection Caméra — Pipeline

**Librairie :** `react-native-vision-camera` v4+

**Modèle :** Google MLKit Face Detection (embarqué, < 3MB, disponible offline)

```
┌─────────────────────────────────────────────────┐
│               VisionCamera Frame Processor       │
│                                                  │
│  Frame (30fps)                                   │
│       │                                          │
│       ▼                                          │
│  MLKit Face Detection                            │
│       │                                          │
│       ├─ No face detected → indicator rouge      │
│       │                                          │
│       └─ Face detected →                         │
│               │                                  │
│               ▼                                  │
│          Track head Y position                   │
│               │                                  │
│          Descente détectée (Y > threshold_down)  │
│               │                                  │
│          Montée détectée (Y < threshold_up)      │
│               │                                  │
│          REP COMPTÉE ✓ → Haptic feedback         │
└─────────────────────────────────────────────────┘
```

**Logique de comptage :**
- Seuil descente : position Y du nez > `baseY + 0.15 * frameHeight`
- Seuil montée : position Y du nez < `baseY + 0.05 * frameHeight`
- Une rep = cycle complet descente → montée
- Anti-rebond : délai minimum 400ms entre deux reps
- Calibration : position Y de base = moyenne des 10 premières frames avec visage détecté

**États affichés :**
- `FACE_NOT_DETECTED` — indicateur rouge, comptage suspendu
- `FACE_OK` — indicateur vert, comptage actif
- `CALIBRATING` — indicateur orange, 3 secondes au démarrage

---

## Deep Links

**Schéma custom :** `pumpit://join/{inviteCode}`

**Universal Links (iOS) :** `https://pumpit.app/join/{inviteCode}`

**App Links (Android) :** `https://pumpit.app/join/{inviteCode}`

**Fichier `apple-app-site-association` (iOS) :**
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.pumpit.app",
      "paths": ["/join/*"]
    }]
  }
}
```

**Fichier `assetlinks.json` (Android) :**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.pumpit.app",
    "sha256_cert_fingerprints": ["..."]
  }
}]
```

**Fallback :** Si l'app n'est pas installée → redirect App Store / Play Store avec `inviteCode` en paramètre UTM → l'app s'ouvre sur l'écran "Rejoindre" avec le code pré-rempli après installation.

---

## RevenueCat — Configuration IAP

**Produits :**

| Produit | App Store ID | Play Store ID | Prix |
|---|---|---|---|
| Pack Savage (one-shot) | `pumpit_pack_savage` | `pumpit_pack_savage` | 4.99€ |

**Entitlement :** `premium`

**Metadata requis à l'achat :** `teamId` passé dans `applicationUsername` ou `metadata` RevenueCat pour le webhook.

**Webhook :** `INITIAL_PURCHASE` → `onPackSavagePurchased` Cloud Function

**Restore :** Bouton "Restaurer les achats" dans les réglages → vérifie l'entitlement RevenueCat → réactive le premium si trouvé.

---

## Navigation (React Navigation v6)

```
RootNavigator
├── AuthStack (si non connecté)
│   ├── SplashScreen          ← L01
│   ├── OnboardingAvatarScreen ← L02
│   └── OnboardingTeamScreen   ← L03
│
└── MainTabs (si connecté + équipe)
    ├── FeedTab               ← L04
    ├── LeaderboardTab        ← L06
    ├── FAB SessionTab        ← L05 (modal plein écran)
    ├── TeamTab               ← L12 (réglages équipe)
    └── ProfileTab            ← L11
        └── SettingsScreen    ← L12

Modals (Stack over MainTabs)
├── SessionDetailModal        ← L07
├── SundayRecapModal          ← L09
└── ShareCardModal            ← L10
```

---

## Zustand Store — Structure

```typescript
// store/authStore.ts
{
  user: User | null,
  isLoading: boolean,
  signIn: (email, password) => Promise<void>,
  signInWithGoogle: () => Promise<void>,
  signOut: () => Promise<void>,
}

// store/teamStore.ts
{
  team: Team | null,
  members: User[],
  weeklyScores: Record<string, number>,
  leaderboard: RankedMember[],
  subscribe: (teamId: string) => Unsubscribe,
}

// store/feedStore.ts
{
  sessions: Session[],
  hasMore: boolean,
  isLoading: boolean,
  loadMore: () => Promise<void>,
  postReaction: (sessionId, type) => Promise<void>,
}

// store/sessionStore.ts
{
  isRecording: boolean,
  repsCount: number,
  duration: number,
  faceStatus: 'calibrating'|'ok'|'not_detected',
  startSession: () => void,
  stopSession: () => Promise<Session>,
  resetSession: () => void,
}

// store/premiumStore.ts
{
  isPremium: boolean,
  purchasePackSavage: () => Promise<void>,
  restorePurchases: () => Promise<void>,
}
```

---

## Variables d'Environnement

```bash
# .env.local
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=...
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=...

# Secrets Firebase (Cloud Functions uniquement — jamais côté client)
CLAUDE_API_KEY=...
REVENUECAT_WEBHOOK_SECRET=...
```

---

## CI/CD — EAS Build

```yaml
# eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

**Pipeline :** Push → EAS Build → TestFlight (iOS) + Internal Track (Android) → Review → Production
