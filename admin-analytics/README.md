# TribuBaby Admin Analytics

Dashboard d'analytics administrateur pour TribuBaby. Application web React sécurisée avec accès restreint aux administrateurs.

## 🔒 Sécurité

- **Accès restreint**: Seuls les emails whitelistés peuvent se connecter
- **Lecture seule**: Aucune modification de données possible
- **Conforme RGPD**: Données sensibles protégées
- **Firebase Auth**: Authentification sécurisée

## 📋 Fonctionnalités

### 1. Analytics Dashboard
- Nombre de téléchargements (iOS/Android)
- Comptes créés
- Bébés créés
- Comptes sans bébé
- Filtrage par période

### 2. Funnel d'engagement
- Visualisation du parcours utilisateur
- Taux de conversion
- Activation et rétention

### 3. Recherche de bébé
- Recherche par ID
- Statistiques détaillées par bébé
- Stats par type de tâche (biberons, couches, sommeils, etc.)

### 4. Export Excel
- Export des utilisateurs
- Export des bébés
- Export des tâches
- Filtrage par période

## 🚀 Installation

### 1. Configuration Firebase

Copier le fichier `.env.example` vers `.env`:

```bash
cp .env.example .env
```

Remplir les credentials Firebase (identiques au projet principal):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### 2. Configuration des admins

Modifier le fichier `src/config/adminEmails.ts` avec vos emails:

```typescript
export const ADMIN_EMAILS = [
  'votre-email@example.com',
  'delphine@example.com',
];
```

### 3. Installation des dépendances

```bash
npm install
```

### 4. Lancement en développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📦 Déploiement sur Firebase Hosting

### 1. Installation de Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login Firebase

```bash
firebase login
```

### 3. Initialisation Firebase Hosting

```bash
firebase init hosting
```

Répondre aux questions:
- **What do you want to use as your public directory?** `dist`
- **Configure as a single-page app?** `Yes`
- **Set up automatic builds with GitHub?** `No` (ou Yes si vous voulez)

### 4. Build de production

```bash
npm run build
```

### 5. Déploiement

```bash
firebase deploy --only hosting
```

L'application sera déployée sur: `https://VOTRE-PROJECT-ID.web.app`

## 🔧 Scripts disponibles

```bash
npm run dev          # Lancement en mode développement
npm run build        # Build de production
npm run preview      # Preview du build
npm run lint         # Vérification du code
```

## 📁 Structure du projet

```
admin-analytics/
├── src/
│   ├── components/       # Composants React
│   │   ├── Login.tsx
│   │   ├── Layout.tsx
│   │   ├── Analytics.tsx
│   │   ├── Funnel.tsx
│   │   ├── Search.tsx
│   │   └── Export.tsx
│   ├── contexts/         # Contexts React
│   │   └── AuthContext.tsx
│   ├── services/         # Services (Firestore, Analytics)
│   │   ├── analyticsService.ts
│   │   ├── searchService.ts
│   │   └── exportService.ts
│   ├── config/           # Configuration
│   │   ├── firebase.ts
│   │   └── adminEmails.ts
│   ├── types/            # Types TypeScript
│   └── App.tsx
├── .env                  # Variables d'environnement (à créer)
├── .env.example          # Exemple de variables
└── package.json
```

## 🔍 Utilisation

### Connexion
1. Ouvrir l'application
2. Se connecter avec un email admin whitelisté
3. Entrer le mot de passe Firebase

### Analytics
- Sélectionner une période (7j, 30j, 3 mois, personnalisé)
- Voir les métriques principales
- Cliquer sur les cartes pour voir les détails

### Funnel
- Visualiser le parcours utilisateur
- Voir les taux de conversion à chaque étape

### Recherche
- Entrer un Baby ID
- Voir toutes les statistiques du bébé
- Filtrer par période

### Export
- Sélectionner les types de données à exporter
- Choisir la période
- Télécharger le fichier Excel

## ⚠️ Important

- **NE PAS** commiter le fichier `.env` (déjà dans .gitignore)
- **NE PAS** partager les credentials Firebase publiquement
- Seuls les emails dans `adminEmails.ts` peuvent accéder à l'application
- Les données sont en lecture seule, aucune modification possible

## 📝 Notes techniques

- **React 18** + TypeScript
- **Vite** pour le build rapide
- **Firebase SDK v9** (modular)
- **XLSX** pour l'export Excel
- **Firestore** pour les données
- **Firebase Analytics** pour les téléchargements

## 🆘 Support

En cas de problème:
1. Vérifier que les credentials Firebase sont corrects
2. Vérifier que l'email est dans la whitelist
3. Vérifier les règles Firestore
4. Consulter la console Firebase pour les logs
