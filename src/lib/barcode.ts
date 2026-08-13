/**
 * Barcode validation — Product Barcode Support
 *
 * Supports the three retail-standard symbologies plus an escape hatch for
 * suppliers who only have an internal SKU-style code:
 *
 *   EAN-13   — 13 digits, standard European/international retail barcode
 *   UPC-A    — 12 digits, standard North American retail barcode
 *   CODE-128 — variable-length alphanumeric, common in logistics/warehousing
 *   INTERNAL — anything else the supplier enters, printable ASCII, 3-64 chars
 *
 * EAN-13 and UPC-A get real checksum verification (catches typos a supplier
 * might make copying a number by hand). CODE-128 and INTERNAL don't have a
 * simple checksum to verify — they're accepted on shape alone.
 *
 * FUTURE READY: `detectBarcodeFormat` is the single place a barcode
 * scanner integration, warehouse picking flow, or stock-count tool would
 * call to interpret a scanned/entered code — none of those are built yet,
 * but they'd all reuse this function rather than re-implementing format
 * detection.
 */

export type BarcodeFormat = "EAN13" | "UPC_A" | "CODE128" | "INTERNAL";

export interface BarcodeValidationResult {
  valid: boolean;
  format: BarcodeFormat | null;
  error?: string;
}

function isDigitsOnly(s: string): boolean {
  return /^\d+$/.test(s);
}

/** Standard mod-10 check digit used by both EAN-13 and UPC-A. */
function checkDigitValid(digits: string): boolean {
  const nums = digits.split("").map(Number);
  const checkDigit = nums.pop()!;
  // Weights alternate 1,3 starting from the rightmost of the remaining digits.
  let sum = 0;
  for (let i = nums.length - 1; i >= 0; i--) {
    const weight = (nums.length - 1 - i) % 2 === 0 ? 3 : 1;
    sum += nums[i] * weight;
  }
  const computed = (10 - (sum % 10)) % 10;
  return computed === checkDigit;
}

function isValidEAN13(code: string): boolean {
  return code.length === 13 && isDigitsOnly(code) && checkDigitValid(code);
}

function isValidUPCA(code: string): boolean {
  return code.length === 12 && isDigitsOnly(code) && checkDigitValid(code);
}

/** CODE-128 encodes the full printable ASCII range in practice; we just require plausible length + printable characters. */
function isValidCode128Shape(code: string): boolean {
  return code.length >= 6 && code.length <= 48 && /^[\x20-\x7E]+$/.test(code) && !isDigitsOnly(code);
}

/** Internal supplier code — deliberately permissive (letters, digits, dashes, underscores). */
function isValidInternalCode(code: string): boolean {
  return code.length >= 3 && code.length <= 64 && /^[A-Za-z0-9_-]+$/.test(code);
}

/**
 * Validates a barcode string and reports which format it matched, or a
 * human-readable reason it didn't match any supported format.
 */
export function validateBarcode(raw: string): BarcodeValidationResult {
  const code = raw.trim();

  if (code.length === 0) {
    return { valid: false, format: null, error: "Barcode cannot be empty" };
  }

  if (isDigitsOnly(code)) {
    if (code.length === 13) {
      return isValidEAN13(code)
        ? { valid: true, format: "EAN13" }
        : { valid: false, format: null, error: "This looks like an EAN-13 barcode, but the check digit doesn't match — please re-check the number" };
    }
    if (code.length === 12) {
      return isValidUPCA(code)
        ? { valid: true, format: "UPC_A" }
        : { valid: false, format: null, error: "This looks like a UPC-A barcode, but the check digit doesn't match — please re-check the number" };
    }
  }

  if (isValidCode128Shape(code)) {
    return { valid: true, format: "CODE128" };
  }

  if (isValidInternalCode(code)) {
    return { valid: true, format: "INTERNAL" };
  }

  return {
    valid: false,
    format: null,
    error: "Enter a valid EAN-13 (13 digits), UPC-A (12 digits), Code-128, or an internal code (letters/numbers/dashes, 3-64 characters)",
  };
}

/** Quick boolean check when the format/error detail isn't needed. */
export function isValidBarcode(raw: string): boolean {
  return validateBarcode(raw).valid;
}
