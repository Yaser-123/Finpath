package com.finpath.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.SmsParseRequest
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsReceiver : BroadcastReceiver() {

    private val KNOWN_SENDERS = listOf(
        "HDFC", "HDFCBK", "SBIINB", "SBI", "ICICI", "ICICIB", "AXISBK", "AXIS",
        "KOTAKB", "KOTAK", "PAYTM", "GPAY", "PHONEPE", "YESBNK", "IDBIBK",
        "PNBSMS", "BOBIBD", "CANBNK", "UNIONB", "CENTBK", "INDBNK", "FEDBNK",
        "RBLBNK", "AUBANK", "UJJIVN", "BANDHN", "BOIIND", "AXISBK"
    )

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            for (sms in messages) {
                val sender = sms.displayOriginatingAddress ?: continue
                val body = sms.displayMessageBody ?: continue

                if (isTrustedSender(sender)) {
                    // Send to backend for parsing
                    processSms(sender, body)
                }
            }
        }
    }

    private fun isTrustedSender(sender: String): Boolean {
        val upper = sender.uppercase().replace(Regex("[^A-Z0-9]"), "")
        return KNOWN_SENDERS.any { upper.contains(it) }
    }

    private fun processSms(sender: String, body: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session != null) {
                    val req = SmsParseRequest(smsText = body, sender = sender)
                    val result = ApiClient.api.parseSms("Bearer ${session.accessToken}", req)
                    
                    if (result.skipped != true && result.transactionId != null) {
                        Log.d("FinPath", "Successfully parsed SMS transaction: ${result.amount}")
                        // Optionally trigger a local notification here
                    }
                }
            } catch (e: Exception) {
                Log.e("FinPath", "Failed to parse SMS via backend", e)
            }
        }
    }
}
