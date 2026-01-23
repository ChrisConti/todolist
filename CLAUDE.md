# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TribuBaby is a React Native/Expo mobile app for tracking baby activities (feeding, diapers, sleep, temperature, breastfeeding). It uses Firebase for backend (Auth, Firestore, Storage) and supports multi-user family sharing.

## Commands

```bash
# Development
npx expo start              # Start Metro bundler
npx expo run:ios            # Run on iOS
npx expo run:android        # Run on Android

# Testing
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

# Type checking
npx tsc --noEmit            # Check TypeScript (has known errors due to gradual migration)
```

## Architecture

### Navigation Structure
- `App.tsx` - Root component with auth flow
  - **AuthStack**: Connection, SignIn, PasswordForgotten
  - **MainTabs** (TabNavigator): Home, BabyTab, Statistics, Settings
  - **Stack screens**: CreateTask, UpdateTask, EditBaby, etc.

### Key Data Flow
- `Context/AuthentificationContext.tsx` - User auth state, current `babyID`, `userInfo`
- `Context/ReviewPromptContext.tsx` - App Store review prompt logic
- Tasks are stored as an array inside the Baby document in Firestore (`Baby.tasks[]`)

### Firebase Collections
- `Users` - User profiles (`userId`, `username`, `email`)
- `Baby` - Baby profiles with embedded `tasks[]` array

### Important Patterns

**Firestore Cache Issue**: When data needs to be fresh after updates, use `getDocsFromServer` instead of `getDocs`:
```typescript
import { getDocsFromServer } from 'firebase/firestore';
const snapshot = await getDocsFromServer(query);
```

**Task Types** (defined in `utils/constants.ts`):
- 0: Bottle, 1: Diaper, 2: Health, 3: Sleep, 4: Temperature, 5: Breastfeeding

**Diaper Types**: Uses `diaperType` field (0=solid, 1=soft, 2=liquid). Legacy field `idCaca` kept for backward compatibility - always read with `task.diaperType ?? task.idCaca`.

### Key Files
- `config.js` - Firebase initialization
- `translations.json` - i18n strings (FR, EN, ES)
- `screens/CreateTask.tsx` & `UpdateTask.tsx` - Complex task forms (~800 lines each, share similar logic)
- `hooks/useTaskStatistics.ts` - Statistics calculation hooks
- `BabyTab.tsx` - Main baby profile screen (in tab navigator)
- `BabyState.tsx` - Alternative baby state screen (in stack)

## Environment Setup

Copy `.env.example` to `.env.local` and fill Firebase credentials:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
```

## TypeScript

Project uses gradual TypeScript migration with loose settings (`strict: false`). Many files use `any` types.
