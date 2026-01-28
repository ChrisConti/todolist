# Android Keystore Setup

## Security Notice

**NEVER commit keystore credentials to version control!**

The actual credentials should be:
1. Stored locally in `gradle.properties` (already gitignored)
2. Set as environment variables in your CI/CD system
3. Kept in secure password manager

## Local Development Setup

1. Copy the example file:
```bash
cp gradle.properties.example gradle.properties
```

2. Edit `gradle.properties` and fill in your actual credentials:
```
MYAPP_UPLOAD_STORE_PASSWORD=your_actual_password
MYAPP_UPLOAD_KEY_PASSWORD=your_actual_password
```

3. Ensure your keystore file (`my-tribubaby-key.jks`) is in the `android/app/` directory

## CI/CD Setup (GitHub Actions, etc.)

Set these as encrypted secrets in your CI/CD environment:
- `MYAPP_UPLOAD_STORE_PASSWORD`
- `MYAPP_UPLOAD_KEY_PASSWORD`

Then reference them in your build script:
```bash
export MYAPP_UPLOAD_STORE_PASSWORD=${{ secrets.MYAPP_UPLOAD_STORE_PASSWORD }}
export MYAPP_UPLOAD_KEY_PASSWORD=${{ secrets.MYAPP_UPLOAD_KEY_PASSWORD }}
```

## What if credentials were already committed?

If credentials were previously committed to git history:

1. **Change the keystore password immediately**
2. **Rotate your signing keys** (generate new keystore)
3. Consider the old keystore compromised
4. Use `git filter-branch` or BFG Repo-Cleaner to remove from history (advanced)

## Current Status

✅ Credentials removed from `gradle.properties`
✅ Example file created (`gradle.properties.example`)
✅ This documentation added
