/**
 * STRICT SMS PARSER ENGINE (v3.0 - Definitive)
 * Prevents junk leakage and ensures 100% data trust.
 */

const bankKeywords = ["BOI", "HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "PNB", "CANARA", "PAYTM", "FEDERAL", "UNION"];

/**
 * Stage 1: Sender Filter (Bank Headers Only)
 * MUST follow the 2-letter prefix + hyphen standard (e.g. JD-HDFCBK)
 */
function isValidBankSender(sender) {
    if (!sender) return false;
    const senderUpper = sender.toUpperCase();
    
    // Check for bank keywords
    const hasBankKeyword = bankKeywords.some(bank => senderUpper.includes(bank));
    
    // STRICT PATTERN: Exactly 2 letters + HYPHEN + Alphanumeric
    // This blocks "P&G", "AD-STREET", "FLIPKT", etc.
    const matchesPattern = /^[A-Z]{2}-[A-Z0-9]{4,}/.test(senderUpper);
    
    return hasBankKeyword && matchesPattern;
}

/**
 * Stage 2: UPI Transaction Filter
 */
function isValidUPIMessage(body) {
    if (!body) return false;
    const bodyUpper = body.toUpperCase();
    const bodyLower = body.toLowerCase();
    
    const hasUPITerm = bodyUpper.includes("UPI");
    const hasAction = /debited|credited|paid|received/.test(bodyLower);
        
    return hasUPITerm && hasAction;
}

/**
 * Stage 3: Strict Amount Extraction (> 0)
 */
function extractAmount(body) {
    // Regex for: Rs.500, ₹500, INR 500, Rs 500
    const amountRegex = /(?:Rs\.?|₹|INR)\s?([\d,]+(?:\.\d+)?)/i;
    const match = body.match(amountRegex);
    
    if (!match) return null;
    
    const rawValue = match[1].replace(/,/g, "");
    const amount = parseFloat(rawValue);
    
    if (isNaN(amount) || amount <= 0) return null;
    
    return amount;
}

/**
 * Stage 4: Mandatory Reference Number Extraction
 */
function extractRefNo(body) {
    // Look for commonly used UPI/Bank transaction identifiers
    // Supports Ref No, UPI Ref, RRN, vide No, and lone long digit strings
    const refRegex = /(?:Ref(?:erence)?\s?No\.?|UPI Ref|RRN|No\.?|vide No\.?|ID)\s*[:.\s-]*\s*([a-z0-9]{8,})/i;
    const match = body.match(refRegex);
    
    if (!match) {
        // Fallback: Just look for any 12-digit number (common UPI Ref length)
        const loneRefMatch = body.match(/\b\d{10,14}\b/);
        return loneRefMatch ? loneRefMatch[0] : null;
    }
    
    return match[1].trim();
}

/**
 * FINAL VALIDATION PIPELINE
 */
function parseStrictTransaction(sms) {
    const { body, sender, date } = sms;

    if (!isValidBankSender(sender)) return null;
    if (!isValidUPIMessage(body)) return null;

    const amount = extractAmount(body);
    if (amount === null) return null;

    const refNo = extractRefNo(body);
    if (refNo === null) return null;

    const bodyLower = body.toLowerCase();
    const type = (bodyLower.includes("debited") || bodyLower.includes("paid")) ? "debit" : "credit";

    // Support Merchant Extraction
    const merchantRegex = /(?:to|from|at)\s+(.*?)(?:\s+via|\son|\sRef|\sis|$|\.)/i;
    const merchantMatch = body.match(merchantRegex);
    const merchant = merchantMatch ? merchantMatch[1].trim() : "Unknown";

    return {
        amount,
        type,
        merchant: merchant.substring(0, 50), // Cap length
        reference_number: refNo,
        date: date || new Date().toISOString()
    };
}

module.exports = { parseStrictTransaction };
