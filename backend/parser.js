const crypto = require('crypto');

/**
 * STRICT SMS PARSER ENGINE (v4.0 - Clean Slate)
 * Only accepts JD-BOIIND headers. Enforces Zero-Null Policy.
 */

// Only JD-BOIIND is allowed as per user request
const ALLOWED_SENDER_PREFIX = "JD-BOIIND";

/**
 * Stage 1: Absolute Sender Filter
 */
function isValidBankSender(sender) {
    if (!sender) return false;
    // Must START with JD-BOIIND (handles JD-BOIIND, JD-BOIIND-S, etc.)
    return sender.toUpperCase().startsWith(ALLOWED_SENDER_PREFIX);
}

/**
 * Stage 2: Transaction Intent Filter
 */
function isValidUPIMessage(body) {
    if (!body) return false;
    const bodyUpper = body.toUpperCase();
    const bodyLower = body.toLowerCase();
    
    // Check for financial keywords
    const hasUPITerm = bodyUpper.includes("UPI");
    const hasAction = /debited|credited|paid|received/.test(bodyLower);
        
    return hasUPITerm && hasAction;
}

/**
 * Stage 3: Strict Amount Extraction
 */
function extractAmount(body) {
    const amountRegex = /(?:Rs\.?|₹|INR)\s?([\d,]+(?:\.\d+)?)/i;
    const match = body.match(amountRegex);
    
    if (!match) return null;
    
    const rawValue = match[1].replace(/,/g, "");
    const amount = parseFloat(rawValue);
    
    // STRICT: Reject if 0 or invalid
    if (isNaN(amount) || amount <= 0) return null;
    
    return amount;
}

/**
 * Stage 4: High-Trust Reference Extraction
 */
function extractRefNo(body) {
    // 1. Look for explicit labels (Ref, RRN, vide No)
    const refRegex = /(?:Ref(?:erence)?\s?No\.?|UPI Ref|RRN|vide No\.?|ID)\s*[:.\s-]*\s*([a-z0-9]{8,})/i;
    const match = body.match(refRegex);
    
    if (match) return match[1].trim();
    
    // 2. Look for lone 12-digit UPI IDs
    const loneRefMatch = body.match(/\b\d{12}\b/);
    if (loneRefMatch) return loneRefMatch[0];
    
    // 3. ZERO-NULL POLICY FALLBACK
    // If no human-readable Ref No exists, generate a deterministic hash of the unique message
    // This ensures reference_number is NEVER NULL in Supabase
    return crypto.createHash('md5').update(body).digest('hex').substring(0, 16);
}

/**
 * FINAL VALIDATION PIPELINE
 */
function parseStrictTransaction(sms) {
    const { body, sender, date } = sms;

    // 1. HARD-FILTER: ONLY BOI ALLOWED
    if (!isValidBankSender(sender)) return null;

    // 2. Check Intent
    if (!isValidUPIMessage(body)) return null;

    // 3. Check Amount
    const amount = extractAmount(body);
    if (amount === null) return null;

    // 4. Extract or Generate Reference (ZERO NULL POLICY)
    const refNo = extractRefNo(body);

    const bodyLower = body.toLowerCase();
    const type = (bodyLower.includes("debited") || bodyLower.includes("paid")) ? "debit" : "credit";

    // Support Merchant Extraction
    const merchantRegex = /(?:to|from|at)\s+(.*?)(?:\s+via|\son|\sRef|\sis|#|$|\.)/i;
    const merchantMatch = body.match(merchantRegex);
    const merchant = merchantMatch ? merchantMatch[1].trim() : "BOI Merchant";

    return {
        amount,
        type,
        merchant: merchant.substring(0, 50),
        reference_number: refNo, // Guaranteed Non-Null
        date: date || new Date().toISOString()
    };
}

module.exports = { parseStrictTransaction };
