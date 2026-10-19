# Android APK Build and Device Test

## Prerequisites

- Android Studio with Android SDK Platform 35 and Build Tools 35 installed.
- JDK 17 or newer. Android Studio's bundled JBR is suitable.
- Android Gradle Plugin 8.6.1 and Gradle 8.7. Use the checked-in Gradle wrapper (`gradlew.bat`).
- A reachable API deployment. The APK sends incident reports to the configured API; it does not dispatch emergency services by itself.

## Local Emulator Test

1. Start the API from the repository root: `npm run dev --workspace=@accident-alarm/api`.
2. Build and test Android from `apps/android`:

   ```powershell
   .\gradlew.bat testDebugUnitTest assembleDebug
   ```

3. Install on a running emulator:

   ```powershell
   .\gradlew.bat installDebug
   ```

The default API endpoint is configured to `https://accident-alarm-api.onrender.com/api/v1/` for both debug and release builds. Cleartext HTTP is supported in debug builds when passing a local LAN address.

## Physical Phone or Sideload Installation

1. Copy or transfer the installable APK directly to your Android device from:
   `apps/android/dist/AccidentAlarm.apk` (or `AccidentAlarm-release.apk`)
2. Alternatively install via ADB:

   ```powershell
   adb install -r apps\android\dist\AccidentAlarm.apk
   ```

## Building APKs

To rebuild the APKs and output to `dist/`:

```powershell
.\gradlew.bat assembleRelease assembleDebug copyApkToDist
```

Built artifacts in `apps/android/dist/`:
- `AccidentAlarm.apk` (Optimized, signed, installable release APK — ~1.7 MB)
- `AccidentAlarm-release.apk` (Signed release build — ~1.7 MB)
- `AccidentAlarm-debug.apk` (Debug build — ~17.2 MB)

Both variants are pre-configured to communicate with `https://accident-alarm-api.onrender.com/api/v1/`.

## Manual Acceptance Checklist

- Fresh install opens the reporter home without requiring staff sign-in.
- Emergency disclaimer is visible. A call button appears only when the API provides a configured primary helpline.
- Report form can be completed without granting location permission by entering valid coordinates and a landmark.
- GPS permission is requested only after tapping the location action. Denial or unavailable GPS leaves manual entry usable and never submits placeholder coordinates.
- Review blocks missing/invalid coordinates or a blank landmark.
- Submit once, confirm a reference is shown, and verify the incident appears in the dispatcher dashboard.
- Simulate network loss during submission, restore connectivity, retry, and confirm only one incident exists.
- Check My Reports/status tracking using the locally stored guest token.
- Verify API and Android logs do not include report bodies or precise location values in release mode.
- Confirm actual emergency numbers, agency details, HTTPS certificate, server secrets, persistence, and notification providers with the deployment owner before operational use.

## Current Limitations

The backend currently uses an in-memory store and demo accounts; the notification providers are simulated. Android media upload and on-device validation remain incomplete. Do not use this build for real emergency response until durable storage, approved providers, verified contact configuration, and field testing are complete.
