package com.example.myphone

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * NotificationHelper — Central hub for all BizCredit local notifications.
 * Mimics Swiggy/Zomato style: short, emoji-driven, action-aware.
 */
object NotificationHelper {

    private const val CHANNEL_ID = "bizcredit_alerts"
    private const val CHANNEL_NAME = "BizCredit Alerts"
    private const val CHANNEL_DESC = "Credit score changes, loan offers, and activity alerts"

    // Unique IDs per notification type so they don't stack or overwrite wrong ones
    private const val ID_SCORE_UP    = 1001
    private const val ID_SCORE_DOWN  = 1002
    private const val ID_LOAN_OFFER  = 1003
    private const val ID_HIGH_ACTIVITY = 1004
    private const val ID_LOW_ACTIVITY  = 1005

    /**
     * Must be called once on app start (in MainActivity.onCreate).
     * Safe to call multiple times — Android no-ops if channel already exists.
     */
    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH   // Heads-up style, like Swiggy
            ).apply {
                description = CHANNEL_DESC
                enableVibration(true)
                enableLights(true)
            }
            context.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    // ──────────────────────────────────────────────
    // Core show function — used by all triggers below
    // ──────────────────────────────────────────────
    private fun show(
        context: Context,
        id: Int,
        title: String,
        message: String,
        targetTab: Int = 0  // 0 = Overview, 2 = Loans
    ) {
        // Tapping the notification opens the app at the right tab
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("OPEN_TAB", targetTab)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher))
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(id, notification)
    }

    // ──────────────────────────────────────────────
    // Public trigger functions — called from ViewModel
    // ──────────────────────────────────────────────

    fun notifyScoreIncrease(context: Context, delta: Int) {
        show(
            context, ID_SCORE_UP,
            title   = "🎉 Score Improved!",
            message = "Your credit score increased by +$delta points. Great work!",
            targetTab = 0
        )
    }

    fun notifyScoreDecrease(context: Context, delta: Int) {
        show(
            context, ID_SCORE_DOWN,
            title   = "⚠️ Score Dropped",
            message = "Your score dropped by $delta points. Check your insights.",
            targetTab = 0
        )
    }

    fun notifyLoanOffers(context: Context, count: Int) {
        show(
            context, ID_LOAN_OFFER,
            title   = "💰 Loan Offers Available",
            message = "You qualify for $count loan product${if (count > 1) "s" else ""}. Tap to explore!",
            targetTab = 2   // Deep-links to Loans tab
        )
    }

    fun notifyHighActivity(context: Context, txCount: Int) {
        show(
            context, ID_HIGH_ACTIVITY,
            title   = "🔥 Strong Activity!",
            message = "$txCount transactions recorded. Your activity score is maxed out!",
            targetTab = 0
        )
    }

    fun notifyLowActivity(context: Context, txCount: Int) {
        show(
            context, ID_LOW_ACTIVITY,
            title   = "📉 Low Activity Detected",
            message = "Only $txCount transactions found. More UPI activity boosts your score.",
            targetTab = 1   // Analytics tab
        )
    }
}
