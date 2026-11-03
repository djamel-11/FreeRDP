#!/usr/bin/env bash
# Builds a signed Akked APK WITHOUT Gradle / the Google SDK downloader.
# Needs (Ubuntu/Debian):  sudo apt install openjdk-17-jdk-headless aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# Usage: ./build.sh            → build/akked.apk
# Signing key: android/akked-test.jks (created on first run; KEEP IT — updates must be signed with the same key. Never commit it).
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
KS="${AKKED_KEYSTORE:-akked-test.jks}"
KS_PASS="${AKKED_KEYSTORE_PASS:-akked-test-2026}"
VERSION_CODE="${VERSION_CODE:-1}"; VERSION_NAME="${VERSION_NAME:-0.1.0}"

[ -f "$ANDROID_JAR" ] || { echo "android.jar not found at $ANDROID_JAR (install android-sdk-platform-23)"; exit 1; }
[ -d res/mipmap-mdpi ] || python3 make_icons.py

rm -rf build && mkdir -p build/gen build/classes

# 1) resources + manifest → R.java and an unsigned apk (resources.arsc stored uncompressed: required on Android 11+)
aapt package -f -m -J build/gen -M AndroidManifest.xml -S res -I "$ANDROID_JAR" \
  --min-sdk-version 23 --target-sdk-version 30 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -0 arsc -F build/unaligned-noclasses.apk

# 2) compile Java (Java 8 bytecode so the old dex tool understands it)
javac -Xlint:deprecation --release 8 -classpath "$ANDROID_JAR" -d build/classes build/gen/app/akked/seller/R.java src/app/akked/seller/*.java

# 3) dex + add to the apk
dalvik-exchange --dex --output=build/classes.dex build/classes
cp build/unaligned-noclasses.apk build/unaligned.apk
( cd build && aapt add unaligned.apk classes.dex >/dev/null )

# 4) align, then sign (v1+v2+v3)
zipalign -f -p 4 build/unaligned.apk build/aligned.apk
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias akked -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "CN=Akked, O=Akked, C=MA" >/dev/null 2>&1
  echo "created signing key $KS (keep it safe)"
fi
apksigner sign --ks "$KS" --ks-pass "pass:$KS_PASS" --out build/akked.apk build/aligned.apk
apksigner verify --verbose build/akked.apk | head -6
zipalign -c -p 4 build/akked.apk && echo "alignment OK"
ls -l build/akked.apk
