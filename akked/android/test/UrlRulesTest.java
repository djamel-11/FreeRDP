package app.akked.seller;

/** Plain-JVM checks for the URL rules: javac + java, no framework. Run via ./test.sh */
public class UrlRulesTest {
    static int fails = 0;
    static void eq(Object want, Object got, String what) { if (!java.util.Objects.equals(want, got)) { fails++; System.out.println("FAIL " + what + ": want " + want + " got " + got); } }

    public static void main(String[] a) {
        // accepted
        eq("https://app.akked.app", UrlRules.normalize("https://app.akked.app"), "https as is");
        eq("https://app.akked.app", UrlRules.normalize("app.akked.app"), "bare host → https");
        eq("https://example.com", UrlRules.normalize("HTTPS://Example.COM/path?x=1#y"), "case + path stripped");
        eq("http://192.168.1.5:3000", UrlRules.normalize("192.168.1.5:3000"), "LAN ip → http");
        eq("http://192.168.1.5:3000", UrlRules.normalize("http://192.168.1.5:3000/"), "LAN http");
        eq("http://10.0.2.2:3000", UrlRules.normalize("http://10.0.2.2:3000/"), "emulator host");
        eq("http://localhost:3000", UrlRules.normalize("localhost:3000"), "localhost");
        eq("http://pc.local:3000", UrlRules.normalize("pc.local:3000"), "mDNS name");
        eq("http://172.16.0.9", UrlRules.normalize("http://172.16.0.9"), "172.16/12");
        eq("https://192.168.1.5:3443", UrlRules.normalize("https://192.168.1.5:3443"), "https on LAN ok");
        eq("https://192.168.1.5", UrlRules.normalize("https://evil.com@192.168.1.5"), "userinfo dropped, real host kept");
        // rejected
        for (String bad : new String[]{null, "", "   ", "a b", "javascript:alert(1)", "file:///sdcard/x", "ftp://x.com", "intent://x#Intent;end", "http://app.akked.app", "http://8.8.8.8",
                "http://172.15.0.1", "http://172.32.0.1", "http://192.169.1.1", "http://10.0.0.999", "http://", "://x", "https://", "data:text/html,hi"})
            eq(null, UrlRules.normalize(bad), "reject " + bad);
        // origin check: what may stay inside the app
        String s = "https://app.akked.app";
        eq(true, UrlRules.sameOrigin(s, "https://app.akked.app/orders?x=1"), "same host");
        eq(true, UrlRules.sameOrigin(s, "https://APP.akked.app:443/x"), "default port + case");
        eq(false, UrlRules.sameOrigin(s, "http://app.akked.app/"), "scheme differs");
        eq(false, UrlRules.sameOrigin(s, "https://app.akked.app.evil.com/"), "suffix trick");
        eq(false, UrlRules.sameOrigin(s, "https://evil.com/app.akked.app"), "path trick");
        eq(false, UrlRules.sameOrigin(s, "https://app.akked.app@evil.com/"), "userinfo trick");
        eq(false, UrlRules.sameOrigin(s, "https://app.akked.app:8443/"), "port differs");
        eq(false, UrlRules.sameOrigin(s, "https://wa.me/212612345678"), "whatsapp leaves the app");
        eq(false, UrlRules.sameOrigin(s, "tel:+212612345678"), "tel leaves the app");
        eq(false, UrlRules.sameOrigin(s, "intent://x#Intent;scheme=whatsapp;end"), "intent leaves the app");
        eq(false, UrlRules.sameOrigin(null, "https://a.com"), "no server yet");
        eq(true, UrlRules.sameOrigin("http://192.168.1.5:3000", "http://192.168.1.5:3000/confirm"), "LAN same origin");
        eq(false, UrlRules.sameOrigin("http://192.168.1.5:3000", "http://192.168.1.5:3001/"), "LAN other port");
        System.out.println(fails == 0 ? "URL RULES OK" : fails + " FAILURES");
        System.exit(fails == 0 ? 0 : 1);
    }
}
