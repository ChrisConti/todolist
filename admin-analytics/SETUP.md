# Setup rapide - TribuBaby Admin Analytics

## Étape 1: Configuration des emails admin

Ouvrir `src/config/adminEmails.ts` et remplacer avec vos vrais emails:

```typescript
export const ADMIN_EMAILS = [
  'votre-email@gmail.com',       // TON EMAIL ICI
  'delphine@example.com',         // EMAIL DE DELPHINE ICI
];
```

## Étape 2: Configuration Firebase

Créer le fichier `.env` à la racine de `admin-analytics/`:

```bash
cd admin-analytics
cp .env.example .env
```

Ouvrir `.env` et copier les credentials depuis le projet principal (même config que dans le fichier parent `config.js`):

```env
VITE_FIREBASE_API_KEY=ton_api_key_ici
VITE_FIREBASE_AUTH_DOMAIN=ton-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ton-projet-id
VITE_FIREBASE_STORAGE_BUCKET=ton-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXX
```

## Étape 3: Installer et lancer

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:5173` et se connecter avec ton email admin.

## Déploiement (Firebase Hosting)

```bash
# Build
npm run build

# Déployer (nécessite firebase-tools)
npm install -g firebase-tools
firebase login
firebase init hosting  # Choisir 'dist' comme public directory
firebase deploy --only hosting
```

## Problèmes courants

**"Accès non autorisé"**: Vérifier que ton email est bien dans `adminEmails.ts`

**"Firebase error"**: Vérifier que le `.env` est correctement configuré

**"Page blanche"**: Ouvrir la console navigateur (F12) pour voir l'erreur
