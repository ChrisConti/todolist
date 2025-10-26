# Firebase Analytics Setup Guide

## 🔥 Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select your existing project
3. Follow the setup wizard

### 2. Add iOS App to Firebase

1. In Firebase Console, click **"Add app"** → **iOS**
2. Register your app with:
   - **iOS bundle ID**: `com.tribubaby.tribubaby`
   - **App nickname**: `tribubaby iOS` (optional)
3. **Download `GoogleService-Info.plist`**
4. Place the file at: `/Users/chris_/Documents/todolist/ios/GoogleService-Info.plist`

### 3. Add Android App to Firebase

1. In Firebase Console, click **"Add app"** → **Android**
2. Register your app with:
   - **Android package name**: `com.tribubaby.tribubaby`
   - **App nickname**: `tribubaby Android` (optional)
3. **Download `google-services.json`**
4. Place the file at: `/Users/chris_/Documents/todolist/android/app/google-services.json`

### 4. Install iOS Dependencies

```bash
cd /Users/chris_/Documents/todolist/ios
pod install
```

### 5. Enable Analytics in Firebase Console

1. Go to **Analytics** → **Dashboard** in Firebase Console
2. Analytics should be automatically enabled for new projects
3. If not, go to **Project Settings** → **Integrations** → Enable Google Analytics

## 📊 Usage in Your App

### Track Screen Views

```typescript
import Analytics from './services/analytics';

// In your screen component
useEffect(() => {
  Analytics.logScreenView('Home');
}, []);
```

### Track Custom Events

```typescript
// Track task creation
Analytics.logTaskCreated('feeding');

// Track task completion
Analytics.logTaskCompleted('diaper');

// Track custom events
Analytics.logEvent('button_clicked', {
  button_name: 'save_task',
  screen: 'TaskDetail',
});
```

### Track User Login/Signup

```typescript
// When user signs in
Analytics.logSignIn('email');

// When user signs up
Analytics.logSignUp('email');

// Set user ID after authentication
Analytics.setUserId(user.uid);
```

### Set User Properties

```typescript
// Set custom user properties
Analytics.setUserProperty('subscription_type', 'premium');
Analytics.setUserProperty('user_role', 'parent');
```

## 🎯 Pre-built Events Available

- `logTaskCreated()` - When a task is created
- `logTaskCompleted()` - When a task is completed
- `logTaskDeleted()` - When a task is deleted
- `logBabyJoined()` - When a user joins a baby
- `logBabyCreated()` - When a user creates a baby
- `logSignIn()` - User authentication
- `logSignUp()` - User registration

## 📱 Testing Analytics

### Development Testing

1. **iOS**: Use Xcode console to see debug logs
2. **Android**: Use `adb logcat` or Android Studio Logcat
3. Look for logs starting with `📊 Analytics:`

### View in Firebase Console

1. Go to **Analytics** → **Events** in Firebase Console
2. It may take **24-48 hours** for events to appear in production
3. Use **DebugView** for real-time testing:
   ```bash
   # iOS
   adb shell setprop debug.firebase.analytics.app com.tribubaby.tribubaby
   
   # Android
   adb shell setprop debug.firebase.analytics.app com.tribubaby.tribubaby
   ```

## 🔒 Privacy & GDPR Compliance

```typescript
// Disable analytics collection (for GDPR compliance)
Analytics.setAnalyticsCollectionEnabled(false);

// Re-enable when user consents
Analytics.setAnalyticsCollectionEnabled(true);
```

## 🚀 Next Steps

After setting up:

1. ✅ Add `GoogleService-Info.plist` to iOS project
2. ✅ Add `google-services.json` to Android project
3. ✅ Run `pod install` in the `ios` folder
4. ✅ Rebuild your app
5. ✅ Add Analytics calls to your screens and events
6. ✅ Test with Firebase DebugView
7. ✅ Monitor events in Firebase Console after 24-48 hours

## 📝 Important Notes

- **iOS**: Make sure `GoogleService-Info.plist` is added to Xcode project (not just the folder)
- **Android**: The `google-services.json` should be in `android/app/` directory
- **EAS Build**: Config files are automatically included in builds
- **Privacy**: Ask for user consent before enabling analytics in production
- **Debug Mode**: Events appear immediately in DebugView, but take 24-48h in main dashboard

## 🔗 Useful Links

- [Firebase Analytics Documentation](https://rnfirebase.io/analytics/usage)
- [Firebase Console](https://console.firebase.google.com/)
- [Event Parameters Reference](https://firebase.google.com/docs/analytics/parameters)
