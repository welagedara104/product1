/** Shared payment / checkout abort rules for capture. Never complete a real payment. */

const PAYMENT_PATH_RE =
  /\/(pay|payment|payments|checkout\/pay|billing\/pay|stripe|braintree)(\/|$|\?)/i;

const PAYMENT_HOST_RE =
  /(^|\.)(stripe\.com|checkout\.stripe\.com|paypal\.com|braintreegateway\.com)$/i;

export function isPaymentUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (PAYMENT_HOST_RE.test(u.hostname)) return true;
    if (PAYMENT_PATH_RE.test(u.pathname)) return true;
    const q = u.search.toLowerCase();
    if (q.includes("payment_intent") || q.includes("client_secret")) return true;
    return false;
  } catch {
    const lower = raw.toLowerCase();
    return (
      lower.includes("/payment") ||
      lower.includes("stripe.com") ||
      lower.includes("paypal.com")
    );
  }
}

export function shouldAbortCaptureRequest(url: string, method: string): boolean {
  const lower = url.toLowerCase();
  if (isPaymentUrl(url)) return true;
  if (method === "POST" && (lower.includes("payment") || lower.includes("checkout"))) {
    return true;
  }
  return false;
}
