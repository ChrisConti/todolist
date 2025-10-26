# Firebase Analytics Tracking Implementation

## Overview
Firebase Analytics has been successfully integrated into the app and is tracking user behavior across all major screens and actions.

## Screen Tracking

The following screens now log screen views when users navigate to them:

### Main Screens
- **Home** (`Home.tsx`) - Baby task list screen
- **CreateTask** (`screens/CreateTask.tsx`) - Create new task form
- **UpdateTask** (`screens/UpdateTask.tsx`) - Edit existing task
- **Settings** (`Settings.tsx`) - App settings and preferences

### Baby Management
- **Baby** (`Baby.tsx`) - Create new baby profile
- **JoinBaby** (`JoinBaby.tsx`) - Join existing baby profile with code

### Authentication
- **SignIn** (`SignIn.tsx`) - User registration screen

### Data Management
- **ExportTasks** (`screens/ExportTasks.tsx`) - Export tasks to CSV

### Testing
- **AnalyticsTest** (`screens/AnalyticsTest.tsx`) - Test screen for verifying Firebase

## Event Tracking

### Task Events
| Event Name | Triggered When | Parameters |
|------------|---------------|------------|
| `task_created` | User creates a new task | `taskType`, `taskId`, `hasLabel`, `hasNote`, `userId` |
| `task_updated` | User updates an existing task | `taskId`, `hasNote`, `userId` |
| `task_deleted` | User deletes a task | `taskId`, `userId` |
| `task_creation_failed` | Task creation fails | `taskType`, `taskId`, `userId`, `error` |

### Baby Management Events
| Event Name | Triggered When | Parameters |
|------------|---------------|------------|
| `baby_created` | User creates a new baby profile | `babyType`, `babyId`, `userId` |
| `baby_creation_failed` | Baby creation fails | `babyType`, `userId`, `error` |
| `baby_joined` | User successfully joins a baby with code | `babyId`, `userId` |
| `baby_join_error` | Error when joining baby | `errorType`, `userId` (error: empty_code, invalid_code, update_failed) |

### User Events
| Event Name | Triggered When | Parameters |
|------------|---------------|------------|
| `user_signup` | User successfully registers | `userId`, `method` |
| `signup_error` | Error during registration | `errorCode`, `errorType` |

### Export Events
| Event Name | Triggered When | Parameters |
|------------|---------------|------------|
| `tasks_exported` | User successfully exports tasks | `period`, `taskCount`, `babyId`, `userId` |
| `export_failed` | Export fails | `error`, `userId` |

## Testing Analytics

You can test analytics tracking using the Test Analytics screen:

1. Go to **Settings** (Paramètres)
2. Tap **🔬 Test Analytics**
3. Test different analytics functions:
   - Log Event
   - Log Screen View
   - Set User Property
   - Set User ID

## Viewing Analytics Data

### Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **babylist-ae85f**
3. Navigate to **Analytics** → **Events**
4. View real-time data in **DebugView** (for development builds)
5. View historical data in **Events** dashboard (24-48 hour delay)

### Key Metrics to Monitor
- **Screen Views**: Track which screens are most visited
- **Task Creation**: Monitor how many tasks users create
- **Baby Management**: See how many babies are created vs joined
- **User Engagement**: Track active users and session duration
- **Error Rates**: Monitor join errors and signup errors

## Event Parameters

All events include relevant context:
- **userId**: Firebase Auth UID of the user
- **taskType/taskId**: Type of task (allaitement, biberon, etc.)
- **babyId**: Unique ID of the baby profile
- **hasNote**: Whether task includes a note
- **errorType**: Specific error that occurred

## Future Tracking Recommendations

### Additional Events to Consider
1. **Premium Purchase**: Track when users upgrade to premium
2. **App Download**: Track first app launch
3. **Task View**: Track when users view task details
4. **Settings Change**: Track important setting changes
5. **Share Baby**: Track when users share baby code
6. **Export Data**: Track data export actions

### Additional Screens
1. **BabyState** - Baby state management screen
2. **ManageBaby** - Baby management settings
3. **ChangeEmail/ChangeName/ChangePassword** - Account management screens
4. **DeleteAccount** - Account deletion screen
5. **TaskDetail** - Task detail view
6. **PrivacyPolicy/TermsOfUse** - Legal screens

## Alerts and Monitoring

For alerts on specific events (downloads, purchases), you can use:

1. **Firebase Extensions**: Pre-built solutions for common tasks
2. **Cloud Functions**: Custom triggers for specific events
3. **BigQuery**: Export data for advanced analysis
4. **Google Analytics**: Link for advanced reporting

See `FIREBASE_ALERTS_SETUP.md` for detailed instructions on setting up alerts.

## Notes

- All TypeScript errors shown are pre-existing and related to type annotations, not the analytics implementation
- Analytics events are logged asynchronously and won't block the UI
- Debug logging can be seen in console with emoji indicators (📊)
- Production data appears in Firebase Console with 24-48 hour delay
- DebugView shows real-time data for development builds

## Verification

✅ Firebase Analytics installed and configured
✅ Screen tracking implemented on 7+ screens
✅ Event tracking for 6+ key user actions
✅ Test screen created for verification
✅ Successfully tested - showing "1 utilisateur actif" in Firebase Console
