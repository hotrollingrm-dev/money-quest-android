package dev.hotrollingrm.moneyquest;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Home-screen widget: today's shift + money left to spend. Data is written by the app (MQNative.setWidget). */
public class TodayWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { for (int id : ids) m.updateAppWidget(id, views(ctx)); }

    static RemoteViews views(Context ctx) {
        SharedPreferences p = MQNativePlugin.prefs(ctx);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_today);
        String shift = p.getString("w_shift", "");
        v.setTextViewText(R.id.w_shift, shift.isEmpty() ? "เปิดแอปหนึ่งครั้ง" : shift);
        v.setTextViewText(R.id.w_time, p.getString("w_time", ""));
        v.setTextViewText(R.id.w_status, p.getString("w_status", ""));
        v.setTextViewText(R.id.w_money, p.getString("w_money", "—"));
        v.setTextViewText(R.id.w_daily, p.getString("w_daily", ""));
        v.setTextViewText(R.id.w_next, p.getString("w_next", ""));
        String kind = p.getString("w_kind", "H");
        v.setInt(R.id.w_band, "setBackgroundResource", "N".equals(kind) ? R.drawable.widget_band_night : "D".equals(kind) ? R.drawable.widget_band_day : R.drawable.widget_band_off);
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 78, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return v;
    }

    static void updateAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        int[] ids = m.getAppWidgetIds(new ComponentName(ctx, TodayWidget.class));
        for (int id : ids) m.updateAppWidget(id, views(ctx));
    }
}
