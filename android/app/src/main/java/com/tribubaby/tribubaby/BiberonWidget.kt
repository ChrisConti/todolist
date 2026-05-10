package com.tribubaby.tribubaby

import com.tribubaby.app.R
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.view.View
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class BiberonWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        const val PREFS_NAME = "widget_data"
        const val KEY_LAST_BOTTLE = "lastBottle"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_biberon)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_LAST_BOTTLE, null)

            if (json != null) {
                try {
                    val obj = JSONObject(json)
                    val ml = obj.getInt("ml")
                    val timestamp = obj.getLong("timestamp")
                    val date = Date(timestamp * 1000L)

                    views.setViewVisibility(R.id.widget_empty, View.GONE)
                    views.setViewVisibility(R.id.widget_amount_row, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_time_block, View.VISIBLE)

                    views.setTextViewText(R.id.widget_ml, ml.toString())
                    views.setTextViewText(R.id.widget_time_ago, timeAgo(context, date))
                    views.setTextViewText(R.id.widget_made_at,
                        context.getString(R.string.widget_made_at, formattedTime(date)))

                } catch (_: Exception) {
                    showEmpty(views)
                }
            } else {
                showEmpty(views)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun showEmpty(views: RemoteViews) {
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
            views.setViewVisibility(R.id.widget_amount_row, View.GONE)
            views.setViewVisibility(R.id.widget_time_block, View.GONE)
        }

        private fun timeAgo(context: Context, date: Date): String {
            val diff = (System.currentTimeMillis() - date.time) / 1000
            return when {
                diff < 60 -> context.getString(R.string.time_now)
                diff < 3600 -> context.getString(R.string.time_minutes, (diff / 60).toInt())
                else -> {
                    val h = (diff / 3600).toInt()
                    val m = ((diff % 3600) / 60).toInt()
                    if (m == 0) context.getString(R.string.time_hours, h)
                    else context.getString(R.string.time_hours_minutes, h, m)
                }
            }
        }

        private fun formattedTime(date: Date): String {
            val locale = Locale.getDefault()
            val pattern = if (locale.language == "en") "h:mm a" else "HH'h'mm"
            val sdf = SimpleDateFormat(pattern, locale)
            return sdf.format(date)
        }
    }
}
