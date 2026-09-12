# Ionic Photo Gallery

A cross-platform photo gallery built with **Ionic Framework**, **Vue 3** (Composition API +
`<script setup>`), **TypeScript**, **Vite** and **Capacitor 8**.

Take or pick a photo, save it to the device, and see it in a responsive gallery that survives
closing and reopening the app.

## How it works

```
Camera  ->  Filesystem (image bytes)  ->  Preferences (photo index)  ->  Ionic grid
```

* `@capacitor/camera` captures or picks the image.
* `@capacitor/filesystem` stores the image file in the app's private data directory.
* `@capacitor/preferences` stores a small JSON index of the saved file names, which is read back
  on launch to rebuild the gallery.

All of the logic lives in [`src/composables/usePhotoGallery.ts`](src/composables/usePhotoGallery.ts);
the UI lives in [`src/views/HomePage.vue`](src/views/HomePage.vue).

### Browser vs. device

The app is platform-aware. On Android it opens the native prompt (camera or gallery); in the
browser it falls back to the standard file picker, so `ionic serve` is fully testable without any
native-only dependency. Cancelling the picker or a camera error shows a toast rather than crashing.

## Running locally

```bash
npm install
npm run dev        # or: ionic serve
```

## Building the Android APK

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

> **Java 21 is required.** Capacitor 8 compiles its Android code at source/target level 21;
> building with Java 17 fails with `invalid source release: 21`.

## CI

[`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml) builds a debug APK on every
push to `main` and on manual dispatch, using Node.js 24 and Java 21. The result is uploaded as the
artifact **`IonicPhotoGallery-APK`** (`IonicPhotoGallery.apk`).

## Permissions

`android/app/src/main/AndroidManifest.xml` declares only what the camera plugin needs:

* `CAMERA` — take a picture.
* `READ_EXTERNAL_STORAGE` (`maxSdkVersion="32"`) — read a picked image on Android 12 and below.
  Android 13+ uses the system photo picker, which needs no permission.
