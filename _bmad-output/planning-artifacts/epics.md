---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - /Users/chris_/Documents/todolist/_bmad-output/planning-artifacts/prd.md
  - /Users/chris_/Documents/todolist/_bmad-output/planning-artifacts/architecture.md
  - /Users/chris_/Downloads/design_handoff_pump_it/README.md
---

# PUMP IT - Epic Breakdown

## Overview

Ce document contient la décomposition complète en epics et stories de PUMP IT, issue du PRD, de l'Architecture, et du Design Handoff (12 écrans L01–L12).

---

## Requirements Inventory

### Functional Requirements

FR1: Un utilisateur peut créer un compte avec email/mot de passe ou Google Sign-In
FR2: Un utilisateur peut sélectionner un avatar parmi 10 personnages animaux à l'inscription
FR3: Un utilisateur peut modifier son pseudo et son avatar depuis son profil
FR4: Un utilisateur peut consulter ses statistiques personnelles (total pompes, best day, streak, historique)
FR5: Un utilisateur peut supprimer son compte et l'intégralité de ses données
FR6: Un utilisateur peut créer une équipe avec un nom, générant automatiquement un code 6 caractères, un QR code et un deep link
FR7: Un utilisateur peut rejoindre une équipe via code, scan QR ou lien deep link
FR8: Un admin peut inviter des membres directement depuis l'app
FR9: Un admin peut exclure un membre de l'équipe
FR10: Un admin peut transférer son rôle à un autre membre avant de quitter
FR11: Un utilisateur peut quitter une équipe à tout moment
FR12: Le système dissout automatiquement l'équipe si l'admin quitte sans transférer son rôle
FR13: Une équipe est limitée à 2–10 membres simultanément
FR14: Un utilisateur peut démarrer une session de comptage de pompes via la caméra frontale
FR15: Le système compte automatiquement une répétition valide quand le visage est détecté et le mouvement correctement réalisé
FR16: Un utilisateur peut voir son compteur de répétitions en temps réel pendant une session
FR17: Un utilisateur peut mettre fin à une session et poster son score dans l'équipe
FR18: Le système refuse de compter une répétition si le visage n'est pas visible dans le cadre
FR19: Un utilisateur peut consulter le feed chronologique des sessions de son équipe
FR20: Un utilisateur peut réagir à une session avec 💪 (props) ou 🗑️ (trash)
FR21: L'auteur d'une session reçoit une notification lors d'une réaction sur sa session
FR22: Le système envoie des notifications push contextuelles (dépassé au classement, session postée, inactif 48h, inactif 72h, reset weekly, récap dimanche)
FR23: Le système génère des messages de chambrage escalatifs selon 4 degrés, déterminés par le jour de la semaine et l'écart au classement
FR24: Un utilisateur peut déclencher manuellement un message trash sur la session d'un autre membre via la réaction 🗑️
FR25: Un utilisateur peut configurer son niveau de réception du trash talk (soft / medium / hardcore)
FR26: Un utilisateur peut consulter le leaderboard weekly de son équipe
FR27: Le système remet les scores weekly à zéro automatiquement chaque lundi à 00h01
FR28: Un utilisateur peut consulter le leaderboard mensuel et all-time de son équipe (fonctionnalité Pack Savage)
FR29: Le système génère automatiquement chaque dimanche à 20h un récap incluant le classement final, le champion, l'absent honteux et les stats fun
FR30: Un utilisateur peut consulter l'historique des 4 derniers récaps (illimité avec Pack Savage)
FR31: Le système génère automatiquement une carte de partage après le récap (format Stories 1080×1920 et Feed 1080×1080)
FR32: Un utilisateur peut partager sa carte de résultats vers Instagram, WhatsApp et autres apps installées
FR33: La carte de partage contient un QR code d'invitation vers l'équipe du partageur
FR34: Un utilisateur peut acheter le Pack Savage (one-shot, 4.99€) via IAP
FR35: L'achat du Pack Savage par un membre débloque les fonctionnalités premium pour tous les membres de l'équipe
FR36: Les fonctionnalités premium incluent : chambrage IA contextuel, récap animé, historique illimité, badge 👑, streak tracker, leaderboards mensuel et all-time
FR37: Un utilisateur peut obtenir le Pack Savage gratuitement en parrainant 3 amis actifs (referral)

### NonFunctional Requirements

NFR1: La détection caméra traite chaque frame en < 150ms (comptage temps réel perçu comme instantané)
NFR2: Le chargement initial du feed de l'équipe s'effectue en < 2 secondes sur une connexion 4G standard
NFR3: Le leaderboard se met à jour en < 3 secondes après la soumission d'une session
NFR4: L'onboarding complet (inscription + création équipe + 2 membres) est réalisable en < 60 secondes
NFR5: Les notifications push sont délivrées en < 10 secondes après le déclencheur serveur
NFR6: Le reset weekly (lundi 00h01) s'exécute avec une tolérance de ±5 minutes — une défaillance déclenche une alerte et un retry automatique
NFR7: Le récap dimanche (20h heure locale) s'exécute avec une tolérance de ±10 minutes — critique pour le rituel utilisateur
NFR8: La disponibilité du service est conforme aux SLAs Firebase/Google (99.95% uptime)
NFR9: La queue offline se synchronise automatiquement dans les 30 secondes après retour de connexion
NFR10: Les clés API Claude et Firebase Admin ne sont jamais exposées côté client — uniquement dans les Cloud Functions
NFR11: Toutes les communications client-serveur se font via HTTPS/TLS 1.2+
NFR12: Les règles Firestore interdisent à un utilisateur de lire/écrire les données d'une équipe dont il n'est pas membre
NFR13: Les transactions de paiement sont intégralement gérées par RevenueCat/Apple/Google — aucune donnée bancaire ne transite par les serveurs PUMP IT
NFR14: L'architecture Firebase supporte une croissance jusqu'à 10 000 utilisateurs actifs sans modification d'infrastructure
NFR15: Le rate limiting des notifications est configuré à 5 notifications/jour/utilisateur
NFR16: Les Cloud Functions de génération de chambrage supportent 100 appels simultanés sans dégradation
NFR17: L'app est compatible iOS 16+ et Android 10+ (API 29+)
NFR18: La détection caméra fonctionne sur les appareils mid-range (Samsung Galaxy A34, iPhone 11) avec précision > 90%
NFR19: L'app supporte les modes clair et sombre du système d'exploitation

### Additional Requirements

Architecture & Infrastructure :
- AR1: Initialiser le projet Expo SDK 50+ avec TypeScript strict, React Navigation v6, Zustand, i18next (FR/EN/ES/DE/IT)
- AR2: Configurer Firebase (Auth, Firestore, FCM, Storage, Cloud Functions) avec les 5 collections définies dans l'architecture (users, teams, sessions, weeklyRecaps, chambrages)
- AR3: Déployer les règles de sécurité Firestore telles que définies dans l'architecture (accès restreint aux membres de l'équipe)
- AR4: Configurer les index Firestore : `teamId+postedAt`, `userId+postedAt`, `teamId+weekId`, `inviteCode` unique, `memberUids` array-contains
- AR5: Configurer EAS Build avec 3 profils (development, preview, production) + soumission App Store / Play Store
- AR6: Configurer les variables d'environnement via `.env.local` (Firebase keys, RevenueCat keys côté client) et Firebase Secrets (Claude API key, RevenueCat webhook secret)

Cloud Functions :
- AR7: Implémenter `weeklyReset` — Cron lundi 00h01 Europe/Paris, archivage scores, reset weeklyScores, notification membres
- AR8: Implémenter `sundayRecap` — Cron dimanche 19h UTC, génération weeklyRecaps avec champion/absentHonteux/funStats, notification haute priorité
- AR9: Implémenter `onSessionPosted` — Trigger onCreate sessions, mise à jour weeklyScores + totalReps, détection dépassement + record perso, notifications membres
- AR10: Implémenter `onTrashReaction` — Trigger onUpdate sessions (réactions.trash), génération chambrage template (Lot 3), envoi notification, écriture dans chambrages/
- AR11: Implémenter `chambrageScheduler` — Cron toutes les 6h, scan inactivité 48h/72h, rate limit 1 chambrage auto/24h/user, respect trashLevel
- AR12: Implémenter `onPackSavagePurchased` — Webhook RevenueCat INITIAL_PURCHASE, vérification signature, activation premium équipe + tous membres, notification groupe
- AR13: Implémenter `dailyCleanup` — Cron 04h00 UTC, suppression clips Storage expirés (Lot 5)

Détection caméra :
- AR14: Intégrer `react-native-vision-camera` v4+ avec Google MLKit Face Detection (modèle embarqué < 3MB)
- AR15: Implémenter le Frame Processor de comptage : calibration 10 frames, seuils descente/montée sur Y position nez, anti-rebond 400ms, haptic feedback par rep
- AR16: Exposer les états CALIBRATING / FACE_OK / FACE_NOT_DETECTED avec indicateurs visuels correspondants

Deep links & partage :
- AR17: Configurer Universal Links iOS (`pumpit.app/join/{code}`) + App Links Android avec fichiers AASA et assetlinks.json
- AR18: Configurer le fallback deep link : si app non installée → redirect store avec inviteCode en paramètre UTM → code pré-rempli à l'installation
- AR19: Implémenter la génération de carte de partage avec `react-native-view-shot` (1080×1920 Stories + 1080×1080 Feed) incluant QR code d'invitation

RevenueCat :
- AR20: Configurer RevenueCat avec produit `pumpit_pack_savage` (one-shot), entitlement `premium`, metadata `teamId` à l'achat
- AR21: Implémenter le bouton Restaurer les achats dans les réglages

Analytics :
- AR22: Configurer Firebase Analytics SDK avec les 19 events définis (sessions, équipes, chambrage, monétisation, viralité) et les 5 user properties (avatar_id, team_id, is_premium, trash_level, days_since_last_session)
- AR23: Les events de monétisation (pack_savage_purchased, referral_completed) sont doublés RevenueCat pour réconciliation

### UX Design Requirements

Design System :
- UX-DR1: Implémenter les design tokens : bg `#FAF7F2`, bgElev `#FFFFFF`, bgInput `#F0EDE6`, border `rgba(20,20,20,0.08)`, borderStrong `rgba(20,20,20,0.14)`, text `#0A0A0A`, textDim `rgba(20,20,20,0.6)`, textFaint `rgba(20,20,20,0.4)`, accent `#00A859`, red `#E5252A`, gold `#E8B400`
- UX-DR2: Intégrer les 3 familles typographiques : Anton (condensed bold, display), Inter (400/500/600/700/800, body/boutons), JetBrains Mono (500/700, labels mono)
- UX-DR3: Intégrer les 10 avatars SVG depuis `avatars.jsx` (duck, fox, wolf, bear, bull, rhino, shark, gorilla, dragon, phoenix) en composants React Native scalables
- UX-DR4: Appliquer le système de spacing/radius : padding container 20–24px, card 12–18px, radius 8/10/12/14/16/18, bouton primaire radius 14 + padding vertical 16–18px, FAB 64×64 radius 32

Écrans :
- UX-DR5: L01 Splash — Logo "PUMP / IT." Anton 96px (accent vert sur "IT."), tagline JetBrains Mono uppercase, CTA "Commencer" noir, lien "Se connecter", halo radial vert bas + pattern diagonal 2.5% opacity
- UX-DR6: L02 Onboarding Avatar — Stepper "ÉTAPE 2/4", titre Anton avec mot accent vert, grid 3 colonnes 10 avatars, état sélectionné (fond #0A0A0A, texte crème, ombre élevée) vs repos (card blanche, bordure fine), bouton "Continuer →" vert pleine largeur
- UX-DR7: L03 Team — Stepper "ÉTAPE 4/4", carte "Créer" (border accent vert + halo radial), séparateur "OU", carte "Rejoindre" avec input OTP 6 cases
- UX-DR8: L04 Feed — Header équipe + semaine + badge live rouge, card podium top 3 (barres dégradées or→vert pour #1), liste sessions avec avatar/nom/count/réactions (💪 vert, 🗑️ rouge), tab bar + FAB "+" vert central 64×64
- UX-DR9: L05 Session Caméra — Background gradient crème→vert pâle, pill "VISAGE OK" vert + chrono mono, compteur Anton 220px centré, barre progression objectif vert→or, bouton STOP rouge 80×80 carré blanc
- UX-DR10: L06 Leaderboard — Toggle 3 onglets (Semaine/Mois/All-time), card #1 gradient or→vert avec couronne, liste #2–#8 avec user courant surligné vert, trend +/- JetBrains Mono vert/rouge
- UX-DR11: L07 Détail Session — Card session avec badge "VALIDÉ" gold, compteur reps vert, stats durée/cadence/RECORD, boutons réaction 💪/🗑️/+, liste commentaires, input "Balance ton chambrage…" + envoi vert
- UX-DR12: L09 Récap — Section champion gradient or→vert avec couronne + avatar 88px + score, section absent honteux border rouge + emoji 💤, grid 2×2 fun stats, CTA "Partager en story" noir
- UX-DR13: L10 Share Card (1080×1920) — wallpaper light→vert, logo ⚡ PUMP IT + ligne pointillée verte, avatar dans cercle vert double ring (blanc+or) + couronne, nom Anton, score Anton 130px, footer équipe + QR code
- UX-DR14: L11 Profil — Header halo radial vert, avatar 84px ring vert, pseudo, 3 stats (semaine/total/streak vert), heatmap 30 jours (15×2 cellules opacité variable), carrousel badges, liste sessions récentes
- UX-DR15: L12 Réglages — Sections Compte/Notifications/Équipe/Zone rouge, cards style iOS list groupé radius 14, toggles vert actifs, items Zone rouge en rouge

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 1 | Auth email/Google |
| FR2 | Epic 1 | Sélection avatar 10 personnages |
| FR3 | Epic 1 | Modifier pseudo/avatar |
| FR4 | Epic 8 | Stats perso |
| FR5 | Epic 8 | Suppression compte |
| FR6 | Epic 2 | Créer équipe + code + QR + deep link |
| FR7 | Epic 2 | Rejoindre via code/QR/lien |
| FR8 | Epic 2 | Inviter membres |
| FR9 | Epic 2 | Kick membre |
| FR10 | Epic 2 | Transfert rôle admin |
| FR11 | Epic 2 | Quitter équipe |
| FR12 | Epic 2 | Dissolution si admin quitte |
| FR13 | Epic 2 | Limite 2–10 membres |
| FR14 | Epic 3 | Démarrer session caméra |
| FR15 | Epic 3 | Comptage rep valide (face visible) |
| FR16 | Epic 3 | Compteur temps réel |
| FR17 | Epic 3 | Fin session + post score |
| FR18 | Epic 3 | Refus si visage absent |
| FR19 | Epic 4 | Feed chronologique |
| FR20 | Epic 4 | Réactions 💪/🗑️ |
| FR21 | Epic 4 | Notif réaction à l'auteur |
| FR22 | Epic 5 | Notifications contextuelles |
| FR23 | Epic 5 | Chambrage 4 degrés |
| FR24 | Epic 5 | Déclencher trash via 🗑️ |
| FR25 | Epic 5 | Préférence soft/medium/hardcore |
| FR26 | Epic 3 | Leaderboard weekly |
| FR27 | Epic 5 | Reset lundi 00h01 |
| FR28 | Epic 6/7 | Historique récaps (4 gratuit / illimité premium) |
| FR29 | Epic 6 | Génération récap dimanche 20h |
| FR30 | Epic 6 | Consulter récaps |
| FR31 | Epic 6 | Carte de partage Stories + Feed |
| FR32 | Epic 6 | Partage Instagram/WhatsApp |
| FR33 | Epic 6 | QR code sur carte |
| FR34 | Epic 7 | Achat Pack Savage 4.99€ IAP |
| FR35 | Epic 7 | Activation premium pour tout le groupe |
| FR36 | Epic 7 | Features premium (leaderboards, badges, streak) |
| FR37 | Epic 7 | Referral 3 amis = Pack offert |

### Epic List

### Epic 1 — Fondations & Identité
L'utilisateur peut s'inscrire, se connecter et créer son identité de guerrier.
**FRs couverts :** FR1, FR2, FR3
**AR couverts :** AR1, AR2, AR3, AR4, AR5, AR6
**UX-DR couverts :** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR6

### Epic 2 — Équipes & Invitation
L'utilisateur peut créer une équipe, inviter ses amis en 60 secondes et gérer les membres.
**FRs couverts :** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13
**AR couverts :** AR17, AR18
**UX-DR couverts :** UX-DR7

### Epic 3 — Session & Comptage Caméra
L'utilisateur peut compter ses pompes mains-libres et voir son score sur le leaderboard en temps réel.
**FRs couverts :** FR14, FR15, FR16, FR17, FR18, FR26, FR27
**AR couverts :** AR7, AR9, AR14, AR15, AR16
**UX-DR couverts :** UX-DR9, UX-DR10

### Epic 4 — Feed Social & Réactions
L'équipe peut voir les sessions de chacun, réagir et recevoir des notifications de réaction.
**FRs couverts :** FR19, FR20, FR21
**AR couverts :** AR9 (partie notif réaction)
**UX-DR couverts :** UX-DR8, UX-DR11

### Epic 5 — Notifications & Chambrage Escalatif
Le système génère automatiquement la pression sociale sans intervention humaine.
**FRs couverts :** FR22, FR23, FR24, FR25, FR27
**AR couverts :** AR7, AR8, AR10, AR11
**UX-DR couverts :** (L08 lockscreen — référence visuelle)

### Epic 6 — Récap & Partage Viral
L'équipe vit le rituel dimanche et partage ses exploits pour recruter de nouveaux membres.
**FRs couverts :** FR28 (4 récaps gratuits), FR29, FR30, FR31, FR32, FR33
**AR couverts :** AR8, AR19
**UX-DR couverts :** UX-DR12, UX-DR13

### Epic 7 — Pack Savage & Monétisation
Un membre achète le Pack Savage 4.99€ une fois, toute l'équipe débloque les features premium.
**FRs couverts :** FR34, FR35, FR36, FR37
**AR couverts :** AR12, AR20, AR21, AR22, AR23
**UX-DR couverts :** (paywall intégré L06 + L09)

### Epic 8 — Profil & Réglages
L'utilisateur peut consulter ses stats perso, gérer son compte et paramétrer ses préférences.
**FRs couverts :** FR3 (edit), FR4, FR5
**AR couverts :** AR22
**UX-DR couverts :** UX-DR14, UX-DR15

---

## Epic 1: Fondations & Identité

L'utilisateur peut s'inscrire, se connecter et créer son identité de guerrier.

### Story 1.1: Setup Projet & Fondations Techniques

En tant que développeur,
je veux initialiser le projet avec toute la stack technique configurée,
afin que les développements suivants s'appuient sur une base stable et cohérente.

**Acceptance Criteria:**

**Given** un repo vide
**When** le setup est terminé
**Then** `npx expo start` lance l'app sans erreur sur iOS et Android
**And** TypeScript strict est activé, zéro erreur `tsc --noEmit`
**And** React Navigation v6 est configuré avec AuthStack et MainTabs (écrans placeholder)
**And** Zustand est installé avec un store vide `authStore`
**And** i18next est configuré avec 5 langues (FR/EN/ES/DE/IT), fichiers de traduction vides
**And** Firebase SDK (Auth, Firestore, FCM) est initialisé via variables d'environnement `.env.local`
**And** EAS Build est configuré avec 3 profils (development / preview / production)
**And** les règles Firestore (sécurité membres équipe uniquement) sont déployées en staging
**And** Firebase Analytics SDK est initialisé

### Story 1.2: Design System & Composants de Base

En tant que développeur,
je veux disposer des tokens de design et composants de base,
afin que tous les écrans utilisent un style cohérent sans redéfinir les valeurs.

**Acceptance Criteria:**

**Given** le projet initialisé (Story 1.1)
**When** les composants sont implémentés
**Then** les design tokens sont définis : `bg #FAF7F2`, `accent #00A859`, `red #E5252A`, `gold #E8B400`, `text #0A0A0A`, `textDim`, `textFaint`, `border`, `borderStrong`
**And** les 3 familles de polices sont intégrées et utilisables : Anton, Inter (400/500/600/700/800), JetBrains Mono (500/700)
**And** les 10 avatars SVG (`duck`, `fox`, `wolf`, `bear`, `bull`, `rhino`, `shark`, `gorilla`, `dragon`, `phoenix`) sont disponibles comme composants React Native scalables
**And** un composant `PrimaryButton` (radius 14, padding vertical 16px, Inter 700 uppercase) est fonctionnel
**And** un composant `AvatarCard` avec états `selected` (fond #0A0A0A, ombre élevée) et `idle` (fond blanc, bordure fine) est fonctionnel
**And** le FAB `SessionButton` (64×64, radius 32, ombre verte `0 6px 20px rgba(0,168,89,0.4)`) est fonctionnel

### Story 1.3: Splash Screen & Routing Auth

En tant que nouvel utilisateur,
je veux voir un écran d'accueil percutant et être guidé vers l'inscription ou la connexion,
afin de comprendre immédiatement l'identité du produit.

**Acceptance Criteria:**

**Given** l'utilisateur ouvre l'app pour la première fois (non connecté)
**When** l'app se charge
**Then** le Splash L01 s'affiche : logo "PUMP / IT." Anton 96px (accent vert sur "IT."), tagline JetBrains Mono uppercase, halo radial vert en bas, pattern diagonal 2.5% opacity
**And** le CTA "Commencer" (bouton noir pleine largeur) est visible
**And** le lien "Se connecter" est visible en dessous
**When** l'utilisateur tape "Commencer"
**Then** il est redirigé vers l'étape 1 de l'onboarding (inscription)
**When** l'utilisateur tape "Se connecter"
**Then** il est redirigé vers l'écran de connexion
**Given** l'utilisateur est déjà connecté avec une équipe
**When** l'app se charge
**Then** il atterrit directement sur le Feed (MainTabs) sans passer par le Splash

### Story 1.4: Inscription Email & Connexion

En tant que nouvel utilisateur,
je veux créer un compte avec mon email et me connecter,
afin d'accéder à l'app et d'y persister mes données.

**Acceptance Criteria:**

**Given** l'utilisateur est sur l'écran d'inscription (étape 1/4)
**When** il saisit prénom, email valide et mot de passe ≥ 8 caractères et tape "Continuer"
**Then** un compte Firebase Auth est créé
**And** un document `users/{uid}` est créé dans Firestore avec `username`, `createdAt`, `language` détectée depuis le device
**And** l'utilisateur est redirigé vers l'étape 2/4 (choix avatar)
**Given** l'email est déjà utilisé
**When** l'utilisateur tente de s'inscrire
**Then** un message d'erreur explicite est affiché (i18n)
**Given** l'utilisateur est sur l'écran de connexion
**When** il saisit email + mot de passe corrects
**Then** il est connecté et redirigé vers le Feed (ou vers l'onboarding équipe si pas encore dans une équipe)
**Given** l'email ou le mot de passe est incorrect
**When** l'utilisateur tente de se connecter
**Then** un message d'erreur générique est affiché (sans préciser lequel des deux est faux)

### Story 1.5: Connexion Google Sign-In

En tant qu'utilisateur,
je veux me connecter avec mon compte Google,
afin d'éviter de créer un mot de passe dédié.

**Acceptance Criteria:**

**Given** l'utilisateur est sur l'écran de connexion ou d'inscription
**When** il tape le bouton "Continuer avec Google"
**Then** la popup Google Sign-In s'ouvre (natif iOS / Android)
**When** l'utilisateur choisit son compte Google
**Then** un compte Firebase Auth est créé ou récupéré
**And** si nouveau compte : document `users/{uid}` créé avec `username` pré-rempli depuis Google display name
**And** si nouveau compte : l'utilisateur est redirigé vers étape 2/4 (choix avatar)
**And** si compte existant : l'utilisateur est redirigé vers le Feed

### Story 1.6: Sélection Avatar à l'Inscription (L02)

En tant que nouvel utilisateur,
je veux choisir mon avatar parmi 10 personnages animaux,
afin d'avoir une identité visuelle dans mon équipe.

**Acceptance Criteria:**

**Given** l'utilisateur est à l'étape 2/4 de l'onboarding
**When** l'écran L02 s'affiche
**Then** le stepper "ÉTAPE 2 / 4" est visible en haut
**And** le titre "Choisis ton guerrier." est affiché (Anton, avec "guerrier" en vert accent)
**And** une grid 3 colonnes affiche les 10 avatars avec leur nom en JetBrains Mono uppercase
**When** l'utilisateur tape sur un avatar
**Then** la card passe à l'état sélectionné (fond #0A0A0A, texte crème, ombre élevée)
**And** la sélection précédente repasse à l'état repos
**When** l'utilisateur tape "Continuer →" (vert pleine largeur, désactivé si aucun avatar sélectionné)
**Then** `avatarId` est sauvegardé dans Firestore `users/{uid}`
**And** la user property Firebase Analytics `avatar_id` est mise à jour
**And** l'utilisateur est redirigé vers l'étape 4/4 (équipe)

---

## Epic 2: Équipes & Invitation

L'utilisateur peut créer une équipe, inviter ses amis en 60 secondes et gérer les membres.

### Story 2.1: Créer une Équipe (L03)

En tant qu'utilisateur connecté sans équipe,
je veux créer une équipe et obtenir un code d'invitation,
afin de recruter mes amis immédiatement.

**Acceptance Criteria:**

**Given** l'utilisateur est à l'étape 4/4 de l'onboarding (L03)
**When** l'écran s'affiche
**Then** la carte "Créer une équipe" est visible avec border accent vert + halo radial
**And** le séparateur "OU" et la carte "Rejoindre" sont visibles en dessous
**When** l'utilisateur saisit un nom d'équipe et tape "Créer"
**Then** un document `teams/{teamId}` est créé avec `adminUid`, `memberUids: [uid]`, `memberCount: 1`, `inviteCode` 6 chars uppercase unique, `weeklyScores: {}`, `currentWeekId`
**And** `users/{uid}.teamId` est mis à jour
**And** le deep link `pumpit://join/{inviteCode}` est généré
**And** un QR code encodant ce deep link est généré et affiché
**And** l'utilisateur est redirigé vers le Feed (MainTabs)
**And** l'event Firebase Analytics `team_created` est envoyé avec `team_id`
**Given** le nom d'équipe est vide
**When** l'utilisateur tape "Créer"
**Then** le bouton reste désactivé

### Story 2.2: Rejoindre via Code Manuel (L03)

En tant qu'utilisateur connecté sans équipe,
je veux saisir un code à 6 caractères pour rejoindre une équipe,
afin de m'y connecter depuis n'importe quel device.

**Acceptance Criteria:**

**Given** l'utilisateur est à l'étape 4/4 (L03) ou dans les réglages
**When** il saisit un code 6 caractères dans l'input OTP (6 cases individuelles)
**Then** la saisie auto-avance case par case
**When** les 6 caractères sont saisis
**Then** une recherche Firestore est effectuée sur l'index `inviteCode`
**And** si équipe trouvée et `memberCount < 10` : l'uid est ajouté à `memberUids`, `memberCount` incrémenté, `users/{uid}.teamId` mis à jour
**And** l'utilisateur est redirigé vers le Feed
**And** l'event `team_joined` est envoyé avec `team_id` et `join_method: 'code'`
**Given** le code est invalide ou introuvable
**When** la recherche échoue
**Then** un message d'erreur s'affiche sous l'input (i18n)
**Given** l'équipe est pleine (10 membres)
**When** l'utilisateur tente de rejoindre
**Then** un message "Cette équipe est complète" s'affiche

### Story 2.3: Rejoindre via QR Code et Deep Link

En tant qu'utilisateur,
je veux scanner un QR code ou taper un lien pour rejoindre une équipe,
afin de rejoindre en un tap depuis un partage WhatsApp ou un QR affiché par un ami.

**Acceptance Criteria:**

**Given** l'utilisateur tape un Universal Link `https://pumpit.app/join/{code}` (iOS) ou App Link (Android)
**When** l'app est installée
**Then** l'app s'ouvre directement sur l'écran "Rejoindre" avec le code pré-rempli
**And** la validation et l'ajout à l'équipe suivent le même flow que Story 2.2
**Given** l'app n'est pas installée
**When** l'utilisateur tape le lien
**Then** il est redirigé vers l'App Store / Play Store avec le code en paramètre UTM
**And** après installation et inscription, l'écran L03 s'affiche avec le code pré-rempli
**Given** l'utilisateur est sur L03 et tape l'icône scanner
**When** il pointe la caméra sur un QR code PUMP IT
**Then** le code est lu et pré-rempli dans l'input OTP
**And** l'event `team_joined` est envoyé avec `join_method: 'qr'` ou `'link'`

### Story 2.4: Partager l'Invitation

En tant que membre d'une équipe,
je veux partager le lien ou le QR code de mon équipe,
afin de recruter de nouveaux membres facilement.

**Acceptance Criteria:**

**Given** l'utilisateur est membre d'une équipe
**When** il accède à l'écran "Mon équipe" dans les réglages
**Then** le code d'invitation, le QR code et un bouton "Partager l'invitation" sont visibles
**When** il tape "Partager l'invitation"
**Then** la share sheet native iOS/Android s'ouvre avec le texte : "Rejoins notre équipe sur PUMP IT 💪 Code : {code} ou lien : pumpit.app/join/{code}"
**And** l'event `referral_link_shared` est envoyé avec `team_id` et `share_destination`
**Given** l'utilisateur est admin
**When** il visualise l'écran équipe
**Then** il voit également les options de gestion (kick, transfert) en plus de l'invitation

### Story 2.5: Gestion Admin — Kick et Transfert de Rôle

En tant qu'admin d'une équipe,
je veux pouvoir exclure un membre ou transférer mon rôle,
afin de gérer la composition de l'équipe et assurer sa continuité.

**Acceptance Criteria:**

**Given** l'admin visualise la liste des membres dans les réglages équipe
**When** il appuie longuement sur le nom d'un membre (ou tape "···")
**Then** un menu contextuel propose "Exclure du groupe" et "Nommer admin"
**When** il tape "Exclure du groupe" et confirme
**Then** l'uid est retiré de `memberUids`, `memberCount` décrémenté, `users/{uid}.teamId` mis à null
**And** l'event `member_kicked` est envoyé avec `team_id`
**When** il tape "Nommer admin" et confirme
**Then** `teams/{teamId}.adminUid` est mis à jour vers le nouvel admin
**And** l'ancien admin reçoit une confirmation visuelle in-app
**Given** l'équipe a 2 membres
**When** l'admin exclut l'autre membre
**Then** l'équipe reste valide (l'admin seul peut chercher de nouveaux membres)

### Story 2.6: Quitter une Équipe & Dissolution

En tant que membre d'une équipe,
je veux pouvoir quitter l'équipe, avec une protection spéciale si je suis admin,
afin de partir sans détruire accidentellement le groupe.

**Acceptance Criteria:**

**Given** un membre non-admin tape "Quitter l'équipe" dans les réglages
**When** il confirme
**Then** son uid est retiré de `memberUids`, `users/{uid}.teamId` mis à null
**And** il est redirigé vers l'écran L03 (créer / rejoindre une équipe)
**And** l'event `team_left` est envoyé avec `team_id`
**Given** l'admin tape "Quitter l'équipe"
**When** la confirmation s'affiche
**Then** un avertissement spécifique s'affiche : "Tu es admin. Si tu pars sans transférer, l'équipe sera dissoute."
**And** deux options sont proposées : "Transférer l'admin" et "Quitter et dissoudre"
**When** l'admin choisit "Quitter et dissoudre" et confirme
**Then** le document `teams/{teamId}` est marqué `dissolved: true`
**And** `teamId` est mis à null pour tous les `memberUids`
**And** tous les membres reçoivent une notification push : "L'équipe {nom} a été dissoute."

---

## Epic 3: Session & Comptage Caméra

L'utilisateur peut compter ses pompes mains-libres et voir son score sur le leaderboard en temps réel.

### Story 3.1: Pipeline de Détection Caméra

En tant que développeur,
je veux intégrer la détection visage et le comptage de reps dans un Frame Processor,
afin que le comptage soit fiable, instantané et fonctionne offline.

**Acceptance Criteria:**

**Given** `react-native-vision-camera` v4 et MLKit Face Detection (modèle embarqué < 3MB) sont installés
**When** le Frame Processor est actif
**Then** chaque frame est traitée en < 150ms (NFR1)
**And** les 3 états sont exposés : `CALIBRATING` (10 premières frames avec visage), `FACE_OK`, `FACE_NOT_DETECTED`
**When** un cycle descente → montée est détecté (nez Y > baseY + 15% frameHeight puis Y < baseY + 5% frameHeight)
**Then** `repsCount` est incrémenté de 1
**And** un haptic feedback léger est déclenché
**And** l'anti-rebond de 400ms bloque tout nouveau comptage immédiat
**Given** le visage quitte le cadre pendant une session
**When** `FACE_NOT_DETECTED` est actif
**Then** aucune rep n'est comptée jusqu'au retour du visage (FR18)
**Given** un Samsung Galaxy A34 ou iPhone 11
**When** le Frame Processor tourne
**Then** la précision de détection est > 90% en conditions intérieur/lumière normale (NFR18)

### Story 3.2: Écran Session Caméra (L05)

En tant que membre d'une équipe,
je veux lancer une session depuis la tab bar et voir mon compteur en direct,
afin de suivre mes pompes en temps réel face à mon téléphone.

**Acceptance Criteria:**

**Given** l'utilisateur tape le FAB "+" dans la tab bar
**When** l'écran L05 s'ouvre (modal plein écran)
**Then** la caméra frontale s'active après permission accordée
**And** le background affiche un gradient crème → vert pâle
**And** la pill de statut visage est visible : "VISAGE OK" (vert) ou "VISAGE NON DÉTECTÉ" (rouge) + chrono JetBrains Mono
**And** le compteur de reps Anton 220px est centré à l'écran
**And** le bouton STOP rouge 80×80 avec carré blanc est visible en bas
**Given** la permission caméra n'a pas encore été accordée
**When** l'utilisateur tape le FAB
**Then** la demande de permission s'affiche avec le texte "Pour compter tes pompes mains-libres" (i18n)
**Given** la permission est refusée
**When** l'utilisateur tape le FAB
**Then** un message explicatif avec lien vers les réglages système s'affiche
**And** l'event `session_started` est envoyé avec `team_id` et `avatar_id`

### Story 3.3: Fin de Session & Post du Score

En tant que membre d'une équipe,
je veux terminer ma session et poster mon score dans l'équipe,
afin qu'il apparaisse sur le leaderboard et dans le feed.

**Acceptance Criteria:**

**Given** l'utilisateur tape STOP pendant une session
**When** la session se termine
**Then** un écran de récap session s'affiche : nombre de reps, durée, cadence (reps/min), badge "RECORD PERSO 🏆" si applicable
**And** un bouton "Poster" (vert) et un bouton "Annuler" sont visibles
**When** l'utilisateur tape "Poster"
**Then** un document `sessions/{sessionId}` est créé dans Firestore
**And** la Cloud Function `onSessionPosted` met à jour `weeklyScores[uid]` dans le document équipe
**And** `users/{uid}.totalReps` et `lastActiveAt` sont mis à jour
**And** le leaderboard se met à jour en < 3 secondes (NFR3)
**And** l'utilisateur est redirigé vers le Feed
**And** l'event `session_completed` est envoyé avec `reps_count`, `duration_seconds`, `team_id`
**When** l'utilisateur tape "Annuler"
**Then** la session n'est pas postée et l'event `session_abandoned` est envoyé
**Given** l'utilisateur est hors connexion au moment du post
**When** il tape "Poster"
**Then** la session est mise en queue locale avec indicateur "En attente de connexion"
**And** la session est postée automatiquement dans les 30 secondes après retour réseau (NFR9)

### Story 3.4: Leaderboard Weekly (L06)

En tant que membre d'une équipe,
je veux consulter le classement de la semaine en cours,
afin de savoir où j'en suis par rapport à mes adversaires.

**Acceptance Criteria:**

**Given** l'utilisateur est sur l'onglet Leaderboard (L06)
**When** l'écran se charge
**Then** le chargement s'effectue en < 2 secondes sur 4G (NFR2)
**And** un toggle 3 onglets est visible : "Semaine" (actif) / "Mois" (verrouillé 🔒) / "All-time" (verrouillé 🔒)
**And** la card #1 affiche le champion avec gradient or → vert, couronne, avatar, score
**And** les membres #2 à N sont listés avec avatar, pseudo, score, trend +/- JetBrains Mono (vert/rouge)
**And** la ligne de l'utilisateur courant est surlignée en vert accent
**When** un membre poste une session
**Then** le leaderboard se met à jour en temps réel via listener Firestore (< 3s NFR3)
**Given** l'utilisateur tape sur un onglet verrouillé
**When** il tape
**Then** un tooltip d'upsell Pack Savage s'affiche (implémenté en Epic 7)

### Story 3.5: Reset Weekly Automatique

En tant que membre d'une équipe,
je veux que les scores repartent à zéro chaque lundi à minuit,
afin que chaque semaine soit une nouvelle chance de prendre la tête.

**Acceptance Criteria:**

**Given** la Cloud Function `weeklyReset` est déployée avec le cron `1 0 * * MON` (Europe/Paris)
**When** le lundi 00h01 arrive
**Then** pour chaque équipe active : `weeklyScores` est réinitialisé à `{}` et `currentWeekId` mis à jour
**And** une notification push "Reset ! La semaine repart à zéro. 🔄" est envoyée à tous les membres
**And** le leaderboard affiche tous les membres à 0 rep
**Given** la Cloud Function échoue
**When** une erreur survient
**Then** un retry automatique est déclenché dans les 5 minutes (NFR6)
**And** si 3 échecs consécutifs : une alerte est générée dans les logs Firebase

---

## Epic 4: Feed Social & Réactions

L'équipe peut voir les sessions de chacun, réagir et recevoir des notifications de réaction.

### Story 4.1: Feed Chronologique de l'Équipe (L04)

En tant que membre d'une équipe,
je veux voir les sessions récentes de tous mes coéquipiers sur un feed,
afin de suivre l'activité du groupe en temps réel.

**Acceptance Criteria:**

**Given** l'utilisateur est sur l'onglet Feed (L04)
**When** l'écran se charge
**Then** le header affiche le nom de l'équipe (Anton, mot fort en vert accent) + la semaine courante + badge rouge "N LIVE" si sessions actives
**And** une card podium top 3 est affichée : avatar, score, barres dégradées (or → vert pour #1, vert → rouge pour les autres)
**And** la liste d'activité affiche les sessions chronologiquement : avatar, pseudo, compteur reps en vert, badge "RECORD 🏆" si applicable, compteurs 💪 (vert) et 🗑️ (rouge)
**And** le chargement initial s'effectue en < 2 secondes (NFR2)
**When** un membre poste une session
**Then** la session apparaît en haut du feed via listener Firestore temps réel
**When** l'utilisateur scrolle jusqu'en bas
**Then** les sessions plus anciennes sont chargées par pagination (10 par page)

### Story 4.2: Écran Détail d'une Session (L07)

En tant que membre d'une équipe,
je veux voir le détail d'une session spécifique avec toutes ses stats,
afin d'apprécier ou chambrer la performance d'un coéquipier.

**Acceptance Criteria:**

**Given** l'utilisateur tape sur une session dans le feed
**When** l'écran L07 s'ouvre
**Then** la card session affiche : avatar du posteur, badge "VALIDÉ" gold, compteur reps en grand (vert), stats durée/cadence/RECORD (JetBrains Mono)
**And** les boutons 💪 (vert), 🗑️ (rouge) et "+" sont visibles avec leur compteur
**And** la liste des chambrages reçus est affichée (si existants)
**And** un input "Balance ton chambrage…" avec bouton envoi vert est en bas de l'écran

### Story 4.3: Réactions 💪 et 🗑️

En tant que membre d'une équipe,
je veux réagir aux sessions de mes coéquipiers avec 💪 ou 🗑️,
afin d'encourager ou de provoquer mes adversaires.

**Acceptance Criteria:**

**Given** l'utilisateur voit une session dans le feed ou dans L07
**When** il tape 💪 (props)
**Then** son uid est ajouté à `sessions/{id}.reactions.props` dans Firestore
**And** le compteur 💪 s'incrémente visuellement immédiatement (optimistic update)
**And** si l'utilisateur a déjà mis 💪, le tap annule la réaction (toggle)
**When** il tape 🗑️ (trash)
**Then** son uid est ajouté à `sessions/{id}.reactions.trash`
**And** l'event `props_reaction_sent` ou `trash_reaction_sent` est envoyé avec `team_id` et `target_user_id`
**Given** l'utilisateur tente de réagir à sa propre session
**When** il tape une réaction
**Then** les boutons de réaction sont désactivés sur ses propres sessions

### Story 4.4: Notification de Réaction à l'Auteur

En tant qu'auteur d'une session,
je veux recevoir une notification quand quelqu'un réagit à ma session,
afin d'être informé de l'engagement de mon équipe.

**Acceptance Criteria:**

**Given** un membre réagit à une session avec 💪 ou 🗑️
**When** la réaction est enregistrée dans Firestore
**Then** la Cloud Function `onSessionPosted` envoie une notification push à l'auteur
**And** le contenu est : "💪 {pseudo} t'a mis un props !" ou "🗑️ {pseudo} a mis ta session à la poubelle" (i18n)
**And** la notification est délivrée en < 10 secondes (NFR5)
**And** taper la notification ouvre l'écran L07 de la session concernée
**And** l'event `notification_opened` est envoyé avec `notification_type: 'reaction'` et `team_id`
**Given** l'auteur a désactivé les notifications dans ses réglages device
**When** une réaction est enregistrée
**Then** aucune notification n'est envoyée (respect des préférences système)

---

## Epic 5: Notifications & Chambrage Escalatif

Le système génère automatiquement la pression sociale sans intervention humaine.

### Story 5.1: Opt-in Notifications & Permissions

En tant que membre d'une équipe,
je veux être invité à activer les notifications au bon moment,
afin de recevoir le chambrage sans avoir été spammé dès l'ouverture de l'app.

**Acceptance Criteria:**

**Given** l'utilisateur vient de rejoindre ou créer une équipe
**When** il arrive sur le Feed pour la première fois
**Then** une bottom sheet s'affiche : "Pour te tenir au courant quand tes amis bougent 🔥" avec bouton "Activer" et lien "Plus tard"
**When** il tape "Activer"
**Then** la demande de permission push native iOS/Android s'affiche
**When** la permission est accordée
**Then** le `fcmToken` est sauvegardé dans `users/{uid}.fcmToken`
**And** le rate limiting est activé : max 5 notifications/jour/utilisateur (NFR15)
**Given** l'utilisateur tape "Plus tard"
**When** il revient dans l'app 24h plus tard
**Then** la bottom sheet se représente une seule fois supplémentaire

### Story 5.2: Notifications Contextuelles Automatiques

En tant que membre d'une équipe,
je veux recevoir des notifications quand l'activité de mon groupe change,
afin d'être dans la compétition en permanence.

**Acceptance Criteria:**

**Given** un membre dépasse l'utilisateur au leaderboard
**When** `onSessionPosted` détecte le dépassement
**Then** une notification haute priorité est envoyée en < 10s (NFR5) : "😤 {pseudo} vient de te passer devant. T'as peur ?" (i18n)
**And** l'event `notification_opened` avec `notification_type: 'overtaken'` est tracé à l'ouverture
**Given** un membre poste une session
**When** `onSessionPosted` s'exécute
**Then** une notification normale est envoyée aux membres de l'équipe (sauf l'auteur) : "💪 {pseudo} vient de faire {N} pompes — il est #{rang}" (i18n)
**And** le rate limiting de 5 notifs/jour/user est respecté (NFR15)
**Given** l'utilisateur bat son record personnel
**When** `isPersonalRecord: true` est détecté
**Then** une notification de félicitation est envoyée à l'auteur : "🏆 Nouveau record perso ! {N} pompes." (i18n)

### Story 5.3: Banque de Templates Chambrage 4 Degrés

En tant que membre d'une équipe,
je veux recevoir des messages de chambrage dont l'intensité monte au fil de la semaine,
afin que la pression soit maximale en fin de semaine.

**Acceptance Criteria:**

**Given** le système détermine le degré de chambrage selon le jour courant
**When** un message est sélectionné
**Then** Degré 1 (lundi-mardi) Taquin, Degré 2 (mercredi) Compétitif, Degré 3 (jeudi-vendredi) Savage, Degré 4 (samedi-dimanche) Légendaire
**And** une banque d'au moins 5 templates par degré est disponible côté Cloud Function
**And** le template est sélectionné aléatoirement dans la banque du degré courant
**And** les variables `{pseudo_cible}`, `{pseudo_devant}`, `{écart_reps}`, `{rang_cible}` sont substituées dynamiquement
**And** les templates respectent la préférence `trashLevel` de l'utilisateur cible (soft/medium/hardcore)
**And** les templates sont disponibles en FR, EN, ES, DE, IT

### Story 5.4: Réaction 🗑️ → Déclenchement Chambrage

En tant que membre d'une équipe,
je veux qu'un tap sur 🗑️ déclenche un message de chambrage automatique,
afin de provoquer mes adversaires d'un seul geste.

**Acceptance Criteria:**

**Given** l'utilisateur tape 🗑️ sur la session d'un coéquipier
**When** la réaction est enregistrée
**Then** la Cloud Function `onTrashReaction` se déclenche
**And** un template du degré courant est sélectionné (Story 5.3)
**And** une notification push est envoyée à l'auteur en < 10 secondes (NFR5)
**And** le message est écrit dans `chambrages/{id}` avec `trigger: 'trash_reaction'`, `degree`, `senderUid`, `targetUid`, `sentAt`
**And** l'event `chambrage_received` est envoyé avec `degree` et `team_id`
**Given** les Cloud Functions reçoivent 100 appels simultanés
**When** plusieurs 🗑️ sont déclenchés en même temps
**Then** aucune dégradation de performance n'est observée (NFR16)

### Story 5.5: Scheduler Inactivité 48h/72h

En tant que membre inactif,
je veux recevoir des messages d'inactivité escalatifs,
afin d'être rappelé à l'ordre par mon groupe avant de rater toute la semaine.

**Acceptance Criteria:**

**Given** la Cloud Function `chambrageScheduler` tourne toutes les 6h
**When** un utilisateur n'a pas posté de session depuis 48h dans une équipe active
**Then** un chambrage degré courant est envoyé à 19h heure locale : "💤 {pseudo} dort depuis 2 jours…" (i18n)
**And** le rate limiting bloque un second chambrage automatique dans les 24h suivantes
**When** l'inactivité atteint 72h
**Then** un chambrage de degré +1 est envoyé à 19h heure locale
**And** "Tout le monde a bougé aujourd'hui. Toi non." est envoyé si tous les autres membres ont une session dans la journée
**And** l'event `chambrage_received` est envoyé avec `trigger: 'inactivity_48h'` ou `'inactivity_72h'`

### Story 5.6: Préférence Niveau Trash

En tant qu'utilisateur,
je veux contrôler l'intensité des chambrages que je reçois,
afin d'adapter l'expérience à mon niveau de sensibilité.

**Acceptance Criteria:**

**Given** l'utilisateur est dans les réglages (L12)
**When** il accède à la section Notifications
**Then** un sélecteur "Niveau de chambrage" est visible avec 3 options : Soft 🕊️ / Medium 🔥 / Hardcore 💀
**When** il sélectionne un niveau
**Then** `users/{uid}.trashLevel` est mis à jour dans Firestore
**And** la user property Firebase Analytics `trash_level` est mise à jour
**And** tous les chambrages futurs respectent ce niveau
**Given** un nouvel utilisateur s'inscrit
**When** son document est créé
**Then** `trashLevel` est initialisé à `'medium'` par défaut

---

## Epic 6: Récap & Partage Viral

L'équipe vit le rituel dimanche et partage ses exploits pour recruter de nouveaux membres.

### Story 6.1: Cloud Function Récap Dimanche

En tant que membre d'une équipe,
je veux qu'un récap complet soit généré automatiquement chaque dimanche à 20h,
afin de clôturer la semaine avec un rituel attendu.

**Acceptance Criteria:**

**Given** la Cloud Function `sundayRecap` est déployée avec le cron `0 19 * * SUN` (UTC = 20h Paris)
**When** le dimanche 20h arrive
**Then** pour chaque équipe ayant au moins 1 session dans la semaine :
**And** le classement final est calculé depuis `weeklyScores`
**And** le champion (max reps) et l'absent honteux (0 reps) sont identifiés
**And** les fun stats sont calculées : plus grosse session, plus régulier, plus props reçus, plus trasché, meilleure progression vs semaine précédente
**And** un document `weeklyRecaps/{teamId}_{weekId}` est écrit avec toutes ces données
**And** une notification haute priorité est envoyée à tous les membres : "🏆 Le verdict tombe. Qui a gagné ?" (i18n)
**And** la tolérance d'exécution est de ±10 minutes (NFR7)
**Given** la Cloud Function échoue
**When** une erreur survient
**Then** un retry automatique est déclenché et une alerte générée dans les logs

### Story 6.2: Écran Récap Dimanche (L09)

En tant que membre d'une équipe,
je veux voir le récap de ma semaine avec le champion et les stats fun,
afin de vivre le rituel de clôture hebdomadaire.

**Acceptance Criteria:**

**Given** la notification de récap est reçue ou l'utilisateur ouvre l'app dimanche soir
**When** il accède au récap
**Then** l'écran L09 s'affiche avec :
**And** la section champion : gradient or → vert, couronne, avatar 88px, pseudo, score en grand
**And** la section "absent honteux" 💤 avec border rouge (si applicable)
**And** la grid 2×2 fun stats (plus grosse session, plus régulier, plus props, plus trasché)
**And** le CTA "Partager en story" (bouton noir pleine largeur) en bas
**And** l'event `recap_viewed` est envoyé avec `team_id` et `week_number`
**Given** l'équipe n'a aucune session dans la semaine
**When** le récap est consulté
**Then** un message "Personne n'a bougé cette semaine 😴 — Recommencez lundi !" est affiché

### Story 6.3: Historique des Récaps (4 Gratuits)

En tant que membre d'une équipe,
je veux consulter les 4 derniers récaps hebdomadaires,
afin de suivre l'évolution du groupe dans le temps.

**Acceptance Criteria:**

**Given** l'utilisateur accède à la section récaps
**When** la liste s'affiche
**Then** les 4 derniers `weeklyRecaps` de son équipe sont listés du plus récent au plus ancien
**And** chaque entrée affiche : semaine, champion, score, absent honteux si applicable
**And** le 5ème récap et au-delà sont masqués derrière un verrou 🔒 "Débloque avec Pack Savage"
**When** l'utilisateur tape sur un récap
**Then** l'écran L09 s'affiche avec les données de cette semaine
**And** l'event `recap_viewed` est envoyé avec le `week_number` correspondant

### Story 6.4: Génération Carte de Partage (L10)

En tant que champion ou membre d'une équipe,
je veux une carte de partage générée automatiquement après le récap,
afin d'avoir un visuel prêt à poster sur mes réseaux.

**Acceptance Criteria:**

**Given** l'utilisateur tape "Partager en story" sur l'écran L09
**When** la carte est générée
**Then** `react-native-view-shot` capture un composant au format 1080×1920 (Stories)
**And** la carte L10 contient : logo "⚡ PUMP IT" + ligne pointillée verte, avatar champion dans cercle vert + double ring (blanc + or) + couronne, nom équipe Anton, score Anton 130px, footer équipe + semaine
**And** la carte contient un QR code encodant `pumpit.app/join/{inviteCode}` de l'équipe
**And** la carte est sauvegardée dans la galerie du device
**And** l'event `story_card_generated` est envoyé avec `team_id` et `card_type: 'champion'`
**And** la génération s'effectue en < 3 secondes

### Story 6.5: Partage Social

En tant que membre d'une équipe,
je veux partager ma carte de résultats sur mes réseaux sociaux,
afin de recruter de nouveaux membres via le QR code intégré.

**Acceptance Criteria:**

**Given** la carte est générée (Story 6.4)
**When** l'utilisateur tape "Partager"
**Then** la share sheet native iOS/Android s'ouvre avec la carte en pièce jointe
**And** Instagram, WhatsApp et toutes les apps de partage installées sont disponibles
**When** l'utilisateur sélectionne une destination
**Then** l'event `recap_shared` est envoyé avec `team_id`, `share_destination` et `week_number`
**Given** une personne scanne le QR code sur la carte partagée
**When** elle n'a pas l'app
**Then** elle est redirigée vers l'App Store / Play Store avec le code d'invitation pré-rempli

---

## Epic 7: Pack Savage & Monétisation

Un membre achète le Pack Savage 4.99€ une fois, toute l'équipe débloque les features premium.

### Story 7.1: Paywall & Achat Pack Savage

En tant que membre d'une équipe,
je veux pouvoir acheter le Pack Savage d'un tap,
afin de débloquer les features premium pour tout mon groupe.

**Acceptance Criteria:**

**Given** RevenueCat est configuré avec le produit `pumpit_pack_savage` (one-shot 4.99€), l'entitlement `premium`, et le metadata `teamId` passé à l'achat
**When** l'utilisateur tape sur un élément verrouillé
**Then** un bottom sheet paywall s'affiche : titre "Pack Savage", liste des features débloquées, prix "4.99€ — une fois pour toute l'équipe", bouton "Débloquer pour mon équipe" (vert)
**When** il tape "Débloquer pour mon équipe"
**Then** la feuille d'achat native Apple/Google s'ouvre (StoreKit 2 iOS / Google Play Billing v5)
**When** l'achat est confirmé par le store
**Then** RevenueCat valide la transaction et déclenche le webhook `INITIAL_PURCHASE`
**And** l'event `pack_savage_purchased` est envoyé avec `team_id`, `price: 4.99`, `currency`
**And** l'event est dupliqué dans RevenueCat pour réconciliation
**Given** l'équipe est déjà premium
**When** l'utilisateur voit le paywall
**Then** le bouton affiche "Déjà débloqué par {pseudo}" et n'est pas cliquable

### Story 7.2: Activation Premium pour le Groupe

En tant que membre ayant acheté le Pack Savage,
je veux que toute mon équipe bénéficie immédiatement des features premium,
afin d'être le héros du groupe.

**Acceptance Criteria:**

**Given** le webhook RevenueCat `INITIAL_PURCHASE` est reçu par la Cloud Function `onPackSavagePurchased`
**When** la signature RevenueCat est vérifiée
**Then** `teams/{teamId}.isPremium` est mis à `true` et `premiumActivatedBy` à l'uid de l'acheteur
**And** `isPremium: true` est mis à jour dans `users/{uid}` pour chaque `memberUid` de l'équipe
**And** une notification push est envoyée à tous les membres : "👑 {pseudo} vient d'offrir le Pack Savage à toute l'équipe !"
**And** l'event `pack_savage_unlocked` est envoyé avec `team_id` et `triggered_by: 'purchase'`
**Given** un nouveau membre rejoint l'équipe après l'achat
**When** son `teamId` est mis à jour
**Then** son `isPremium` est automatiquement mis à `true`

### Story 7.3: Features Premium Débloquées

En tant que membre d'une équipe premium,
je veux accéder aux leaderboards mensuel et all-time, à l'historique illimité et aux badges,
afin de profiter de toutes les dimensions compétitives du jeu.

**Acceptance Criteria:**

**Given** `isPremium: true` pour l'utilisateur
**When** il tape sur l'onglet "Mois" ou "All-time" dans L06
**Then** le leaderboard correspondant s'affiche sans verrou
**When** il accède à l'historique des récaps
**Then** tous les récaps sont accessibles sans limite
**When** il consulte son profil (L11)
**Then** le badge 👑 est affiché à côté de son avatar
**And** le streak tracker est visible (jours consécutifs avec ≥1 session, en vert)
**Given** `isPremium: false`
**When** l'utilisateur accède à l'une de ces features
**Then** le verrou et le paywall s'affichent systématiquement

### Story 7.4: Referral 3 Amis Actifs = Pack Offert

En tant que membre actif,
je veux obtenir le Pack Savage gratuitement en parrainant 3 amis,
afin d'être récompensé pour avoir fait grandir la communauté.

**Acceptance Criteria:**

**Given** l'utilisateur partage son lien d'invitation
**When** un ami rejoint via ce lien et poste au moins 1 session
**Then** le `referralCount` de l'utilisateur est incrémenté de 1 dans Firestore
**And** une notification de progression est envoyée : "{N}/3 amis actifs pour ton Pack Savage gratuit."
**When** `referralCount >= 3`
**Then** la Cloud Function `onReferralCompleted` active le Pack Savage sur l'équipe
**And** l'event `referral_completed` est envoyé avec `team_id` et `referee_count: 3`
**And** l'event `pack_savage_unlocked` est envoyé avec `triggered_by: 'referral'`
**And** une notification est envoyée : "Pack Savage débloqué ! Tu l'as gagné."
**Given** un ami a déjà rejoint via un autre lien
**When** l'attribution est calculée
**Then** seul le premier parrain est crédité

### Story 7.5: Restaurer les Achats & Surfaces Upsell

En tant qu'utilisateur ayant déjà acheté le Pack Savage,
je veux pouvoir restaurer mon achat sur un nouvel appareil,
afin de ne pas repayer ce que j'ai déjà payé.

**Acceptance Criteria:**

**Given** l'utilisateur est dans les réglages (L12)
**When** il tape "Restaurer les achats"
**Then** RevenueCat vérifie l'entitlement `premium` pour cet Apple/Google account
**When** un achat valide est trouvé
**Then** `isPremium` est remis à `true` pour l'utilisateur et son équipe
**And** un message de confirmation s'affiche : "Pack Savage restauré"
**When** aucun achat n'est trouvé
**Then** un message s'affiche : "Aucun achat trouvé pour ce compte."
**Given** l'utilisateur arrive sur un écran verrouillé depuis une notification
**When** le paywall s'affiche
**Then** le contexte de la notification est visible dans le paywall

---

## Epic 8: Profil & Réglages

L'utilisateur peut consulter ses stats perso, gérer son compte et paramétrer ses préférences.

### Story 8.1: Écran Profil (L11)

En tant que membre d'une équipe,
je veux consulter mes statistiques personnelles et mon historique,
afin de mesurer ma progression sur le long terme.

**Acceptance Criteria:**

**Given** l'utilisateur est sur l'onglet Profil (L11)
**When** l'écran se charge
**Then** le header affiche un halo radial vert, l'avatar 84px entouré d'un ring vert, le pseudo, et le badge 👑 si premium
**And** 3 stats sont visibles : pompes cette semaine / total all-time / streak courant (en vert accent)
**And** une heatmap 30 derniers jours est affichée (grille 15×2 cellules, opacité variable selon l'intensité — 0 rep = transparent, max = vert plein)
**And** un carrousel de badges est visible : badges obtenus colorés, badges verrouillés en grisé
**And** la liste des 10 sessions récentes est affichée avec date, reps, durée
**Given** l'utilisateur n'a aucune session
**When** l'écran se charge
**Then** la heatmap est vide et un message d'encouragement s'affiche

### Story 8.2: Modifier Pseudo et Avatar

En tant qu'utilisateur,
je veux pouvoir changer mon pseudo et mon avatar depuis mon profil,
afin de mettre à jour mon identité dans l'équipe.

**Acceptance Criteria:**

**Given** l'utilisateur est sur son profil (L11)
**When** il tape le bouton "Modifier"
**Then** un bottom sheet s'ouvre avec un champ texte pour le pseudo et la grid d'avatars (même UI que L02)
**When** il modifie son pseudo et tape "Sauvegarder"
**Then** `users/{uid}.username` est mis à jour dans Firestore
**And** le nouveau pseudo apparaît dans le feed et le leaderboard en temps réel
**When** il sélectionne un nouvel avatar et tape "Sauvegarder"
**Then** `users/{uid}.avatarId` est mis à jour dans Firestore
**And** la user property Firebase Analytics `avatar_id` est mise à jour
**Given** le pseudo fait moins de 2 caractères
**When** l'utilisateur tape "Sauvegarder"
**Then** le bouton reste désactivé avec un message de validation

### Story 8.3: Écran Réglages (L12)

En tant qu'utilisateur,
je veux accéder à toutes mes préférences et options de gestion depuis un écran dédié,
afin de configurer l'app selon mes besoins.

**Acceptance Criteria:**

**Given** l'utilisateur est sur l'onglet Réglages (L12)
**When** l'écran se charge
**Then** 4 sections sont visibles en cards style iOS groupé radius 14 :
**And** **Compte** : pseudo, email, avatar (lien vers Story 8.2), langue de l'app (sélecteur FR/EN/ES/DE/IT)
**And** **Notifications** : toggle "Activées/Désactivées" (vert quand actif), sélecteur niveau trash (Story 5.6), toggle "Récap dimanche"
**And** **Équipe** : nom, code d'invitation, bouton "Partager l'invitation", bouton "Restaurer les achats", liste membres avec gestion admin
**And** **Zone rouge** : items en rouge — "Quitter l'équipe", "Supprimer mon compte"
**When** l'utilisateur modifie la langue
**Then** l'interface bascule dans la nouvelle langue sans redémarrage (i18next)
**When** il tape "Quitter l'équipe"
**Then** le flow de Story 2.6 est déclenché

### Story 8.4: Suppression de Compte

En tant qu'utilisateur,
je veux pouvoir supprimer mon compte et toutes mes données,
afin d'exercer mon droit à l'oubli (RGPD).

**Acceptance Criteria:**

**Given** l'utilisateur tape "Supprimer mon compte" dans la Zone rouge (L12)
**When** la confirmation s'affiche
**Then** un avertissement liste les données qui seront supprimées : profil, sessions, réactions, chambrages
**And** une confirmation en deux étapes est requise : tap "Supprimer" puis saisir "SUPPRIMER" puis tap "Confirmer"
**When** la suppression est confirmée
**Then** si admin d'une équipe : le flow de transfert/dissolution (Story 2.6) est déclenché en premier
**And** le compte Firebase Auth est supprimé
**And** le document `users/{uid}` est supprimé
**And** toutes les sessions de cet uid sont anonymisées (userId remplacé par `[deleted]`)
**And** la suppression complète s'effectue dans les 30 jours (RGPD — traitement async via Cloud Function)
**And** l'utilisateur est déconnecté et redirigé vers le Splash (L01)
**Given** l'utilisateur est le seul membre de son équipe
**When** la suppression est confirmée
**Then** l'équipe est dissoute automatiquement avant la suppression du compte
