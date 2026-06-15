# HostelOS — Mobile Deployment Guide

This guide details the steps to build, synchronize, test, and release the **HostelOS** Android and iOS mobile applications built using Capacitor.

---

## 🚀 Quick Start Developer Workflow

To test the mobile application locally:

1. **Build the Web Assets**:
   ```bash
   npm run build
   ```

2. **Sync with Capacitor**:
   ```bash
   npx cap sync
   ```

3. **Run on Android**:
   * Open the project in Android Studio:
     ```bash
     npx cap open android
     ```
   * Select a target emulator or connected physical device and click **Run**.

4. **Run on iOS**:
   * Open the project in Xcode:
     ```bash
     npx cap open ios
     ```
   * Select a target simulator or connected iPhone and click **Run**.

---

## 📱 Live Reload Development

For active frontend development with immediate hot-reloads on real devices:

1. Start the Vite dev server locally:
   ```bash
   npm run dev -- --host
   ```
2. Note your computer's local IP address (e.g., `192.168.1.10`).
3. Temporarily update the `server.url` property in `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.10:5173',
     cleartext: true
   }
   ```
4. Run `npx cap copy` to apply the config to native wrappers.
5. Launch the app in Android Studio or Xcode to test live updates.

---

## 🔔 Push Notifications (FCM Integration)

Push notifications are powered by Firebase Cloud Messaging (FCM).

### Android Setup:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Add an Android app with the package name: `com.hostelos.app`.
3. Download `google-services.json` and place it in the `android/app/` directory.

### iOS Setup:
1. Add an iOS app to your Firebase project with the bundle identifier: `com.hostelos.app`.
2. Download `GoogleService-Info.plist` and place it in the `ios/App/App/` directory (ensure it is referenced in Xcode).
3. In Xcode, enable **Push Notifications** and **Background Modes** (check *Background fetch* and *Remote notifications*) under the App Target capabilities.

---

## 🔄 OTA Updates (Capgo Setup)

Over-the-air (OTA) updates are integrated using `@capgo/capacitor-updater`.

1. Sign up for a [Capgo account](https://capgo.app/).
2. Retrieve your API token and install the Capgo CLI globally:
   ```bash
   npm install -g @capgo/cli
   ```
3. Initialize Capgo in your project using:
   ```bash
   capgo init <your-api-key> <app-id>
   ```
4. When you make updates and want to deploy them silently:
   ```bash
   npm run build
   capgo upload
   ```

---

## 🌐 Deep Linking Setup

Deep linking lets links (e.g., `app.hostelos.com`) open directly inside the mobile app.

### Android (App Links):
* Configure intent filters in [android/app/src/main/AndroidManifest.xml](file:///Users/bhanuthammali26012gmail.com/Downloads/lorklup-main-main/android/app/src/main/AndroidManifest.xml) targeting your custom host.
* Upload your SHA-256 certificate fingerprint in an `.well-known/assetlinks.json` file on your domain.

### iOS (Universal Links):
* Add the `applinks:app.hostelos.com` entitlement in Xcode.
* Upload a valid `apple-app-site-association` file under the `.well-known/` directory of your domain.
