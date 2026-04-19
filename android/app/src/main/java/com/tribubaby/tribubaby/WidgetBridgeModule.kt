package com.tribubaby.tribubaby

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

class WidgetBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetBridge"

    @ReactMethod
    fun saveLastBottle(ml: Int, milkType: String, timestamp: Double) {
        val context: Context = reactContext

        val obj = JSONObject()
        obj.put("ml", ml)
        obj.put("milkType", milkType)
        obj.put("timestamp", timestamp.toLong())

        context.getSharedPreferences(BiberonWidget.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(BiberonWidget.KEY_LAST_BOTTLE, obj.toString())
            .apply()

        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(
            ComponentName(context, BiberonWidget::class.java)
        )
        for (id in ids) {
            BiberonWidget.updateWidget(context, manager, id)
        }
    }
}
