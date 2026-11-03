package app.akked.seller;

import java.net.URI;
import java.util.Locale;

/** Server-address rules, kept free of Android classes so they can be unit-tested on a plain JVM. */
final class UrlRules {
    private UrlRules() {}

    /** Returns scheme://host[:port] (lower-case, no path/credentials), or null if the address is not acceptable.
     *  Plain http is accepted only for local networks; everything else must be https. */
    static String normalize(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.isEmpty() || s.contains(" ")) return null;
        if (!s.contains("://")) {
            String h = hostOf("x://" + s);
            if (h == null) return null;
            s = (looksLocal(h) ? "http://" : "https://") + s;
        }
        URI u;
        try { u = new URI(s); } catch (Exception e) { return null; }
        String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.ROOT);
        String host = u.getHost();
        if (host == null || host.isEmpty()) return null;
        if (!scheme.equals("http") && !scheme.equals("https")) return null;
        if (scheme.equals("http") && !looksLocal(host)) return null;
        return scheme + "://" + host.toLowerCase(Locale.ROOT) + (u.getPort() > 0 ? ":" + u.getPort() : "");
    }

    static String hostOf(String url) {
        try { return new URI(url).getHost(); } catch (Exception e) { return null; }
    }

    static boolean looksLocal(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.ROOT);
        if (h.equals("localhost") || h.endsWith(".local") || h.equals("10.0.2.2")) return true;
        String[] p = h.split("\\.");
        if (p.length != 4) return false;
        try {
            int a = Integer.parseInt(p[0]), b = Integer.parseInt(p[1]);
            for (String x : p) { int v = Integer.parseInt(x); if (v < 0 || v > 255) return false; }
            return a == 10 || (a == 192 && b == 168) || (a == 172 && b >= 16 && b <= 31) || a == 127;
        } catch (NumberFormatException e) { return false; }
    }

    private static int port(URI u) { return u.getPort() > 0 ? u.getPort() : ("https".equalsIgnoreCase(u.getScheme()) ? 443 : 80); }

    /** True only for the same scheme + host + port as the configured server: such pages stay inside the app, everything else leaves it. */
    static boolean sameOrigin(String serverUrl, String url) {
        if (serverUrl == null || url == null) return false;
        try {
            URI s = new URI(serverUrl), u = new URI(url);
            if (s.getHost() == null || u.getHost() == null || u.getScheme() == null) return false;
            return s.getScheme().equalsIgnoreCase(u.getScheme()) && s.getHost().equalsIgnoreCase(u.getHost()) && port(s) == port(u);
        } catch (Exception e) { return false; }
    }
}
