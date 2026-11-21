import Link from "next/link";

/** Public demo booking site used for Phase 1 capture (stop before payment). */
export default function DemoHome() {
  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "Georgia, serif",
        background: "linear-gradient(180deg,#0b3a4a 0%,#14586a 40%,#f4efe6 40%)",
        color: "#12212b",
      }}
    >
      <header style={{ padding: "1.5rem 2rem", color: "#f4efe6" }}>
        <strong style={{ letterSpacing: "0.06em" }}>CORAL REACH RESORT</strong>
      </header>
      <section style={{ padding: "3rem 2rem 4rem", color: "#f4efe6", maxWidth: 720 }}>
        <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", margin: 0, lineHeight: 1.05 }}>
          Evenings on a quiet lagoon
        </h1>
        <p style={{ fontSize: "1.2rem", maxWidth: "36ch", opacity: 0.92 }}>
          A small resort for couples who want the stay to feel settled before they pay.
        </p>
        <Link
          href="/demo-site/book"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            background: "#f4efe6",
            color: "#0b3a4a",
            padding: "0.85rem 1.4rem",
            textDecoration: "none",
            fontFamily: "system-ui,sans-serif",
            fontWeight: 600,
          }}
        >
          Check dates
        </Link>
      </section>
      <section style={{ padding: "2rem", background: "#f4efe6" }}>
        <h2>Why guests choose us</h2>
        <ul>
          <li>Private lagoon rooms with a clear evening story</li>
          <li>Breakfast and cancelation shown before payment</li>
          <li>Direct booking perks that stay visible next to the rate</li>
        </ul>
      </section>
    </main>
  );
}
