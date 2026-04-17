package com.finpath.app.util

object SmsHeuristics {
    private val knownSenders = listOf(
        "HDFC", "HDFCBK", "SBIINB", "SBI", "ICICI", "ICICIB", "AXISBK", "AXIS",
        "KOTAKB", "KOTAK", "PAYTM", "GPAY", "PHONEPE", "YESBNK", "IDBIBK",
        "PNBSMS", "BOBIBD", "CANBNK", "UNIONB", "CENTBK", "INDBNK", "FEDBNK",
        "RBLBNK", "AUBANK", "UJJIVN", "BANDHN", "BOIIND", "IDFCFB", "INDUSB"
    )

    private val financialHints = listOf(
        "upi", "utr", "imps", "neft", "rtgs", "a/c", "account", "debited", "credited",
        "spent", "received", "withdrawn", "deposited", "txn", "transaction", "payment",
        "inr", "rs", "balance", "avl bal", "available bal", "credited to", "debited from"
    )

    fun isTrustedSender(sender: String): Boolean {
        val normalizedSender = sender.uppercase().replace(Regex("[^A-Z0-9]"), "")
        return knownSenders.any { normalizedSender.contains(it) }
    }

    fun hasFinancialHint(body: String): Boolean {
        val lowerBody = body.lowercase()
        return financialHints.any { lowerBody.contains(it) }
    }

    fun shouldParse(sender: String, body: String): Boolean {
        return isTrustedSender(sender) || hasFinancialHint(body)
    }
}
