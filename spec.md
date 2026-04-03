# Naksha — Android 14 Native-Hybrid Architecture Reconstruction

## Current State

- AndroidManifest.xml exists with basic Capacitor permissions, but:
  - Missing `MANAGE_EXTERNAL_STORAGE` (required for SAF / All Files Access on Android 14)
  - No SAF `<queries>` block for document picker intents
  - READ/WRITE_EXTERNAL_STORAGE capped at `maxSdkVersion="29"` (pre-Android-14)
  - No Kotlin `MainActivity.kt` — only the manifest and no Java/Kotlin source
- No `build.gradle`, `settings.gradle`, or `gradle.properties` in android folder (skeleton only)
- No `MainActivity.java` or `MainActivity.kt` present
- No GitHub Actions workflow file exists in the repo
- Frontend `main.tsx` renders React immediately without waiting for Capacitor bridge ready signal — causes 'Could not write' race condition on cold launch
- `capacitor.config.json` and `capacitor.config.ts` both set `webDir: 'www'` and `androidScheme: 'https'` — correct

## Requested Changes (Diff)

### Add
- `android/app/src/main/java/com/suryansh/naksha/MainActivity.kt` — Kotlin entry point using `ComponentActivity`, requests `POST_NOTIFICATIONS` at runtime on first launch, handles SAF All Files Access intent (`ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION`)
- `android/build.gradle` — root Gradle build file targeting Gradle 8.2+, Kotlin plugin
- `android/app/build.gradle` — app-level Gradle with `compileSdk 34`, `targetSdk 34`, `minSdk 22`, Kotlin/Capacitor dependencies
- `android/settings.gradle` — module include with `pluginManagement` block for Gradle 8.2
- `android/gradle.properties` — JVM heap, AndroidX opt-in, Kotlin incremental compilation
- `android/gradle/wrapper/gradle-wrapper.properties` — Gradle 8.2 distribution URL
- `.github/workflows/build-apk.yml` — Node 24/Java 21/pnpm 9 GitHub Actions workflow with FORCE_JAVASCRIPT_ACTIONS_TO_NODE24, reconstructs android folder cleanly, injects all permissions into manifest, generates icons, builds debug APK
- `src/frontend/src/utils/nativeBridge.ts` — waits for `Capacitor.ready()` / `deviceready` event before resolving; used to gate React render

### Modify
- `android/app/src/main/AndroidManifest.xml` — add `MANAGE_EXTERNAL_STORAGE`, SAF `<queries>` block for `ACTION_OPEN_DOCUMENT_TREE` + `ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION`, update `<activity>` to match Kotlin class, add `android:exported="true"` on receiver entries
- `src/frontend/src/main.tsx` — defer React root creation until native bridge handshake completes (use `nativeBridge.ts` await before `ReactDOM.createRoot`)
- `src/frontend/src/utils/capacitorStorage.ts` — no change needed (already uses `Directory.Documents`)
- `capacitor.config.json` — add `Filesystem.iosScheme` and ensure `androidScheme: 'https'` is present; add `loggingBehavior: 'none'` for production

### Remove
- Any `MainActivity.java` if it appears during Capacitor `cap add android` — replaced by `MainActivity.kt`
- Legacy receiver declarations for Capacitor plugins not present in current plugin list

## Implementation Plan

1. Write `MainActivity.kt` using `ComponentActivity`, register `ActivityResultLauncher` for SAF `ACTION_OPEN_DOCUMENT_TREE`, request `POST_NOTIFICATIONS` at runtime with `ActivityResultContracts.RequestPermission`, check and launch `ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION` on first launch
2. Write `android/build.gradle` (root) — Kotlin 1.9+, AGP 8.2+, Capacitor Gradle plugin
3. Write `android/app/build.gradle` (app) — `compileSdk 34`, `targetSdk 34`, `minSdk 22`, Kotlin stdlib, Capacitor core + plugins
4. Write `android/settings.gradle` with `pluginManagement` repository block for Gradle 8.2+
5. Write `android/gradle.properties` with AndroidX enabled, heap settings
6. Write `android/gradle/wrapper/gradle-wrapper.properties` pointing to Gradle 8.2 distribution
7. Update `AndroidManifest.xml` — add `MANAGE_EXTERNAL_STORAGE`, SAF queries block, correct `<activity>` name `.MainActivity` (Kotlin class), exported flags
8. Write `nativeBridge.ts` util — returns Promise that resolves immediately on web, listens for Capacitor `pluginsready` on native
9. Update `main.tsx` — await `nativeBridge.ts` before calling `ReactDOM.createRoot`, preventing 'Could not write' errors
10. Write updated `.github/workflows/build-apk.yml` — uses `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`, Node 24, Java 21, pnpm 9, tears down and rebuilds android folder, patches manifest with sed, syncs Capacitor, generates icons if present, builds with Gradle 8.2
