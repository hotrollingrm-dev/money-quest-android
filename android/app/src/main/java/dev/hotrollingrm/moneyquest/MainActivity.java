package dev.hotrollingrm.moneyquest;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.plugin.WebView;

import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MQNativePlugin.class);
        guardDownloadedBundle();
        super.onCreate(savedInstanceState);
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("slip-check", ExistingPeriodicWorkPolicy.KEEP,
            new PeriodicWorkRequest.Builder(SlipCheckWorker.class, 30, TimeUnit.MINUTES).build());
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    /** A downloaded web bundle that fails to start twice in a row is dropped; the app falls back to the bundled one. */
    private void guardDownloadedBundle() {
        SharedPreferences mq = getSharedPreferences(MQNativePlugin.PREFS, Context.MODE_PRIVATE);
        if (!mq.getBoolean("pendingBoot", false)) return;
        int fails = mq.getInt("bootFails", 0) + 1;
        if (fails >= 3) {
            getSharedPreferences(WebView.WEBVIEW_PREFS_NAME, Context.MODE_PRIVATE).edit().remove(WebView.CAP_SERVER_PATH).apply();
            mq.edit().putBoolean("pendingBoot", false).putInt("bootFails", 0).remove("bundlePath").putInt("webVersion", BuildConfig.WEB_VERSION).putBoolean("rolledBack", true).apply();
        } else {
            mq.edit().putInt("bootFails", fails).apply();
        }
    }
}
