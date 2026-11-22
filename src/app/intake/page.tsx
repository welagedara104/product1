import Link from "next/link";
import { StartAuditButton } from "./StartAuditButton";

export const instant = false;

export default function IntakeLandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(1.5rem, 4vw, 3rem)",
        background:
          "radial-gradient(900px 500px at 100% 0%, #dceee8, transparent 55%), #f7f4ef",
        color: "#12212b",
        fontFamily: "var(--font-report-sans), system-ui, sans-serif",
      }}
    >
      <p style={eyebrow}>Cranial · Client intake</p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(2rem, 4vw, 3rem)",
          margin: "0.4rem 0 0.75rem",
          maxWidth: "16ch",
        }}
      >
        Start a website audit
      </h1>
      <p style={{ maxWidth: "38rem", color: "#3a4a55", fontSize: "1.05rem" }}>
        A Cranial teammate answers a short questionnaire on the client&apos;s
        behalf, connects analytics if available, then we capture the site and
        prepare a draft for expert review.
      </p>
      <StartAuditButton />
      <p style={{ marginTop: "2rem", fontSize: 14 }}>
        <Link href="/">Back home</Link> · <Link href="/expert">Expert workspace</Link>
      </p>
    </main>
  );
}

const eyebrow = {
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontSize: 12,
  margin: 0,
};
