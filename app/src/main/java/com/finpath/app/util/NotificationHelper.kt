package com.finpath.app.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.finpath.app.MainActivity
import com.finpath.app.R

/**
 * NotificationHelper — Central hub for all FinPath local notifications.
 * Handles credit alerts, goal progress, and activity updates.
 */
object NotificationHelper {

    private const val CHANNEL_ID = "finpath_alerts"
    private const val CHANNEL_NAME = "FinPath Alerts"
    private const val CHANNEL_DESC = "Financial goals, spending alerts, and account activity"

    // Unique IDs per notification type
    private const val ID_SCORE_UP    = 1001
    private const val ID_SCORE_DOWN  = 1002
    private const val ID_LOAN_OFFER  = 1003
    private const val ID_HIGH_ACTIVITY = 1004
    private const val ID_LOW_ACTIVITY  = 1005

    /**
     * Initializes the notification channel.
     */
    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_DESC
                enableVibration(true)
                enableLights(true)
            }
            context.getSystemService(NotificationManager::class.java)
                ?.createNotificationChannel(channel)
        }
    }

    private fun show(
        context: Context,
        id: Int,
        title: String,
        message: String,
        targetTab: Int = 0 
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("OPEN_TAB", targetTab)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Using standard Android icons if specific ones are missing, 
        // but targeting project resources for a professional look.
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info) 
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, context.applicationInfo.icon))
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(id, notification)
        } catch (e: SecurityException) {
            // Permission not granted on Android 13+
        }
    }

    fun notifyScoreIncrease(context: Context, delta: Int) {
        show(context, ID_SCORE_UP, "🎉 Score Improved!", "Your financial score increased by +$delta points!")
    }

    fun notifyGoalMilestone(context: Context, goalName: String) {
        show(context, 1006, "🎯 Goal Update", "You are 50% closer to your $goalName!")
    }
}
