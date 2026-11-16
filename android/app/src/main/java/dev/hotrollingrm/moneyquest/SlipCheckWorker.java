package dev.hotrollingrm.moneyquest;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/** Every ~30 min: count new images in bank-app albums since the last import and post one quiet notification. */
public class SlipCheckWorker extends Worker {
    public SlipCheckWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    @NonNull @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        String perm = Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_IMAGES : Manifest.permission.READ_EXTERNAL_STORAGE;
        if (ContextCompat.checkSelfPermission(ctx, perm) != PackageManager.PERMISSION_GRANTED) return Result.success();
        SharedPreferences p = MQNativePlugin.prefs(ctx);
        long since = p.getLong("lastScan", 0L);
        if (since == 0L) return Result.success();               // the app has not imported yet
        int n = MQNativePlugin.countNewSlips(ctx, since);
        if (n <= 0 || n == p.getInt("notifiedCount", 0)) return Result.success();
        p.edit().putInt("notifiedCount", n).apply();
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return Result.success();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel("slips", "สลิปใหม่", NotificationManager.IMPORTANCE_DEFAULT));
        Intent open = new Intent(ctx, MainActivity.class).putExtra("openTab", "slips").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 77, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        nm.notify(7701, new NotificationCompat.Builder(ctx, "slips")
            .setSmallIcon(R.drawable.ic_stat_mq)
            .setContentTitle("มีสลิปใหม่ " + n + " ใบ")
            .setContentText("แตะเพื่อให้ MONEY QUEST อ่านและบันทึก")
            .setContentIntent(pi).setAutoCancel(true).build());
        return Result.success();
    }
}
