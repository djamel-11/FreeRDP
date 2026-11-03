package app.akked.seller;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Akked Android shell: opens the seller's Akked server inside a WebView, with file upload (Excel/CSV/proof images),
 * downloads (exports), and hand-off of WhatsApp / phone / external links to the right apps.
 * The server address is entered once on first launch (and can be changed from the app).
 */
public class MainActivity extends Activity {
    private static final String PREFS = "akked";
    private static final String KEY_URL = "server_url";
    private static final int REQ_FILE = 1;
    private static final int REQ_STORAGE = 2;
    private static final int GREEN = Color.parseColor("#0f9d58");

    private WebView web;
    private LinearLayout overlay;
    private TextView title, message;
    private EditText input;
    private Button primary, secondary;
    private String serverUrl;           // origin only, e.g. https://app.example.com or http://192.168.1.5:3000
    private boolean loadFailed;
    private boolean inErrorMode;
    private ValueCallback<Uri[]> fileCallback;
    private String[] pendingDownload;   // url, userAgent, contentDisposition, mime

    // ------------------------------------------------------------------ lifecycle
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(GREEN);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        buildOverlay(root);
        setContentView(root);

        configureWebView();
        serverUrl = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_URL, null);
        if (serverUrl == null) showSetup(null); else open(serverUrl);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (overlay.getVisibility() == View.VISIBLE && serverUrl != null && !inErrorMode) { hideOverlay(); return; }
        if (overlay.getVisibility() != View.VISIBLE && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // ------------------------------------------------------------------ UI (built in code: no layout files needed)
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private void buildOverlay(FrameLayout root) {
        overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setBackgroundColor(Color.WHITE);
        overlay.setPadding(dp(24), dp(24), dp(24), dp(24));
        overlay.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        overlay.setClickable(true);

        title = new TextView(this);
        title.setTextSize(26); title.setTextColor(Color.parseColor("#14213d")); title.setGravity(Gravity.CENTER);
        message = new TextView(this);
        message.setTextSize(15); message.setTextColor(Color.parseColor("#4b5563")); message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(8), 0, dp(16));

        input = new EditText(this);
        input.setHint("https://… أو http://192.168.1.5:3000");
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setImeOptions(EditorInfo.IME_ACTION_GO);
        input.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        input.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        input.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override public boolean onEditorAction(TextView v, int actionId, android.view.KeyEvent event) {
                if (actionId == EditorInfo.IME_ACTION_GO) { onPrimary(); return true; }
                return false;
            }
        });

        primary = styledButton(true);
        primary.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { onPrimary(); } });
        secondary = styledButton(false);
        secondary.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { showSetup(null); } });

        overlay.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        overlay.addView(message, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        overlay.addView(input, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        bp.topMargin = dp(12);
        overlay.addView(primary, bp);
        overlay.addView(secondary, bp);
        root.addView(overlay, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private Button styledButton(boolean filled) {
        Button b = new Button(this);
        b.setAllCaps(false);
        b.setTextSize(16);
        if (filled) { b.setBackgroundColor(GREEN); b.setTextColor(Color.WHITE); }
        else { b.setBackgroundColor(Color.parseColor("#eef2f7")); b.setTextColor(Color.parseColor("#14213d")); }
        return b;
    }

    /** First launch / change server. */
    private void showSetup(String error) {
        inErrorMode = false;
        title.setText("أكّد");
        message.setText(error != null ? error
                : "اكتب عنوان خادم أكّد الذي أعطاك إياه المسؤول.\nAdresse du serveur Akked");
        message.setTextColor(error != null ? Color.parseColor("#b42318") : Color.parseColor("#4b5563"));
        input.setVisibility(View.VISIBLE);
        input.setText(serverUrl != null ? serverUrl : "");
        input.setSelection(input.getText().length());
        primary.setText("فتح  /  Ouvrir"); primary.setVisibility(View.VISIBLE);
        secondary.setVisibility(serverUrl != null ? View.VISIBLE : View.GONE);
        secondary.setText("رجوع  /  Retour");
        secondary.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { hideOverlay(); } });
        overlay.setVisibility(View.VISIBLE);
        web.setVisibility(View.INVISIBLE);
        input.requestFocus();
    }

    /** Server unreachable / page failed to load. */
    private void showError(String detail) {
        inErrorMode = true;
        title.setText("تعذّر الاتصال");
        message.setText("تأكد من الإنترنت أو من أن الخادم يعمل وأن الهاتف على نفس الشبكة.\n" + (detail == null ? "" : detail) + "\n\n" + serverUrl);
        message.setTextColor(Color.parseColor("#4b5563"));
        input.setVisibility(View.GONE);
        primary.setText("إعادة المحاولة  /  Réessayer"); primary.setVisibility(View.VISIBLE);
        secondary.setText("تغيير عنوان الخادم  /  Changer le serveur"); secondary.setVisibility(View.VISIBLE);
        secondary.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { showSetup(null); } });
        overlay.setVisibility(View.VISIBLE);
    }

    private void hideOverlay() {
        inErrorMode = false;
        overlay.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(input.getWindowToken(), 0);
    }

    private void onPrimary() {
        if (inErrorMode) { open(serverUrl); return; }
        String url = UrlRules.normalize(input.getText().toString());
        if (url == null) { showSetup("العنوان غير صالح. استعمل https:// أو عنوان الشبكة المحلية مثل http://192.168.1.5:3000"); return; }
        serverUrl = url;
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_URL, url).apply();
        open(url);
    }

    private void open(String url) {
        loadFailed = false;
        inErrorMode = false;
        overlay.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
        web.loadUrl(url);
    }

    // ------------------------------------------------------------------ URL rules
    private boolean sameOrigin(Uri u) { return UrlRules.sameOrigin(serverUrl, u.toString()); }

    private void openExternal(String url) {
        try {
            Intent i = url.startsWith("intent:") ? Intent.parseUri(url, Intent.URI_INTENT_SCHEME) : new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            i.setComponent(null);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "لا يوجد تطبيق لفتح هذا الرابط", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "تعذّر فتح الرابط", Toast.LENGTH_SHORT).show();
        }
    }

    // ------------------------------------------------------------------ WebView
    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " AkkedAndroid/0.1");
        CookieManager.getInstance().setAcceptCookie(true);
        web.addJavascriptInterface(new Bridge(), "AkkedApp");

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri u = Uri.parse(url);
                String sch = u.getScheme() == null ? "" : u.getScheme();
                if ((sch.equals("http") || sch.equals("https")) && sameOrigin(u)) return false;
                openExternal(url);          // wa.me / whatsapp: / tel: / other sites → the right app
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) { loadFailed = false; }
            @Override public void onPageFinished(WebView view, String url) {
                if (!loadFailed && overlay.getVisibility() == View.VISIBLE && !inErrorMode && serverUrl != null && input.getVisibility() != View.VISIBLE) hideOverlay();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) { loadFailed = true; showError(String.valueOf(error.getDescription())); }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                String[] types = params.getAcceptTypes();
                if (types != null && types.length > 0 && types[0] != null && !types[0].isEmpty()) {
                    // accept=".xlsx,.csv" style hints can't be mapped to MIME types reliably → keep */* and let the server validate
                    boolean allMime = true;
                    for (String t : types) if (t == null || !t.contains("/")) allMime = false;
                    if (allMime) i.putExtra(Intent.EXTRA_MIME_TYPES, types);
                }
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(Intent.createChooser(i, "اختر ملفًا"), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null; callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "لا يوجد تطبيق لاختيار الملفات", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        web.setDownloadListener(new DownloadListener() {
            @Override public void onDownloadStart(String url, String userAgent, String contentDisposition, String mime, long length) {
                if (!sameOrigin(Uri.parse(url))) { openExternal(url); return; }
                startDownload(url, userAgent, contentDisposition, mime);
            }
        });
    }

    /** Exposed to the web app (only same-origin pages are ever shown in this WebView). */
    private class Bridge {
        @JavascriptInterface public void changeServer() {
            runOnUiThread(new Runnable() { @Override public void run() { showSetup(null); } });
        }
        @JavascriptInterface public String version() { return "0.1.0"; }
    }

    // ------------------------------------------------------------------ downloads (exports)
    private void startDownload(String url, String ua, String cd, String mime) {
        if (Build.VERSION.SDK_INT < 29 && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingDownload = new String[]{url, ua, cd, mime};
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
            return;
        }
        try {
            String name = URLUtil.guessFileName(url, cd, mime);
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            r.setMimeType(mime);
            r.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));   // the export route needs the login session
            r.addRequestHeader("User-Agent", ua);
            r.setTitle(name);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            ((DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(r);
            Toast.makeText(this, "جارٍ التنزيل: " + name, Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "تعذّر التنزيل", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code == REQ_STORAGE && pendingDownload != null) {
            String[] d = pendingDownload; pendingDownload = null;
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startDownload(d[0], d[1], d[2], d[3]);
            else Toast.makeText(this, "الإذن مطلوب لحفظ الملف", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE && fileCallback != null) {
            Uri[] res = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null;
            fileCallback.onReceiveValue(res);
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }
}
