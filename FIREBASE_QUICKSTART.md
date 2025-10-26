# 🚀 Quick Start - Firebase Analytics

## ✅ What's Done

1. ✅ **Installed packages**: `@react-native-firebase/app` and `@react-native-firebase/analytics`
2. ✅ **Updated app.json**: Added Firebase plugin
3. ✅ **Created utility file**: `services/analytics.ts` with pre-built tracking methods
4. ✅ **Updated iOS dependencies**: CocoaPods installed with Firebase SDK

## 🔥 Next Steps (REQUIRED)

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project" or use existing
3. Name it (e.g., "tribubaby")
4. Disable Google Analytics for now (can enable later) or enable it

### Step 2: Add iOS App

1. In Firebase Console → Project Settings → Add App → iOS
2. Enter Bundle ID: **`com.tribubaby.tribubaby`**
3. **Download `GoogleService-Info.plist`**
4. **Place it at**: `/Users/chris_/Documents/todolist/ios/GoogleService-Info.plist`
5. **Important**: Open Xcode and add the file to the project:
   ```bash
   open /Users/chris_/Documents/todolist/ios/tribubaby.xcworkspace
   ```
   - Right-click on `tribubaby` folder → Add Files
   - Select `GoogleService-Info.plist`
   - Make sure "Copy items if needed" is checked
   - Click "Add"

### Step 3: Add Android App (Optional for now)

1. In Firebase Console → Project Settings → Add App → Android
2. Enter Package name: **`com.tribubaby.tribubaby`**
3. **Download `google-services.json`**
4. **Place it at**: `/Users/chris_/Documents/todolist/android/app/google-services.json`

### Step 4: Enable Analytics in Firebase

1. Go to Firebase Console → Analytics → Dashboard
2. Should be auto-enabled for new projects
3. If not, go to Project Settings → Integrations → Enable Google Analytics

### Step 5: Test It!

After adding `GoogleService-Info.plist`, rebuild your app:

```bash
cd /Users/chris_/Documents/todolist
npx expo run:ios
```

Then add analytics to your screens:

```typescript
import Analytics from './services/analytics';

// In your screen component
useEffect(() => {
  Analytics.logScreenView('HomeScreen');
}, []);

// Track events
const handleButtonPress = () => {
  Analytics.logEvent('button_pressed', {
    button_name: 'create_task',
    screen: 'HomeScreen'
  });
};
```

## 📊 Pre-built Analytics Methods

Your `services/analytics.ts` includes:

- `logScreenView(screenName)` - Track screen views
- `logTaskCreated()` - Track task creation
- `logTaskCompleted()` - Track task completion
- `logTaskDeleted()` - Track task deletion
- `logBabyJoined()` - Track baby joining
- `logBabyCreated()` - Track baby creation
- `logSignIn(method)` - Track user login
- `logSignUp(method)` - Track user registration
- `logEvent(name, params)` - Track custom events
- `setUserId(userId)` - Set user ID
- `setUserProperty(name, value)` - Set user properties

## 🐛 Troubleshooting

**Issue**: App crashes on startup after adding Firebase
- **Fix**: Make sure `GoogleService-Info.plist` is added to Xcode project (not just copied to folder)

**Issue**: "Firebase not configured" error
- **Fix**: Verify `GoogleService-Info.plist` is in the correct location and added to Xcode

**Issue**: Analytics events not showing
- **Fix**: Events take 24-48 hours to appear in Firebase Console. Use DebugView for real-time testing

## 📝 Full Documentation

See `FIREBASE_SETUP.md` for complete setup guide and usage examples.

## ⚠️ Important Note About Ad IDs

The warning about Ad IDs means Firebase Analytics includes advertising identifiers. If your app is for kids or you don't need ad tracking:

Add this to the top of `/Users/chris_/Documents/todolist/ios/Podfile`:

```ruby
$RNFirebaseAnalyticsWithoutAdIdSupport = true
```

Then run `pod install` again.
