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

The debug default URL is `http://10.0.2.2:4000/api/v1/`, which reaches the host API from the standard Android emulator. Cleartext HTTP is enabled only in the debug variant.

## Physical Phone on the Same Wi-Fi

1. Find the development computer's LAN IP and allow inbound TCP port 4000 through its firewall.
2. Start the API and build with the LAN endpoint:

   ```powershell
   .\gradlew.bat testDebugUnitTest assembleDebug -PAPI_BASE_URL=http://192.168.1.20:4000/api/v1/
   ```

3. Replace the example address with the computer's actual LAN IP. Install `app\build\outputs\apk\debug\app-debug.apk` on the phone using Android Studio or `adb install -r app\build\outputs\apk\debug\app-debug.apk`.

Do not use a LAN HTTP URL for a release APK. Debug APKs and development credentials/data are for testing only.

## Release APK

A release build requires a publicly reachable HTTPS API endpoint and a release signing key. Build configuration rejects non-HTTPS/missing release endpoints:

```powershell
$env:API_BASE_URL = "https://api.example.org/api/v1/"
.\gradlew.bat testDebugUnitTest assembleRelease
```

The unsigned release output is `app\build\outputs\apk\release\app-release-unsigned.apk`. Configure a private signing key in local Gradle properties or CI secrets before distributing it; never commit keystore files, passwords, or signing credentials. For a quick internal test, use the signed debug APK instead.

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
