/**
 * SMS Parser utility
 * Extracts Amount, Merchant, Type, and Date from UPI messages.
 */

function parseUPIMessage(body) {
    if (!body) return null;

    const data = {
        amount: null,
        type: null,
        merchant: "Unknown",
        date: "Unknown",
        confidence: "low"
    };

    // 1. Normalize and Extract Amount (Handles Rs., ₹, INR)
    const amountRegex = /(?:Rs\.?|₹|INR)\s?([0-9,]+\.[0-9]{2})/i;
    const amountMatch = body.match(amountRegex);
    if (amountMatch) {
        data.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // 2. Detect Transaction Type
    if (body.toLowerCase().includes("debited") || body.toLowerCase().includes("paid to")) {
        data.type = "debit";
    } else if (body.toLowerCase().includes("credited") || body.toLowerCase().includes("received from")) {
        data.type = "credit";
    }

    // 3. Extract Merchant Name (Robust Extraction)
    const merchantRegex = /(?:to|from)\s+(.*?)(?:\s+via|\son|\sRef|$)/i;
    const merchantMatch = body.match(merchantRegex);
    if (merchantMatch) {
        data.merchant = merchantMatch[1].trim();
    }

    // 4. Extract Date
    const dateRegex = /(?:on\s)(\d{2}[a-zA-Z]{3}\d{2})/i;
    const dateMatch = body.match(dateRegex);
    if (dateMatch) {
        data.date = dateMatch[1];
    } else {
        const simpleDateRegex = /(\d{2}[-/]\d{2}[-/]\d{2,4})/;
        const simpleMatch = body.match(simpleDateRegex);
        if (simpleMatch) data.date = simpleMatch[1];
    }

    // 5. Confidence Calculation
    if (data.amount !== null && data.type !== null && data.merchant !== "Unknown") {
        data.confidence = "high";
    }

    return data;
}

module.exports = { parseUPIMessage };
