# Riptide Rally on iPhone and Android

This folder wraps the web game in real phone apps with [Capacitor](https://capacitorjs.com). The game itself stays in `../index.html`, so every update to the website flows into the apps.

## Android (test on your phone today)
Every push to `main` builds a test APK automatically: GitHub → **Actions** → **Android app** → latest run → download **riptide-rally-android**. Unzip it, copy `app-debug.apk` to an Android phone and open it (allow "install unknown apps").

To publish on Google Play ($25 one-time developer account):
1. Install Node 20 and Android Studio, then in this folder run `npm install` and `npm run android`.
2. In Android Studio: **Build → Generate Signed App Bundle**, then upload the `.aab` in the Play Console.

## iPhone and iPad
Apple only builds apps on a Mac with Xcode, and publishing needs an Apple Developer account ($99/year).
1. On the Mac: `npm install`, then `npm run ios` (opens Xcode).
2. In Xcode pick your team under **Signing & Capabilities**, plug in your iPhone and press Run. Use **Product → Archive** to send it to the App Store.

## Making money with ads
- **In the apps:** sign up at admob.google.com, create an app for iOS and one for Android, and a **Rewarded** ad unit for each. Put the ad unit ids in `ADS.admob` in the game (or in `ads.json`), set `testing: false`, and put the *app* ids in `patch-native.mjs` (or the `ADMOB_ANDROID_APP_ID` / `ADMOB_IOS_APP_ID` environment variables).
- **On the website:** apply for Google AdSense, turn on H5 Games ads, and put your `ca-pub-…` id in `adsenseClient` in `ads.json`.
- **Affiliate posters and billboards:** edit `spots` in `ads.json` at the root of the repo. Each spot has a `title`, `sub`, colours, an optional `img` (put the picture in an `ads/` folder) and the `url` people go to when they tap it. No rebuild needed.

Until an ad network is approved, the free-fish button plays a 15-second sponsor break from your own `spots`.
