# Task Export Feature

## Overview
The Task Export feature allows users to export their baby's tasks to CSV format for analysis in Excel, Google Sheets, or other spreadsheet applications.

## How to Use

### For Users
1. Navigate to **Settings** (Paramètres)
2. Tap **📊 Exporter les tâches** (only visible when a baby profile exists)
3. Select a time period:
   - Last 7 days
   - Last 30 days
   - Last 3 months
   - This month
   - Last month
   - All tasks
4. Tap **📥 Exporter vers CSV**
5. Use the iOS/Android share menu to:
   - Save to Files
   - Send via email
   - Share to Google Drive, Dropbox, etc.
   - Open directly in Excel, Numbers, or Google Sheets

### CSV File Format

The exported CSV file includes:
- **Date**: DD/MM/YYYY format
- **Heure**: Time in HH:mm format
- **Type**: Task type (Allaitement, Biberon, Couche, Sommeil, Santé, Thermomètre)
- **Détails**: Additional details (e.g., diaper type: Dur, Mou, Liquide)
- **Sein Gauche**: Left breast feeding duration (in minutes)
- **Sein Droit**: Right breast feeding duration (in minutes)
- **Créé par**: Username of person who created the task
- **Commentaire**: Any notes/comments added to the task

### File Specifications
- **Format**: CSV (Comma-Separated Values)
- **Encoding**: UTF-8 with BOM (for Excel compatibility)
- **Filename**: `tribubaby_export_YYYY-MM-DD_HHmm.csv`
- **Compatible with**: Excel, Google Sheets, Numbers, LibreOffice, etc.

## Technical Implementation

### Files Added
1. **`utils/exportTasks.ts`**: Core export logic
   - `generateCSV()`: Converts tasks to CSV format
   - `exportTasksToCSV()`: Handles file creation and sharing
   - `getDateRangePresets()`: Provides predefined date ranges

2. **`screens/ExportTasks.tsx`**: Export UI screen
   - Period selection interface
   - Task count preview
   - Export button with loading state
   - Analytics tracking

### Dependencies
- **expo-sharing**: For file sharing on mobile
- **expo-file-system**: For file creation and management
- **moment**: For date formatting

### Firebase Analytics Events
The export feature tracks:
- **`tasks_exported`**: When export succeeds
  - Parameters: `period`, `taskCount`, `babyId`, `userId`
- **`export_failed`**: When export fails
  - Parameters: `error`, `userId`

### Data Privacy
- All exports happen **locally** on the device
- No data is sent to external servers
- Files are stored temporarily in device storage
- User controls where the file is shared/saved

## Use Cases

### Personal Tracking
- Monitor feeding patterns over time
- Track sleep schedules
- Analyze diaper changes for health insights
- Share with pediatrician

### Multiple Caregivers
- Export data to share with other family members
- Keep grandparents informed
- Share with nanny or daycare

### Medical Records
- Provide detailed logs to doctors
- Track medication or health issues
- Document feeding for lactation consultants

## Future Enhancements

### Potential Features
1. **Custom date range picker**: Allow users to select specific start/end dates
2. **Export to PDF**: Generate formatted reports with charts
3. **Email directly**: Send export via email without share menu
4. **Auto-export**: Schedule automatic exports (daily, weekly)
5. **Filter by task type**: Export only specific types (e.g., only feedings)
6. **Statistics summary**: Include charts and summaries in export
7. **Multi-baby export**: Export data for multiple babies in one file
8. **Cloud backup**: Automatic backup to Google Drive/iCloud

### Analytics to Add
- Track which time periods are most popular
- Monitor how often users export
- Track which share destinations are used (email, drive, etc.)

## Troubleshooting

### "No tasks to export"
- Make sure you have a baby profile selected
- Create some tasks before exporting

### "Sharing not available"
- Device may not support file sharing
- Try updating iOS/Android to latest version

### Excel showing garbled text
- The CSV uses UTF-8 with BOM specifically for Excel
- If issues persist, try opening in Google Sheets first, then copying to Excel

### File not found after export
- Check your device's Downloads folder
- Check Files app (iOS) or My Files (Android)
- File may be in temporary storage - import it immediately after export

## Testing

To test the export feature:
1. Create a baby profile
2. Add various types of tasks with different dates
3. Go to Settings → Export Tasks
4. Try different time periods
5. Verify CSV opens correctly in Excel/Sheets
6. Check that all data is correctly formatted
7. Verify date/time formats match locale

## Support

For issues or questions:
- Email: tribubabytracker@gmail.com
- Website: https://www.tribubaby.app
