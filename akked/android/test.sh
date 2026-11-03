#!/usr/bin/env bash
# Plain-JVM tests for the logic that doesn't need Android.
set -euo pipefail; cd "$(dirname "$0")"; rm -rf build/jvmtest && mkdir -p build/jvmtest
javac -d build/jvmtest src/app/akked/seller/UrlRules.java test/UrlRulesTest.java 2>&1 | grep -v "^Picked up" || true
java -cp build/jvmtest app.akked.seller.UrlRulesTest 2>&1 | grep -v "^Picked up"
