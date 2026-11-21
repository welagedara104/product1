import { Suspense } from "react";
import { ReportLoginForm } from "./ReportLoginForm";

export const instant = false;

export default function ReportLoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          Loading…
        </main>
      }
    >
      <ReportLoginForm />
    </Suspense>
  );
}
