import Link from "next/link";
import { StartAuditButton } from "./StartAuditButton";



export const instant = false;
export default function IntakeIndexPage() {
  return (
    <main style={shell}>
      <p style={eyebrow}>Cranial · Client intake</p>
      <h1 style={h1}>Start a website audit</h1>
      <p style={lede}>
        Answer a short questionnaire (about 10 minutes), connect GA4 if you can, then we
        capture your site and prepare a draft for expert review. Nothing reaches you as a
        client until an expert signs off.
      </p>
      <StartAuditButton />
      <p style={{ marginTop: "2rem", fontSize: 14 }}>
        <Link href="/">Back home</Link>
        {" · "}
        <Link href="/expert">Expert workspace</Link>
      </p>
    </main>
  );
}

const shell = {
  minHeight: "100vh",
  padding: "clamp(1.5rem, 4vw, 3rem)",
  background:
    "radial-gradient(900px 500px at 100% 0%, #dceee8, transparent 55%), #f7f4ef",
  color: "#12212b",
  fontFamily: "var(--font-report-sans), system-ui, sans-serif",
} as const;
const eyebrow = {
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontSize: 12,
  margin: 0,
};
const h1 = {
  fontFamily: "var(--font-report-display), Georgia, serif",
  fontSize: "clamp(2rem, 4vw, 3rem)",
  margin: "0.4rem 0 0.75rem",
  maxWidth: "16ch",
};
const lede = {
  maxWidth: "38rem",
  color: "#3a4a55",
  fontSize: "1.05rem",
};
