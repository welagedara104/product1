"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReportDocument } from "@/lib/report/types";
import { PageAuditView } from "./PageAuditView";
import "./report.css";

export function ReportShell({ report }: { report: ReportDocument }) {
  const [activeChapter, setActiveChapter] = useState(report.chapters[0]?.id ?? "cover");
  const [fourCTheme, setFourCTheme] = useState<
    keyof typeof report.fourc.slide.themes | null
  >(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const doneCount = useMemo(() => {
    const idx = report.chapters.findIndex((c) => c.id === activeChapter);
    return Math.max(0, idx);
  }, [activeChapter, report.chapters]);

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-chapter-id]"),
    );
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target) {
          const id = visible.target.getAttribute("data-chapter-id");
          if (id) setActiveChapter(id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4] },
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [report.report_id]);

  const remaining = report.chapters.length - doneCount;
  const minsLeft = report.chapters
    .slice(doneCount)
    .reduce((sum, c) => sum + c.read_min, 0);

  return (
    <div className="report-root" data-testid="report-root">
      <div className="report-shell">
        <nav className="report-nav" aria-label="Report chapters">
          <div style={{ marginBottom: "1rem" }}>
            <div className="display" style={{ fontSize: "1.15rem" }}>
              Cranial
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              Be.Sci audit · {report.client.name}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "var(--ink-soft)" }}>
              ✓ Chapter {doneCount + 1} of {report.chapters.length} · {remaining} to
              go · about {minsLeft} min left
            </div>
          </div>
          <button
            type="button"
            data-testid="show-menu"
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Hide menu" : "Show menu"}
          </button>
          <div className={menuOpen ? "nav-links open" : "nav-links"}>
            {report.chapters.map((ch) => (
              <a
                key={ch.id}
                href={`#${ch.id}`}
                aria-current={activeChapter === ch.id}
                onClick={() => setMenuOpen(false)}
              >
                {ch.title}
                <span style={{ display: "block", fontSize: 11, opacity: 0.75 }}>
                  ≈ {ch.read_min} min
                  {ch.evidence_min ? ` · ${ch.evidence_min} min with evidence` : ""}
                </span>
              </a>
            ))}
          </div>
        </nav>

        <main className="report-main">
          <header
            className="chapter"
            id="cover"
            data-chapter-id="cover"
            data-testid="chapter-cover"
          >
            <p style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Private report · Tier {report.tier}
            </p>
            <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", margin: "0.3rem 0" }}>
              {report.client.name}
            </h1>
            <p style={{ maxWidth: "40rem", fontSize: "1.15rem", color: "var(--ink-soft)" }}>
              {report.o1}. Signed off build {report.build.sha}.
            </p>
          </header>

          <section className="chapter" id="objectives" data-chapter-id="objectives">
            <h2>Objectives</h2>
            <div className="in-short">
              O1 is direct bookings. Page jobs follow the sets below.
            </div>
            <p>
              <strong>O1:</strong> {report.o1}
            </p>
            <ul>
              {Object.entries(report.setname).map(([k, name]) => (
                <li key={k}>{name}</li>
              ))}
            </ul>
          </section>

          <section className="chapter" id="exec" data-chapter-id="exec">
            <h2>What we found, in brief</h2>
            <div className="in-short">{report.exec_summary.question}</div>
            <h3>Key findings</h3>
            <ol>
              {report.exec_summary.key_findings.map((f) => (
                <li key={f.text}>{f.text}</li>
              ))}
            </ol>
            <h3>Where the client leads</h3>
            <ul>
              {report.exec_summary.leads.map((f) => (
                <li key={f.text}>{f.text}</li>
              ))}
            </ul>
            <h3>Top four actions</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th align="left">#</th>
                    <th align="left">Action and evidence</th>
                    <th align="left">Why it fails today</th>
                    <th align="left">Impact</th>
                    <th align="left">Effort</th>
                  </tr>
                </thead>
                <tbody>
                  {report.action_plan
                    .filter((a) => report.exec_summary.top_actions.includes(a.rank))
                    .map((a) => (
                      <tr key={a.rank}>
                        <td>{a.rank}</td>
                        <td>
                          <div>{a.action}</div>
                          <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                            {a.evidence}
                          </div>
                        </td>
                        <td>{a.comb}</td>
                        <td>{a.impact}</td>
                        <td>{a.effort}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              Impact is judgement. Effort is an estimate. See the full action plan.
            </p>
          </section>

          <section className="chapter" id="fourc" data-chapter-id="fourc">
            <h2>Your customer: the four Cs</h2>
            <div className="in-short">
              {report.fourc.slide.centre} Customer view{" "}
              {report.customer_view.status.replace("_", " ")} on{" "}
              {report.customer_view.date}.
            </div>
            <div className="venn" data-testid="fourc-venn">
              {(
                Object.keys(report.fourc.slide.themes) as Array<
                  keyof typeof report.fourc.slide.themes
                >
              ).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={fourCTheme === key}
                  onClick={() => setFourCTheme(fourCTheme === key ? null : key)}
                >
                  <div style={{ fontSize: 11, letterSpacing: "0.06em" }}>
                    {key.toUpperCase()}
                  </div>
                  <strong>{report.fourc.slide.themes[key]}</strong>
                </button>
              ))}
            </div>
            {fourCTheme && (
              <ul style={{ marginTop: 12 }}>
                {report.fourc.slide.points[fourCTheme].map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <div
              style={{
                marginTop: 12,
                padding: "0.9rem 1rem",
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 10,
              }}
            >
              <strong>Centre insight.</strong> {report.fourc.slide.centre}
            </div>
            <details style={{ marginTop: 12 }}>
              <summary>See the evidence</summary>
              <ul>
                {report.fourc.validation.map((v) => (
                  <li key={v.check}>
                    <strong>{v.check}</strong> · {v.result}: {v.evidence}
                  </li>
                ))}
              </ul>
            </details>
          </section>

          {report.traffic_map && (
            <section className="chapter" id="traffic" data-chapter-id="traffic">
              <h2>Traffic map</h2>
              <div className="in-short">
                How visitors move between the pages in this fixture (GA tier 1).
              </div>
              <svg
                viewBox="0 0 640 220"
                width="100%"
                height="220"
                role="img"
                aria-label="Traffic map"
                data-testid="traffic-map"
              >
                {report.traffic_map.edges.map((e) => {
                  const from = report.traffic_map!.nodes.find((n) => n.id === e.from);
                  const to = report.traffic_map!.nodes.find((n) => n.id === e.to);
                  if (!from || !to) return null;
                  const iFrom = report.traffic_map!.nodes.indexOf(from);
                  const iTo = report.traffic_map!.nodes.indexOf(to);
                  const x1 = 100 + iFrom * 180;
                  const x2 = 100 + iTo * 180;
                  return (
                    <line
                      key={`${e.from}-${e.to}`}
                      x1={x1}
                      y1={110}
                      x2={x2}
                      y2={110}
                      stroke="#0f6b5c"
                      strokeWidth={Math.max(2, e.weight * 14)}
                      strokeOpacity={0.55}
                    />
                  );
                })}
                {report.traffic_map.nodes.map((n, i) => (
                  <g key={n.id} transform={`translate(${100 + i * 180}, 110)`}>
                    <circle r={28} fill="#fff" stroke="#12212b" strokeWidth={2} />
                    <text textAnchor="middle" y={5} fontSize={12}>
                      {n.label}
                    </text>
                    <text textAnchor="middle" y={48} fontSize={11} fill="#3a4a55">
                      {n.sessions.toLocaleString()} sessions
                    </text>
                  </g>
                ))}
              </svg>
            </section>
          )}

          <section className="chapter" id="approach" data-chapter-id="approach">
            <h2>Approach: page sets and the COM-B lens</h2>
            <div className="in-short">{report.approach.in_short}</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: 10,
              }}
            >
              {report.approach.comb_terms.map((t) => (
                <div
                  key={t.term}
                  style={{
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "0.85rem",
                  }}
                >
                  <strong>{t.term}</strong>
                  <p style={{ margin: "0.4rem 0", fontSize: 14 }}>{t.plain}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                    {t.analogy}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="chapter" id="set-a" data-chapter-id="set-a">
            <h2>{report.setname.A}</h2>
            <div className="in-short">
              Guests arrive curious. Show one evening story before competing asks.
            </div>
            {report.pages.home && (
              <PageAuditView
                reportId={report.report_id}
                slug="home"
                page={report.pages.home}
                setName={report.setname.A}
              />
            )}
          </section>

          <section className="chapter" id="set-c" data-chapter-id="set-c">
            <h2>{report.setname.C}</h2>
            <div className="in-short">
              Choosing a room should settle price, cancellation and the evening together.
            </div>
            {report.pages.sunset && (
              <PageAuditView
                reportId={report.report_id}
                slug="sunset"
                page={report.pages.sunset}
                setName={report.setname.C}
              />
            )}
          </section>

          <section className="chapter" id="mobile" data-chapter-id="mobile">
            <h2>Mobile: the headline theme</h2>
            <div className="in-short">{report.mobile_theme.in_short}</div>
            <h3>{report.mobile_theme.headline}</h3>
            <ul>
              {report.mobile_theme.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>

          <section className="chapter" id="gaps" data-chapter-id="gaps">
            <h2>Data gaps and judgement calls</h2>
            <ul>
              {report.data_gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </section>

          <section className="chapter" id="sources" data-chapter-id="sources">
            <h2>Sources and method</h2>
            <ul>
              {report.sources_method.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="chapter" id="actions" data-chapter-id="actions">
            <h2>Action plan</h2>
            <div className="in-short">
              Ranked by impact on O1. No revenue figures unless the client supplies ABV
              and accepts a stated model.
            </div>
            <ol>
              {report.action_plan.map((a) => (
                <li key={a.rank} style={{ marginBottom: 10 }}>
                  <strong>{a.action}</strong>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                    {a.evidence} · {a.source} · {a.comb} · Impact {a.impact} · Effort{" "}
                    {a.effort}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </main>
      </div>
    </div>
  );
}
