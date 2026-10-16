---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - /Users/chris_/Documents/SPEC_PumpIt.md
  - /Users/chris_/Downloads/design_handoff_pump_it/README.md
  - /Users/chris_/Downloads/design_handoff_pump_it/screens-light.jsx
workflowType: prd
projectName: PUMP IT
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: mobile_app
  domain: general
  complexity: medium
  projectContext: greenfield
decisions:
  platform: iOS + Android
  teamSize: 2-10 membres
  theme: Light + vert (#00A859)
  avatars: Animaux avec noms punés (Duck Norris, etc.)
  monetization: One-shot 4.99€ Pack Savage
  trashLevels: soft / medium / hardcore (user-controlled)
---

# Product Requirements Document — PUMP IT

**Auteur :** Chris_ & Delphine
**Date :** 2026-04-30

## Executive Summary

PUMP IT est un jeu social mobile (iOS + Android) dans lequel des groupes d'amis (2 à 10 personnes) se livrent à une guerre de pompes hebdomadaire. Le produit n'est pas une app fitness — c'est un moteur de pression sociale automatisée où l'exercice physique est la mécanique de jeu, et la honte ou la gloire est le vrai produit.

**Problème adressé :** Les groupes d'amis qui tentent de se motiver mutuellement pour le sport échouent systématiquement parce que maintenir la dynamique sociale repose sur l'effort individuel, qui s'épuise en 2 à 3 semaines. WhatsApp offre zéro structure, zéro mémoire, zéro pression automatisée.

**Utilisateur cible :** Hommes et femmes 18-35 ans, actifs socialement, déclenchés par un pari impulsif entre amis ("on fait ça ce soir ?"). Pas des sportifs cherchant un outil de performance — des gens qui veulent jouer et gagner contre leurs amis.

**Déclencheur produit :** Le pari autour d'une table. L'onboarding est conçu pour être complété à plusieurs en moins de 60 secondes — création d'équipe, code 6 caractères, QR code, deep link.

### Ce qui rend PUMP IT unique

**Le Système de Chambrage Escalatif** est le différenciateur central et non-copiable à court terme. Contrairement aux apps de fitness social (Pushup Social, Strava) qui proposent un following public individuel, PUMP IT génère automatiquement une pression sociale contextuelle croissante au sein de groupes privés :

- **Degrés 1-2 (lundi-mercredi)** : Taquin → Compétitif
- **Degrés 3-4 (jeudi-dimanche)** : Savage → Légendaire

Les messages sont générés par Claude API à partir des données réelles du groupe (noms, scores, écarts, historique) — personnalisés, dévastateurs, et impossibles à reproduire avec WhatsApp.

**Le rituel weekly** — reset lundi 00h01, récap cinématique dimanche 20h — crée une urgence récurrente qui maintient l'engagement au-delà de la nouveauté.

**La détection caméra face-visible** (validée par Pushup Social) fournit le comptage mains-libres et un anti-triche social suffisant pour des groupes d'amis.

**Monétisation :** One-shot 4.99€ "Pack Savage" — une personne achète pour tout le groupe, débloquant le chambrage IA, le récap animé, et les badges. Mécanisme referral : 3 amis invités = Pack Savage offert.

### Périmètre MVP (Lots 1-4, ~3.5 mois)

- Auth (email + Google) + profil + sélection avatar (10 personnages animaux)
- Création équipe (2-10 membres) + code 6 chars + QR code + deep link
- Comptage pompes par caméra (face detection — visage visible = rep valide)
- Leaderboard weekly (reset automatique lundi 00h01)
- Feed chronologique des sessions + réactions 💪 / 🗑️
- Push notifications contextuelles (dépassé, inactif, session postée)
- Chambrage escalatif 4 degrés (templates pré-écrits, sans IA)
- Récap dimanche 20h (classement final + stats fun + carte de partage Stories/Feed)
- Pack Savage one-shot 4.99€ (RevenueCat) — 1 acheteur débloque pour tout le groupe
- Referral : 3 amis invités actifs = Pack Savage offert

## Classification Projet

| Critère | Valeur |
|---|---|
| **Type** | Application mobile cross-platform (React Native + Expo) |
| **Domaine** | Social fitness gamifié — aucune régulation sectorielle |
| **Complexité** | Medium — caméra IA, notifications contextuelles, paiement, Claude API, 2 stores |
| **Contexte** | Greenfield — aucune codebase existante |
| **Équipe** | 2 développeurs en CDI, 6h/semaine chacun (12h/sem total) |
| **Concurrent direct** | Pushup Social (tracking individuel) — gap : pas de groupe privé, pas de chambrage |

## Critères de Succès

### Succès Utilisateur

| Critère | Cible | Indicateur |
|---|---|---|
| Rétention semaine 2 | > 60% des membres actifs | Au moins 1 session postée en S2 |
| Rétention semaine 4 | > 40% des membres actifs | Le groupe ne meurt pas |
| Fréquence | 3+ sessions/semaine/membre actif | Engagement réel, pas juste inscription |
| "Aha moment" | < 48h après inscription | Premier chambrage reçu → ouverture immédiate |
| Récap consulté | > 75% des membres | Le rituel dimanche fonctionne |

### Succès Business

| Horizon | Cible |
|---|---|
| M+1 (validation) | 5 groupes actifs pilotes (amis/famille) — données réelles |
| M+3 (product-market fit) | 20 groupes actifs, 1 acheteur Pack Savage par groupe en moyenne |
| M+6 (croissance) | 100 groupes actifs, coefficient viral > 0.5 (1 groupe → 0.5 nouveau groupe) |

### Succès Technique

- Onboarding complet (2 membres dans une équipe) en < 60 secondes
- Détection caméra : précision > 90% en conditions normales (intérieur, lumière correcte)
- Latence caméra : < 150ms entre rep et comptage
- Notifications délivrées en < 10 secondes
- 0 crash sur le comptage caméra en session

### Résultats Mesurables

- Pack Savage : taux de conversion > 1 acheteur par groupe avant fin semaine 3
- Referral : > 30% des nouveaux groupes créés via lien/QR d'un groupe existant
- Récap partagé sur les réseaux : > 20% des récaps hebdomadaires génèrent un partage

## Parcours Utilisateurs

### Parcours 1 — Thomas, le Déclencheur *(chemin principal)*

**Vendredi soir, 23h.** Thomas est autour d'une table avec Kevin, Marc et Sarah. Quelqu'un dit "t'es même pas cap de faire plus de pompes que moi pendant un mois". Le pari est lancé.

Thomas ouvre l'App Store. Télécharge PUMP IT. Crée un compte en 20 secondes — prénom, email, il choisit son avatar (Le Taureau). Étape 4/4 : il crée l'équipe "Les Bras de Fer", le code **BR-4X9K** s'affiche avec un QR code. Les autres scannent. En 60 secondes, 4 personnes sont dans la même équipe.

Thomas lance sa première session. Il pose son téléphone en face de lui. L'app détecte son visage — indicateur vert. Il fait 35 pompes. Le compteur pulse à chaque rep. Il poste. Le leaderboard s'affiche : Thomas #1, 35 pompes.

Le lundi suivant, il reçoit une notif : *"Kevin vient de te passer devant. 42 pompes. T'as peur ?"* Il ouvre l'app immédiatement.

**Capacités révélées :** onboarding < 60s à plusieurs, création équipe + QR, comptage caméra, leaderboard temps réel, notifications de dépassement.

### Parcours 2 — Kevin, le Compétiteur *(engagement profond)*

Kevin est membre, pas admin. Il reçoit le lien d'invitation de Thomas via WhatsApp. Un tap — il rejoint sans friction. Pseudo, avatar (Le Loup), c'est parti.

Kevin est #2 toute la semaine. Jeudi soir : *"Kevin, Thomas te regarde de 40 pompes au-dessus. Confortablement installé."* Il pose son téléphone, fait 60 pompes, passe #1. Poste immédiatement.

Dimanche 20h, le récap arrive. Kevin est champion. La carte se génère — "Kevin / Le Loup / 287 pompes / Les Bras de Fer / Semaine 3". Il la partage sur son Instagram Story. Le QR code dans la carte amène 2 nouveaux amis à télécharger l'app.

Semaine 4, Kevin achète le Pack Savage 4.99€ — tout le groupe en profite. Il est le héros.

**Capacités révélées :** rejoindre via lien, feed + réactions, notifications compétitives, récap + partage Stories, Pack Savage one-shot, effet héros de groupe.

### Parcours 3 — Marc, l'Absent Honteux *(rétention par la honte)*

Marc a rejoint enthousiaste semaine 1. 47 pompes. Semaine 2, il est en déplacement. 0 session.

Mercredi : *"Marc dort depuis 3 jours. Quelqu'un pour le réveiller ?"* Vendredi : *"Marc. 0 pompes. 0. Le néant."* Dimanche récap : il apparaît en "💤 Absent honteux". Il screenshot et l'envoie dans son groupe WhatsApp de boulot en se foutant de lui-même.

Lundi, reset. Marc revient. Il fait 23 pompes. Le mécanisme de rédemption hebdomadaire fonctionne.

**Capacités révélées :** notifications d'inactivité escalatives, section "absent honteux" dans le récap, reset comme mécanisme de rédemption, honte partageable comme viralité involontaire.

### Parcours 4 — Thomas (Admin) transfère son rôle *(edge case critique)*

Après 8 semaines, Thomas quitte l'équipe. L'app l'avertit : *"Tu es admin. Si tu quittes, l'équipe sera dissoute. Veux-tu transférer l'admin à Kevin avant de partir ?"* Thomas transfère. Kevin reçoit une notif : *"Thomas t'a passé les clés. Tu es maintenant admin des Bras de Fer."* L'équipe continue.

**Capacités révélées :** transfert d'admin avant départ, dissolution conditionnelle, gestion des droits admin, notifications de changement de rôle.

### Résumé des Capacités Révélées

| Parcours | Capacités clés |
|---|---|
| Thomas (créateur) | Onboarding rapide, création équipe, QR, caméra, leaderboard, notifs dépassement |
| Kevin (compétiteur) | Rejoindre via lien, feed, récap + partage, Pack Savage, effet héros |
| Marc (flemmard) | Notifs inactivité escalatives, absent honteux, reset = rédemption, viralité honte |
| Thomas (admin quitte) | Transfert admin, dissolution conditionnelle, gestion rôles |

## Innovation & Différenciation

Les parcours ci-dessus révèlent trois patterns d'innovation qui constituent le fossé concurrentiel de PUMP IT.

### Le Chambrage Escalatif Contextuel — Innovation Core

Aucune app sociale de fitness n'automatise la pression sociale avec un système de montée en intensité basé sur des données réelles de groupe. PUMP IT combine pour la première fois :
- Données temps réel du groupe (scores, écarts, historique)
- IA générative (Claude API) pour personnaliser le message
- Escalade temporelle programmée (4 degrés sur 7 jours)
- Ciblage individuel dans la langue du destinataire

### Le Modèle "1 Paie, Tous Profitent"

Le Pack Savage one-shot débloqué pour tout le groupe par un seul acheteur est une mécanique de monétisation sociale non standard sur mobile. Elle transforme l'acheteur en héros social et crée une pression organique d'achat sans être prédatoire.

### L'Absent Honteux comme Feature

La plupart des apps traitent l'inactivité comme un échec. PUMP IT en fait un personnage narratif — l'Absent Honteux a une place dans le récap, un badge, une notif qui fait rire les autres. La honte devient partageable et virale.

### Contexte Marché & Concurrence

| Concurrent | Ce qu'ils font | Ce qu'ils ne font pas |
|---|---|---|
| Pushup Social | Comptage caméra, following global | Pas de groupe privé, pas de chambrage |
| Strava | Segments, KOM, following | Pas de trash talk, pas de groupe intime |
| Duolingo | Pression sociale gamifiée | Pas de sport, pas d'IA contextuelle |
| WhatsApp | Chambrage humain | Pas de structure, s'épuise seul |

### Validation des Innovations

| Innovation | Comment valider | Délai |
|---|---|---|
| Chambrage templates (Lot 3) | Taux d'ouverture notifs chambrage > 60% | Semaine 6-8 |
| Chambrage IA (Lot 5) | Messages IA perçus plus pertinents que templates — survey in-app | Mois 5 |
| "1 Paie, Tous Profitent" | 1 acheteur par groupe avant fin semaine 3 | Mois 3 |
| Absent Honteux viral | > 20% des récaps partagés incluent capture "absent honteux" | Mois 2 |

### Risques & Fallbacks Innovation

| Risque | Fallback |
|---|---|
| Chambrage IA perçu comme générique | Garder templates pré-écrits en parallèle, A/B tester |
| Modèle "1 Paie Tous Profitent" = moins de revenus | Proposer option "Pack Perso" en complément |
| Absent Honteux crée du churn | Opt-out "mode discret" dans les réglages |

## Architecture & Spécifications Techniques

### Vue d'Ensemble

PUMP IT est une app cross-platform React Native + Expo ciblant iOS 16+ et Android 10+ (API 29+).

### Stack

**Frontend**
- React Native 0.73+ + Expo SDK 50+
- Navigation : React Navigation v6 (Stack + Bottom Tabs)
- State management : Zustand
- TypeScript strict
- i18n : i18next + react-i18next (FR, EN, ES, DE, IT)

**Backend**
- Firebase Auth (email/password + Google Sign-In)
- Firestore (temps réel)
- Firebase Cloud Messaging (FCM)
- Firebase Storage (clips vidéo 24h — Lot 5)
- Firebase Cloud Functions (génération IA, reset weekly, notifications)
- RevenueCat (IAP cross-platform)

### Permissions Device

| Permission | Justification affichée | Moment |
|---|---|---|
| Caméra | "Pour compter tes pompes mains-libres" | Avant première session |
| Notifications | "Pour te tenir au courant quand tes amis bougent" | Après création/rejoindre équipe |

### Mode Offline

| Feature | Offline | Commentaire |
|---|---|---|
| Comptage caméra | ✅ | Face detection on-device |
| Leaderboard / Feed | ❌ | Firestore requis |
| Poster une session | ⚠️ | Queue locale + sync au retour réseau (Lot 2) |

### Stratégie Push Notifications

Architecture : Firebase Cloud Functions → FCM — jamais déclenché depuis le client.

| Trigger | Délai | Priorité |
|---|---|---|
| Membre te dépasse | Immédiat | Haute |
| Session postée | < 2 min | Normale |
| Inactif 48h | 19h heure locale | Normale |
| Inactif 72h (savage) | 19h heure locale | Haute |
| Reset lundi | Lundi 00h05 | Normale |
| Récap dimanche | Dimanche 20h | Haute |

Rate limiting : max 5 notifications/jour/utilisateur.

### Conformité Stores

- IAP obligatoire via RevenueCat (StoreKit 2 iOS + Google Play Billing v5)
- Target API Android 34+ requis
- Review humaine Apple garantie pour la caméra — prévoir 7 jours au premier dépôt
- Privacy Nutrition Label iOS : caméra, notifications, identifiants

### Considérations d'Implémentation

- **EAS Build** pour CI/CD iOS + Android
- **Détection caméra** : `react-native-vision-camera` + modèle face detection embarqué < 5MB
- **Carte partage** : `react-native-view-shot` → export 1080x1920 galerie
- **Deep links** : `pumpit://join/BR-4X9K` + Universal Links iOS + App Links Android

## Scoping & Développement par Phases

### Stratégie MVP

**Approche :** Revenue MVP — valider simultanément l'engagement ET la monétisation. Objectif : 1 acheteur Pack Savage par groupe avant fin mois 3.

**Ressources :** 2 développeurs CDI, 12h/semaine équipe, ~3.5 mois pour les Lots 1-4.

### Phase 1 — MVP (Lots 1-4)

**Parcours couverts :** Thomas (créateur), Kevin (compétiteur), Marc (flemmard), Thomas (admin/transfert)

| Lot | Capacités | Durée |
|---|---|---|
| **1** | Auth, profil, avatars (10 animaux), création équipe, code+QR+deep link, comptage caméra face detection, leaderboard weekly | 5 sem |
| **2** | Feed chronologique, réactions 💪/🗑️, push notifications (dépassé, inactif 48h/72h, session postée), queue offline | 3 sem |
| **3** | Chambrage escalatif 4 degrés (templates pré-écrits), récap dimanche (classement + stats fun + absent honteux), carte partage Stories/Feed + QR | 3 sem |
| **4** | Pack Savage 4.99€ one-shot (RevenueCat), referral "3 amis actifs = Pack offert", récap mensuel | 3 sem |

### Phase 2 — Croissance (Lot 5, +4 mois)

- Chambrage IA contextuel (Claude API) — remplace/complète les templates
- Niveau trash user-controlled (soft / medium / hardcore)
- Clip vidéo 24h aléatoire (Firebase Storage)

### Phase 3 — Expansion (Lot 6+, +4 mois)

- Saisons caritatifs (Octobre Rose, Movember) — challenges nationaux avec don par pompe
- Mode solo (objectif personnel quotidien sans équipe)
- Classement global inter-équipes
- Multi-équipes par utilisateur

### Stratégie de Mitigation des Risques

| Type | Risque | Mitigation |
|---|---|---|
| **Technique** | Face detection imprécise sur Android mid-range | Tests sur Samsung A34/A54 dès Lot 1 — fallback entrée manuelle si KO |
| **Technique** | Latence notifications FCM > 10s | Cloud Functions dédiées, pas de triggers Firestore directs |
| **Marché** | Churn après 3 semaines | Reset weekly = rédemption permanente, récap = rituel qui reboote la dynamique |
| **Marché** | Pas de conversion Pack Savage | Chambrage degree 3-4 et récap narratif gatés derrière Savage |
| **Ressources** | 12h/sem insuffisant | Chaque lot livrable indépendamment — Lots 1-3 = MVP utilisable sans Lot 4 |

## Exigences Fonctionnelles

### Gestion des Comptes & Profils

- **FR1 :** Un utilisateur peut créer un compte avec email/mot de passe ou Google Sign-In
- **FR2 :** Un utilisateur peut sélectionner un avatar parmi 10 personnages animaux à l'inscription
- **FR3 :** Un utilisateur peut modifier son pseudo et son avatar depuis son profil
- **FR4 :** Un utilisateur peut consulter ses statistiques personnelles (total pompes, best day, streak, historique)
- **FR5 :** Un utilisateur peut supprimer son compte et l'intégralité de ses données

### Gestion des Équipes

- **FR6 :** Un utilisateur peut créer une équipe avec un nom, générant automatiquement un code 6 caractères, un QR code et un deep link
- **FR7 :** Un utilisateur peut rejoindre une équipe via code, scan QR ou lien deep link
- **FR8 :** Un admin peut inviter des membres directement depuis l'app
- **FR9 :** Un admin peut exclure un membre de l'équipe
- **FR10 :** Un admin peut transférer son rôle à un autre membre avant de quitter
- **FR11 :** Un utilisateur peut quitter une équipe à tout moment
- **FR12 :** Le système dissout automatiquement l'équipe si l'admin quitte sans transférer son rôle
- **FR13 :** Une équipe est limitée à 2-10 membres simultanément

### Sessions & Comptage

- **FR14 :** Un utilisateur peut démarrer une session de comptage de pompes via la caméra frontale
- **FR15 :** Le système compte automatiquement une répétition valide quand le visage est détecté et le mouvement correctement réalisé
- **FR16 :** Un utilisateur peut voir son compteur de répétitions en temps réel pendant une session
- **FR17 :** Un utilisateur peut mettre fin à une session et poster son score dans l'équipe
- **FR18 :** Le système refuse de compter une répétition si le visage n'est pas visible dans le cadre

### Feed Social & Réactions

- **FR19 :** Un utilisateur peut consulter le feed chronologique des sessions de son équipe
- **FR20 :** Un utilisateur peut réagir à une session avec 💪 (props) ou 🗑️ (trash)
- **FR21 :** L'auteur d'une session reçoit une notification lors d'une réaction sur sa session

### Chambrage & Notifications

- **FR22 :** Le système envoie des notifications push contextuelles (dépassé au classement, session postée, inactif 48h, inactif 72h, reset weekly, récap dimanche)
- **FR23 :** Le système génère des messages de chambrage escalatifs selon 4 degrés, déterminés par le jour de la semaine et l'écart au classement
- **FR24 :** Un utilisateur peut déclencher manuellement un message trash sur la session d'un autre membre via la réaction 🗑️
- **FR25 :** Un utilisateur peut configurer son niveau de réception du trash talk (soft / medium / hardcore)

### Classements & Récaps

- **FR26 :** Un utilisateur peut consulter le leaderboard weekly de son équipe
- **FR27 :** Le système remet les scores weekly à zéro automatiquement chaque lundi à 00h01
- **FR28 :** Un utilisateur peut consulter le leaderboard mensuel et all-time de son équipe (fonctionnalité Pack Savage)
- **FR29 :** Le système génère automatiquement chaque dimanche à 20h un récap incluant le classement final, le champion, l'absent honteux et les stats fun
- **FR30 :** Un utilisateur peut consulter l'historique des 4 derniers récaps (illimité avec Pack Savage)

### Partage Social & Viralité

- **FR31 :** Le système génère automatiquement une carte de partage après le récap (format Stories 1080×1920 et Feed 1080×1080)
- **FR32 :** Un utilisateur peut partager sa carte de résultats vers Instagram, WhatsApp et autres apps installées
- **FR33 :** La carte de partage contient un QR code d'invitation vers l'équipe du partageur

### Monétisation & Premium

- **FR34 :** Un utilisateur peut acheter le Pack Savage (one-shot, 4.99€) via IAP
- **FR35 :** L'achat du Pack Savage par un membre débloque les fonctionnalités premium pour tous les membres de l'équipe
- **FR36 :** Les fonctionnalités premium incluent : chambrage IA contextuel, récap animé, historique illimité, badge 👑, streak tracker, leaderboards mensuel et all-time
- **FR37 :** Un utilisateur peut obtenir le Pack Savage gratuitement en parrainant 3 amis actifs (referral)

## Contraintes & Conformité

### RGPD (Europe)

- Données personnelles collectées : email, prénom, avatar, historique de sessions, vidéos (Lot 5)
- Consentement explicite requis à l'inscription pour caméra + notifications
- Droit à l'effacement : suppression compte = suppression de toutes les données dans les 30 jours
- Clips vidéo 24h (Lot 5) : suppression automatique Firebase Storage = conformité par design
- Politique de confidentialité obligatoire avant soumission App Store/Play Store

### Mineurs

- App ciblant 18-35 ans — déclaration d'âge minimum 16+ (RGPD européen) à l'inscription
- Pas de collecte de données sur les moins de 13 ans

### Contenu Généré par IA

- Trash talk IA (Lot 5) : filtrage anti-abus (racisme, sexisme, harcèlement) avant envoi
- Niveau trash user-controlled (soft / medium / hardcore) = responsabilité partagée
- Génération IA côté serveur uniquement (Firebase Cloud Functions) — jamais exposer les clés API côté client
- Logs des messages conservés 30 jours pour modération réactive

### Risques & Mitigations

| Risque | Mitigation |
|---|---|
| Contenu trash talk jugé abusif par l'App Store | Niveaux de modération + opt-in explicite |
| Fuite de clé API Claude dans le client | Génération IA via Cloud Functions uniquement |
| Clips vidéo mal supprimés (Lot 5) | Firebase TTL automatique + job nettoyage quotidien |
| Demandes de remboursement Pack Savage | Conditions claires : one-shot non remboursable, pas de Free Trial |

## Exigences Non-Fonctionnelles

### Performance

- **NFR1 :** La détection caméra traite chaque frame en < 150ms (comptage temps réel perçu comme instantané)
- **NFR2 :** Le chargement initial du feed de l'équipe s'effectue en < 2 secondes sur une connexion 4G standard
- **NFR3 :** Le leaderboard se met à jour en < 3 secondes après la soumission d'une session
- **NFR4 :** L'onboarding complet (inscription + création équipe + 2 membres) est réalisable en < 60 secondes
- **NFR5 :** Les notifications push sont délivrées en < 10 secondes après le déclencheur serveur

### Fiabilité

- **NFR6 :** Le reset weekly (lundi 00h01) s'exécute avec une tolérance de ±5 minutes — une défaillance déclenche une alerte et un retry automatique
- **NFR7 :** Le récap dimanche (20h heure locale) s'exécute avec une tolérance de ±10 minutes — critique pour le rituel utilisateur
- **NFR8 :** La disponibilité du service est conforme aux SLAs Firebase/Google (99.95% uptime)
- **NFR9 :** La queue offline se synchronise automatiquement dans les 30 secondes après retour de connexion

### Sécurité

- **NFR10 :** Les clés API Claude et Firebase Admin ne sont jamais exposées côté client — uniquement dans les Cloud Functions
- **NFR11 :** Toutes les communications client-serveur se font via HTTPS/TLS 1.2+
- **NFR12 :** Les règles Firestore interdisent à un utilisateur de lire/écrire les données d'une équipe dont il n'est pas membre
- **NFR13 :** Les transactions de paiement sont intégralement gérées par RevenueCat/Apple/Google — aucune donnée bancaire ne transite par les serveurs PUMP IT

### Scalabilité

- **NFR14 :** L'architecture Firebase supporte une croissance jusqu'à 10 000 utilisateurs actifs sans modification d'infrastructure
- **NFR15 :** Le rate limiting des notifications est configuré à 5 notifications/jour/utilisateur
- **NFR16 :** Les Cloud Functions de génération de chambrage supportent 100 appels simultanés sans dégradation

### Compatibilité

- **NFR17 :** L'app est compatible iOS 16+ et Android 10+ (API 29+)
- **NFR18 :** La détection caméra fonctionne sur les appareils mid-range (Samsung Galaxy A34, iPhone 11) avec précision > 90%
- **NFR19 :** L'app supporte les modes clair et sombre du système d'exploitation

## Analytics & Tracking

Toutes les métriques de succès business listées dans les Critères de Succès ne sont mesurables que si les events Firebase Analytics sont implémentés précisément. Cette section constitue un contrat d'implémentation — chaque event est requis avant la mise en production de la feature correspondante.

### Events Sessions

| Event | Paramètres | Déclenché quand |
|---|---|---|
| `session_started` | `team_id`, `avatar_id` | L'utilisateur lance la caméra |
| `session_completed` | `reps_count`, `duration_seconds`, `team_id` | L'utilisateur poste sa session |
| `session_abandoned` | `reps_count`, `team_id` | L'utilisateur quitte sans poster |
| `face_detection_failed` | `attempt_count` | Le visage non détecté après 10s |

### Events Équipes

| Event | Paramètres | Déclenché quand |
|---|---|---|
| `team_created` | `team_id` | Création d'une équipe |
| `team_joined` | `team_id`, `join_method` (`qr`/`code`/`link`/`invite`) | Un membre rejoint |
| `team_left` | `team_id` | Un membre quitte |
| `member_kicked` | `team_id` | Un admin exclut un membre |

### Events Chambrage & Notifications

| Event | Paramètres | Déclenché quand |
|---|---|---|
| `trash_reaction_sent` | `team_id`, `target_user_id` | Tap sur 🗑️ |
| `props_reaction_sent` | `team_id`, `target_user_id` | Tap sur 💪 |
| `notification_opened` | `notification_type`, `team_id` | Ouverture depuis une notif push |
| `chambrage_received` | `degree` (1-4), `team_id` | Message chambrage reçu |

### Events Monétisation

| Event | Paramètres | Déclenché quand |
|---|---|---|
| `pack_savage_initiated` | `team_id`, `trigger` (`paywall`/`upsell`) | Tap sur le bouton d'achat |
| `pack_savage_purchased` | `team_id`, `price`, `currency` | Achat confirmé RevenueCat |
| `pack_savage_unlocked` | `team_id`, `triggered_by` (`purchase`/`referral`) | Pack activé pour l'équipe |
| `referral_link_shared` | `team_id`, `share_destination` | Partage du lien d'invitation |
| `referral_completed` | `team_id`, `referee_count` | 3e ami actif confirmé |

### Events Viralité & Récap

| Event | Paramètres | Déclenché quand |
|---|---|---|
| `recap_viewed` | `team_id`, `week_number` | Ouverture de l'écran récap |
| `recap_shared` | `team_id`, `share_destination` (`instagram`/`whatsapp`/`other`) | Partage de la carte |
| `story_card_generated` | `team_id`, `card_type` (`champion`/`personal`) | Carte générée |

### User Properties Firebase

Définies à la connexion, mises à jour à chaque changement :

| Propriété | Valeurs | Usage |
|---|---|---|
| `avatar_id` | `duck`/`fox`/`wolf`/`bear`/`bull`/`rhino`/`shark`/`gorilla`/`dragon`/`phoenix` | Segmentation par avatar |
| `team_id` | string | Cohort par équipe |
| `is_premium` | `true`/`false` | Segmentation free vs Savage |
| `trash_level` | `soft`/`medium`/`hardcore` | Préférence chambrage |
| `days_since_last_session` | int | Détection inactivité |

### Règles d'Implémentation Analytics

- Tous les events via Firebase Analytics SDK côté client — jamais via Cloud Functions
- Les paramètres `team_id` et `avatar_id` sont inclus dans tous les events post-onboarding
- Les events de monétisation sont doublés dans RevenueCat pour réconciliation
- Aucun event ne contient de données personnelles identifiables (nom, email, prénom)
- `notification_opened` inclut toujours `notification_type` pour mesurer le taux d'ouverture par type
