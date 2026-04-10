/**
 * STRICT SMS PARSER ENGINE (Production Level)
 * Filters and validates UPI bank transactions only.
 */

const bankKeywords = ["BOI", "HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "PNB", "CANARA", "PAYTM"];

/**
 * Stage 1: Primary Sender Filter
 */
function isValidBankSender(sender) {
    if (!sender) return false;
    
    const senderUpper = sender.toUpperCase();
    
    // Check for bank keywords
    const hasBankKeyword = bankKeywords.some(bank => senderUpper.includes(bank));
    
    // Pattern check: 2 letters prefix + hyphen + Alphanumeric (e.g. JD-BOIIND-S)
    const matchesPattern = /^[A-Z]{2}-[A-Z0-9]+/.test(senderUpper);
    
    return hasBankKeyword && matchesPattern;
}

/**
 * Stage 2: UPI Message Filter
 */
function isValidUPIMessage(body) {
    if (!body) return false;
    
    const bodyLower = body.toLowerCase();
    const hasUPITerm = body.includes("UPI");
    const hasTransactionAction = 
        bodyLower.includes("debited") || 
        bodyLower.includes("credited") || 
        bodyLower.includes("paid") || 
        bodyLower.includes("received");
        
    return hasUPITerm && hasTransactionAction;
}

/**
 * Stage 3: Strict Amount Extraction
 */
function extractAmount(body) {
    const amountRegex = /(Rs\.?|₹|INR)\s?([\d,]+(?:\.\d+)?)/i;
    const match = body.match(amountRegex);
    
    if (!match) return null;
    
    const rawValue = match[2].replace(/,/g, "");
    const amount = parseFloat(rawValue);
    
    if (isNaN(amount) || amount <= 0) return null;
    
    return amount;
}

/**
 * Stage 4: Mandatory Reference Number
 */
function extractRefNo(body) {
    // Regex provided by user: /Ref(?:erence)?\s?No.?\s?(\d+)/i
    const refRegex = /Ref(?:erence)?\s?No.?\s?(\d+)/i;
    const match = body.match(refRegex);
    
    if (!match) return null; // MANDATORY - discard if missing
    
    return match[1].trim();
}

/**
 * FINAL VALIDATION PIPELINE
 */
function parseStrictTransaction(sms) {
    const { body, sender, date } = sms;

    // 1. Check Sender
    if (!isValidBankSender(sender)) return null;

    // 2. Check UPI Keywords
    if (!isValidUPIMessage(body)) return null;

    // 3. Extract Amount
    const amount = extractAmount(body);
    if (amount === null) return null;

    // 4. Extract Reference Number (MANDATORY)
    const refNo = extractRefNo(body);
    if (refNo === null) return null;

    // 5. Success - Build final transaction object
    const bodyLower = body.toLowerCase();
    const type = (bodyLower.includes("debited") || bodyLower.includes("paid")) ? "debit" : "credit";

    // Support Merchant Extraction (Better for UI)
    const merchantRegex = /(?:to|from|at)\s+(.*?)(?:\s+via|\son|\sRef|\sis|$)/i;
    const merchantMatch = body.match(merchantRegex);
    const merchant = merchantMatch ? merchantMatch[1].trim() : "Unknown";

    return {
        amount,
        type,
        merchant,
        reference_number: refNo,
        date: date || new Date().toISOString()
    };
}

module.exports = { parseStrictTransaction };
