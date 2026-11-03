# Akked for Android (APK)

A light native shell (≈ 37 KB, no libraries) that opens **your Akked server** inside a real app:
- asks for the server address once (and again via *Settings → change server*, or on a connection error),
- file upload (Excel/CSV models, payment proofs, CSV import) through the system file picker,
- downloads (exports) into the phone's **Downloads** folder, using the logged-in session,
- WhatsApp (`wa.me`), phone calls and any other site open in the right app — only your server stays inside,
- Arabic/RTL UI, back button, cookies kept (stays logged in).

The app does **not** contain the Akked server: it needs a server to talk to
(`http://192.168.x.x:3000` on the same Wi-Fi for tests — the PC must be running Akked — or your public `https://…` address later).
Plain `http://` is only accepted for local networks (`10.x`, `192.168.x`, `172.16–31.x`, `localhost`, `*.local`, emulator `10.0.2.2`); anything public must be `https://`.

## Install (sideloading)
1. Copy `akked.apk` to the phone (WhatsApp/Telegram/USB/Drive).
2. Open it; allow "Install unknown apps" for the app you opened it from (Android asks).
3. Open **أكّد**, type the server address, tap *Open*.

## Rebuild
```bash
sudo apt install openjdk-17-jdk-headless aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 python3-pil
./test.sh     # plain-JVM checks of the URL/security rules
./build.sh    # → build/akked.apk, signed with akked-test.jks (created on first run)
```
No Gradle / Google SDK download needed. **Keep `akked-test.jks`** (and its password) — an update must be signed with the same key or users must uninstall first. Never commit it.

## Limits of this build (be aware)
- Built for **sideloading** (`targetSdk 30`, `minSdk 23` = Android 6+). **Google Play** needs a newer target SDK, an AAB and your own release key: convert to a Gradle project or a Trusted Web Activity once the app has a public HTTPS domain.
- Not yet run on a physical device by the author (built and checked statically: manifest, signature v1/v2/v3, alignment, dex contents, JVM tests of the URL rules). Test the three things that depend on the phone: file picker, export download, WhatsApp hand-off.
- No push notifications and no offline mode (it is the website inside an app).
