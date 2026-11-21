import Link from "next/link";

/** Checkout before payment — capture stops here. */
export default function DemoBook() {
  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui,sans-serif",
        background: "#f4efe6",
        color: "#12212b",
        padding: "2rem",
      }}
    >
      <p style={{ letterSpacing: "0.06em", fontSize: 12, textTransform: "uppercase" }}>
        Coral Reach · Booking
      </p>
      <h1 style={{ fontFamily: "Georgia, serif" }}>Your stay summary</h1>
      <div
        style={{
          maxWidth: 480,
          background: "#fff",
          border: "1px solid #d5cbb8",
          padding: "1.25rem",
          marginTop: "1rem",
        }}
      >
        <p>
          <strong>Lagoon room</strong> · 3 nights · 2 adults
        </p>
        <p>Room rate: £1,240</p>
        <p>Taxes &amp; fees: £186</p>
        <p>
          <strong>Total: £1,426</strong>
        </p>
        <p style={{ fontSize: 14, color: "#3a4a55" }}>
          Free cancelation until 7 days before arrival.
        </p>
        <label style={{ display: "block", marginTop: "1rem" }}>
          Guest name
          <input
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
            placeholder="Alex Guest"
            readOnly
          />
        </label>
        <label style={{ display: "block", marginTop: "0.75rem" }}>
          Email
          <input
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
            placeholder="alex@example.com"
            readOnly
          />
        </label>
        <div style={{ display: "flex", gap: 12, marginTop: "1.25rem" }}>
          <Link
            href="/demo-site"
            style={{ padding: "0.7rem 1rem", color: "#0b3a4a" }}
          >
            Back
          </Link>
          <Link
            href="/demo-site/book/payment"
            style={{
              padding: "0.7rem 1.2rem",
              background: "#0b3a4a",
              color: "#f4efe6",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Continue
          </Link>
        </div>
        <p style={{ fontSize: 12, color: "#6a5a48", marginTop: "1rem" }}>
          Capture workers stop before the payment screen. Do not submit a real card.
        </p>
      </div>
    </main>
  );
}
