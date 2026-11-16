package dev.hotrollingrm.moneyquest;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Native side of MONEY QUEST: reads bank-app slip albums, writes the home-screen widget,
 * downloads updates (web bundle + APK) and saves exported files.
 * Slip images are only read on the device; nothing is uploaded.
 */
@CapacitorPlugin(
    name = "MQNative",
    permissions = {
        @Permission(alias = "photos", strings = { Manifest.permission.READ_MEDIA_IMAGES }),
        @Permission(alias = "photosLegacy", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class MQNativePlugin extends Plugin {

    static final String PREFS = "mq_native";
    /** Album names / folders that bank apps save e-slips into (matched case-insensitively). */
    static final String DEFAULT_ALBUMS =
        "k ?plus|kplus|kbank|scb|easy|krungthai|ktb|next|mymo|gsb|ออมสิน|ttb|touch|krungsri|kma|bualuang|bbl|bangkok ?bank|uob|tmrw|cimb|kkp|baac|ธ\\.?ก\\.?ส|ghb|lh ?bank|tisco|truemoney|paotang|เป๋าตัง|slip|สลิป";

    private String photosAlias() { return Build.VERSION.SDK_INT >= 33 ? "photos" : "photosLegacy"; }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static Pattern albumPattern(Context c) {
        String p = prefs(c).getString("albums", "");
        if (p == null || p.isEmpty()) p = DEFAULT_ALBUMS;
        return Pattern.compile(p, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    /* ── permissions ── */
    @PluginMethod
    public void photoPermission(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState(photosAlias()) == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void requestPhotos(PluginCall call) {
        if (getPermissionState(photosAlias()) == PermissionState.GRANTED) { photoPermission(call); return; }
        requestPermissionForAlias(photosAlias(), call, "photosCallback");
    }

    @PermissionCallback
    private void photosCallback(PluginCall call) { photoPermission(call); }

    /* ── albums & slips ── */
    @PluginMethod
    public void listAlbums(PluginCall call) {
        if (getPermissionState(photosAlias()) != PermissionState.GRANTED) { call.reject("no_permission"); return; }
        new Thread(() -> {
            try {
                java.util.Map<String, Integer> counts = new java.util.TreeMap<>();
                try (Cursor c = getContext().getContentResolver().query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                        new String[]{ MediaStore.Images.Media.BUCKET_DISPLAY_NAME }, null, null, null)) {
                    while (c != null && c.moveToNext()) {
                        String b = c.getString(0); if (b == null) b = "";
                        Integer n = counts.get(b); counts.put(b, n == null ? 1 : n + 1);
                    }
                }
                Pattern p = albumPattern(getContext());
                JSArray arr = new JSArray();
                for (java.util.Map.Entry<String, Integer> e : counts.entrySet()) {
                    JSObject o = new JSObject();
                    o.put("name", e.getKey()); o.put("count", e.getValue()); o.put("match", p.matcher(e.getKey()).find());
                    arr.put(o);
                }
                JSObject r = new JSObject(); r.put("albums", arr); call.resolve(r);
            } catch (Exception ex) { call.reject(ex.getMessage()); }
        }).start();
    }

    /** albums: optional exact album names chosen by the user; otherwise the bank-album pattern is used. */
    @PluginMethod
    public void setScanSettings(PluginCall call) {
        SharedPreferences.Editor e = prefs(getContext()).edit();
        if (call.hasOption("albums")) {
            try {
                JSONArray a = call.getArray("albums");
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < a.length(); i++) { if (sb.length() > 0) sb.append('|'); sb.append("^").append(Pattern.quote(a.getString(i))).append("$"); }
                e.putString("albums", sb.toString());
            } catch (Exception ex) { e.remove("albums"); }
        }
        if (call.hasOption("lastScan")) e.putLong("lastScan", call.getLong("lastScan", 0L));
        e.apply();
        call.resolve();
    }

    static int countNewSlips(Context ctx, long sinceMs) {
        int n = 0;
        Pattern p = albumPattern(ctx);
        try (Cursor c = ctx.getContentResolver().query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                new String[]{ MediaStore.Images.Media.BUCKET_DISPLAY_NAME, MediaStore.Images.Media.WIDTH, MediaStore.Images.Media.HEIGHT },
                MediaStore.Images.Media.DATE_ADDED + " > ?", new String[]{ String.valueOf(sinceMs / 1000) }, null)) {
            while (c != null && c.moveToNext()) {
                String b = c.getString(0);
                if (b != null && p.matcher(b).find() && c.getInt(2) >= c.getInt(1)) n++;
            }
        } catch (Exception ignored) { }
        return n;
    }

    @PluginMethod
    public void listSlips(PluginCall call) {
        if (getPermissionState(photosAlias()) != PermissionState.GRANTED) { call.reject("no_permission"); return; }
        final long since = call.getLong("since", 0L);
        final int limit = call.getInt("limit", 300);
        new Thread(() -> {
            try {
                Pattern p = albumPattern(getContext());
                JSArray arr = new JSArray();
                String[] proj = { MediaStore.Images.Media._ID, MediaStore.Images.Media.DISPLAY_NAME, MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
                    MediaStore.Images.Media.DATE_ADDED, MediaStore.Images.Media.DATE_TAKEN, MediaStore.Images.Media.WIDTH, MediaStore.Images.Media.HEIGHT };
                try (Cursor c = getContext().getContentResolver().query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, proj,
                        MediaStore.Images.Media.DATE_ADDED + " > ?", new String[]{ String.valueOf(since / 1000) },
                        MediaStore.Images.Media.DATE_ADDED + " ASC")) {
                    while (c != null && c.moveToNext() && arr.length() < limit) {
                        String bucket = c.getString(2);
                        if (bucket == null || !p.matcher(bucket).find()) continue;
                        int w = c.getInt(5), h = c.getInt(6);
                        if (w > 0 && h > 0 && h < w) continue;              // slips are portrait
                        long id = c.getLong(0);
                        long taken = c.getLong(4); long added = c.getLong(3) * 1000L;
                        JSObject o = new JSObject();
                        o.put("uri", ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id).toString());
                        o.put("name", c.getString(1)); o.put("album", bucket);
                        o.put("added", added); o.put("taken", taken > 0 ? taken : added);
                        arr.put(o);
                    }
                }
                JSObject r = new JSObject(); r.put("items", arr); call.resolve(r);
            } catch (Exception ex) { call.reject(ex.getMessage()); }
        }).start();
    }

    @PluginMethod
    public void readImage(PluginCall call) {
        final String uri = call.getString("uri");
        final int maxSide = call.getInt("maxSide", 1600);
        if (uri == null) { call.reject("uri"); return; }
        new Thread(() -> {
            try {
                ContentResolver cr = getContext().getContentResolver();
                BitmapFactory.Options o = new BitmapFactory.Options(); o.inJustDecodeBounds = true;
                try (InputStream in = cr.openInputStream(Uri.parse(uri))) { BitmapFactory.decodeStream(in, null, o); }
                int sample = 1; while (Math.max(o.outWidth, o.outHeight) / (sample * 2) >= maxSide) sample *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = sample;
                Bitmap bm; try (InputStream in = cr.openInputStream(Uri.parse(uri))) { bm = BitmapFactory.decodeStream(in, null, o2); }
                if (bm == null) { call.reject("decode"); return; }
                int big = Math.max(bm.getWidth(), bm.getHeight());
                if (big > maxSide) { float k = maxSide / (float) big; Bitmap s = Bitmap.createScaledBitmap(bm, Math.round(bm.getWidth() * k), Math.round(bm.getHeight() * k), true); bm.recycle(); bm = s; }
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                bm.compress(Bitmap.CompressFormat.JPEG, 92, bos);
                JSObject r = new JSObject();
                r.put("base64", Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP));
                r.put("width", bm.getWidth()); r.put("height", bm.getHeight());
                bm.recycle();
                call.resolve(r);
            } catch (Exception ex) { call.reject(ex.getMessage()); }
        }).start();
    }

    /* ── widget ── */
    @PluginMethod
    public void setWidget(PluginCall call) {
        SharedPreferences.Editor e = prefs(getContext()).edit();
        for (String k : new String[]{ "shift", "time", "status", "money", "daily", "next", "kind" }) e.putString("w_" + k, call.getString(k, ""));
        e.putLong("w_at", System.currentTimeMillis());
        e.apply();
        TodayWidget.updateAll(getContext());
        call.resolve();
    }

    /* ── info / boot bookkeeping for web-bundle rollback ── */
    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject r = new JSObject();
        r.put("versionCode", BuildConfig.VERSION_CODE);
        r.put("versionName", BuildConfig.VERSION_NAME);
        r.put("nativeVersion", BuildConfig.NATIVE_VERSION);
        r.put("webVersion", prefs(getContext()).getInt("webVersion", BuildConfig.WEB_VERSION));
        r.put("bundledWebVersion", BuildConfig.WEB_VERSION);
        r.put("rolledBack", prefs(getContext()).getBoolean("rolledBack", false));
        Intent it = getActivity() != null ? getActivity().getIntent() : null;
        r.put("openTab", it != null ? it.getStringExtra("openTab") : null);
        call.resolve(r);
    }

    @PluginMethod
    public void markBooted(PluginCall call) {
        prefs(getContext()).edit().putInt("bootFails", 0).putBoolean("pendingBoot", false).apply();
        call.resolve();
    }

    /** Called right before switching the WebView to a downloaded bundle. */
    @PluginMethod
    public void setPendingBundle(PluginCall call) {
        prefs(getContext()).edit().putBoolean("pendingBoot", true).putInt("bootFails", 0)
            .putInt("webVersion", call.getInt("version", 0)).putString("bundlePath", call.getString("path")).apply();
        call.resolve();
    }

    /* ── network helpers (no CORS issues on the native side) ── */
    static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = null; String u = url;
        for (int i = 0; i < 6; i++) {
            c = (HttpURLConnection) new URL(u).openConnection();
            c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(60000);
            c.setRequestProperty("User-Agent", "MoneyQuest-Android");
            c.setRequestProperty("Accept", "application/octet-stream, application/json, */*");
            int code = c.getResponseCode();
            if (code >= 300 && code < 400) { u = c.getHeaderField("Location"); c.disconnect(); continue; }
            return c;
        }
        return c;
    }

    @PluginMethod
    public void httpGet(PluginCall call) {
        final String url = call.getString("url");
        new Thread(() -> {
            try {
                HttpURLConnection c = open(url);
                int code = c.getResponseCode();
                InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
                ByteArrayOutputStream bos = new ByteArrayOutputStream(); byte[] buf = new byte[8192]; int n;
                while (in != null && (n = in.read(buf)) > 0) bos.write(buf, 0, n);
                JSObject r = new JSObject(); r.put("status", code); r.put("text", new String(bos.toByteArray(), StandardCharsets.UTF_8));
                call.resolve(r);
            } catch (Exception ex) { call.reject(ex.getMessage()); }
        }).start();
    }

    static File download(String url, File dest) throws Exception {
        HttpURLConnection c = open(url);
        if (c.getResponseCode() >= 400) throw new Exception("http " + c.getResponseCode());
        dest.getParentFile().mkdirs();
        try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[65536]; int n; while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
        return dest;
    }

    /** Download + unzip a web bundle into files/web/v{version}. Returns the folder for WebView.setServerBasePath. */
    @PluginMethod
    public void downloadWebBundle(PluginCall call) {
        final String url = call.getString("url"); final int version = call.getInt("version", 0);
        new Thread(() -> {
            try {
                File root = new File(getContext().getFilesDir(), "web");
                File dir = new File(root, "v" + version);
                File zip = download(url, new File(root, "v" + version + ".zip"));
                if (dir.exists()) deleteTree(dir);
                dir.mkdirs();
                String base = dir.getCanonicalPath() + File.separator;
                try (ZipInputStream zin = new ZipInputStream(new java.io.FileInputStream(zip))) {
                    ZipEntry ze; byte[] buf = new byte[65536];
                    while ((ze = zin.getNextEntry()) != null) {
                        File f = new File(dir, ze.getName());
                        if (!f.getCanonicalPath().startsWith(base)) throw new Exception("bad zip entry");
                        if (ze.isDirectory()) { f.mkdirs(); continue; }
                        f.getParentFile().mkdirs();
                        try (OutputStream out = new FileOutputStream(f)) { int n; while ((n = zin.read(buf)) > 0) out.write(buf, 0, n); }
                    }
                }
                zip.delete();
                if (!new File(dir, "index.html").exists()) throw new Exception("bundle has no index.html");
                // keep only this and the previous bundle
                File[] olds = root.listFiles();
                if (olds != null) for (File f : olds) if (f.isDirectory() && !f.getName().equals("v" + version) && !f.getAbsolutePath().equals(prefs(getContext()).getString("bundlePath", ""))) deleteTree(f);
                JSObject r = new JSObject(); r.put("path", dir.getAbsolutePath()); call.resolve(r);
            } catch (Exception ex) { call.reject(ex.getMessage()); }
        }).start();
    }

    static void deleteTree(File f) { File[] k = f.listFiles(); if (k != null) for (File x : k) deleteTree(x); f.delete(); }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject r = new JSObject();
        r.put("allowed", Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(r);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 26) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    /** Download the APK and open the system installer (the user taps "Update" once). */
    @PluginMethod
    public void installApk(PluginCall call) {
        final String url = call.getString("url");
        new Thread(() -> {
            try {
                File apk = download(url, new File(getContext().getCacheDir(), "updates/money-quest.apk"));
                Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(u, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                call.resolve();
            } catch (Exception ex) { call.reject(ex.getMessage()); }
        }).start();
    }

    /** Save an exported file (Excel, PDF, backup) into Downloads/MoneyQuest. */
    @PluginMethod
    public void saveFile(PluginCall call) {
        final String name = call.getString("name", "moneyquest.bin");
        final String mime = call.getString("mime", "application/octet-stream");
        final byte[] data = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
        new Thread(() -> {
            try {
                String where;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(MediaStore.Downloads.MIME_TYPE, mime);
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MoneyQuest");
                    Uri u = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    try (OutputStream out = getContext().getContentResolver().openOutputStream(u)) { out.write(data); }
                    where = "Download/MoneyQuest/" + name;
                } else {
                    File f = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), name);
                    try (OutputStream out = new FileOutputStream(f)) { out.write(data); }
                    where = f.getAbsolutePath();
                }
                JSObject r = new JSObject(); r.put("path", where); call.resolve(r);
            } catch (Exception ex) { call.reject(ex.getMessage()); }
        }).start();
    }
}
