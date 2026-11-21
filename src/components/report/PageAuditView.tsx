"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Device, Finding, PageData, Section } from "@/lib/report/types";
import { parseWeakLine } from "@/lib/report/parse-copy";
import { FindingCard } from "./FindingCard";

type Toggle = "heat" | "friction" | "motivation";

function storageKey(reportId: string, slug: string, device: Device) {
  return `cranial.viewed.v1:${reportId}:${slug}:${device}`;
}

function CombSquares({ value }: { value: number }) {
  return (
    <div className="comb-squares" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={i < value ? "on" : undefined} />
      ))}
    </div>
  );
}

export function PageAuditView({
  reportId,
  slug,
  page,
  setName,
}: {
  reportId: string;
  slug: string;
  page: PageData;
  setName: string;
}) {
  const [device, setDevice] = useState<Device>("d");
  const [toggles, setToggles] = useState<Record<Toggle, boolean>>({
    heat: false,
    friction: true,
    motivation: true,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewed, setViewed] = useState<string[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryShownOnce, setSummaryShownOnce] = useState(false);
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);

  const meta = device === "d" ? page.d : page.m;
  const totalH = meta.segh.reduce((a, b) => a + b, 0);

  const findings = useMemo(
    () => page.pts.filter((p) => p.dev === device),
    [page.pts, device],
  );

  const sections = useMemo(
    () => page.secs.filter((s) => s.dev === device),
    [page.secs, device],
  );

  const visibleFindings = useMemo(() => {
    return findings.filter((f) => {
      if (f.cat === "M") return toggles.motivation;
      return toggles.friction;
    });
  }, [findings, toggles]);

  const markerFindings = visibleFindings.filter((f) => f.b !== 1);
  const wholePageFindings = visibleFindings.filter((f) => f.b === 1);
  const active = findings.find((f) => f.id === activeId) ?? null;
  const activeSection =
    sections.find((s) => s.id === sectionId) ??
    sections.find((s) => s.id === active?.sec) ??
    null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(reportId, slug, device));
      setViewed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setViewed([]);
    }
    setActiveId(null);
    setSectionId(null);
    setPulseIds(findings.map((f) => f.id));
    const t = window.setTimeout(() => setPulseIds([]), 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, slug, device]);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey(reportId, slug, device),
        JSON.stringify(viewed),
      );
    } catch {
      /* ignore */
    }
  }, [viewed, reportId, slug, device]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (summaryOpen) setSummaryOpen(false);
        else if (activeId) markViewedAndClose(activeId);
        else if (sectionId) setSectionId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function markViewedAndClose(id: string) {
    setViewed((v) => (v.includes(id) ? v : [...v, id]));
    setActiveId(null);
  }

  function openFinding(f: Finding) {
    if (activeId && activeId !== f.id) {
      setViewed((v) => (v.includes(activeId) ? v : [...v, activeId]));
    }
    setActiveId(f.id);
    setSectionId(null);
  }

  function onStripScroll() {
    const el = stripRef.current;
    if (!el || summaryShownOnce) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setSummaryOpen(true);
      setSummaryShownOnce(true);
    }
  }

  const heatAvailable = meta.heat;
  const avg = device === "d" ? page.cavg.d : page.cavg.m;
  const weak = device === "d" ? page.weak.d : page.weak.m;
  const cs = device === "d" ? page.cs?.d : page.cs?.m;
  const footnotes = device === "d" ? page.fn?.d : page.fn?.m;

  return (
    <section
      className="page-audit"
      data-testid={`page-audit-${slug}`}
      data-device={device}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            {setName} · {page.name}
          </div>
          <h3 style={{ margin: "0.15rem 0 0", fontSize: "1.35rem" }}>
            Page audit
          </h3>
        </div>
        <div className="toggle-row" role="group" aria-label="Device">
          <button
            type="button"
            aria-pressed={device === "d"}
            data-testid="device-desktop"
            onClick={() => setDevice("d")}
          >
            Desktop
          </button>
          <button
            type="button"
            aria-pressed={device === "m"}
            data-testid="device-mobile"
            onClick={() => setDevice("m")}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className="toggle-row" style={{ marginBottom: "0.9rem" }}>
        <button
          type="button"
          aria-pressed={toggles.heat}
          disabled={!heatAvailable}
          title={heatAvailable ? undefined : "Not available for this page"}
          data-testid="toggle-heat"
          onClick={() =>
            heatAvailable && setToggles((t) => ({ ...t, heat: !t.heat }))
          }
        >
          Attention map
        </button>
        <button
          type="button"
          aria-pressed={toggles.friction}
          data-testid="toggle-friction"
          onClick={() => setToggles((t) => ({ ...t, friction: !t.friction }))}
        >
          Friction to act
        </button>
        <button
          type="button"
          aria-pressed={toggles.motivation}
          data-testid="toggle-motivation"
          onClick={() =>
            setToggles((t) => ({ ...t, motivation: !t.motivation }))
          }
        >
          Lack of motivation
        </button>
        <button
          type="button"
          data-testid="open-page-summary"
          onClick={() => setSummaryOpen(true)}
        >
          Page summary
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            device === "m" ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(260px,0.8fr)",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div style={{ position: "relative" }}>
          {wholePageFindings.length > 0 && (
            <button
              type="button"
              data-testid="whole-page-button"
              onClick={() => openFinding(wholePageFindings[0]!)}
              style={{
                marginBottom: 8,
                border: "1px solid var(--friction)",
                background: "var(--friction-soft)",
                borderRadius: 999,
                padding: "0.35rem 0.75rem",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {wholePageFindings.length} finding
              {wholePageFindings.length === 1 ? "" : "s"} apply to the whole page
            </button>
          )}

          <div
            ref={stripRef}
            className={`device-frame ${device === "d" ? "desktop" : "phone"} ${
              active?.b === 1 ? "whole-page-outline" : ""
            }`}
            data-testid="mockup-strip"
            onScroll={onStripScroll}
          >
            <div style={{ position: "relative", minHeight: totalH * 0.35 }}>
              {meta.segh.map((h, i) => (
                <div
                  key={`${slug}-${device}-seg-${i}`}
                  className="mock-strip"
                  style={{
                    minHeight: Math.max(160, h * 0.35),
                    backgroundImage: toggles.heat
                      ? `radial-gradient(circle at ${30 + i * 20}% ${40 + i * 10}%, rgba(244,63,94,0.45), transparent 42%), linear-gradient(160deg, rgba(15,107,92,0.55), rgba(11,21,32,0.85))`
                      : undefined,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>
                    {meta.segments?.[i] ?? `Segment ${i + 1}`}
                  </div>
                </div>
              ))}

              {sections.map((sec, idx) => (
                <SectionChrome
                  key={sec.id}
                  section={sec}
                  index={idx}
                  total={sections.length}
                  totalH={totalH * 0.35}
                  active={activeSection?.id === sec.id}
                  onOpen={() => {
                    setSectionId(sec.id);
                    setActiveId(null);
                  }}
                />
              ))}

              {markerFindings.map((f, idx) => (
                <button
                  key={f.id}
                  type="button"
                  className={`marker ${
                    f.cat === "M" ? "motivation" : "friction"
                  } ${viewed.includes(f.id) ? "viewed" : ""} ${
                    pulseIds.includes(f.id) ? "pulse" : ""
                  } ${activeId === f.id ? "active" : ""}`}
                  style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
                  data-testid={`marker-${f.id}`}
                  aria-label={`Finding ${idx + 1}`}
                  onClick={() => openFinding(f)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <strong>
              {viewed.filter((id) => findings.some((f) => f.id === id)).length} of{" "}
              {findings.length} viewed
            </strong>
            <button
              type="button"
              data-testid="reset-viewed"
              onClick={() => setViewed([])}
              style={{
                border: 0,
                background: "transparent",
                color: "var(--accent)",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>

          {device === "m" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <FindingList
                title="Friction"
                items={visibleFindings.filter((f) => f.cat !== "M" && f.b !== 1)}
                activeId={activeId}
                viewed={viewed}
                onOpen={openFinding}
              />
              <div style={{ display: "grid", gap: 8 }}>
                <FindingList
                  title="Applies to the whole page"
                  items={wholePageFindings}
                  activeId={activeId}
                  viewed={viewed}
                  onOpen={openFinding}
                />
                <FindingList
                  title="Motivation"
                  items={visibleFindings.filter((f) => f.cat === "M")}
                  activeId={activeId}
                  viewed={viewed}
                  onOpen={openFinding}
                />
              </div>
            </div>
          ) : (
            <FindingList
              title="Findings"
              items={visibleFindings}
              activeId={activeId}
              viewed={viewed}
              onOpen={openFinding}
              groupWholePage
            />
          )}

          {active && (
            <div style={{ marginTop: 12 }}>
              <FindingCard
                finding={active}
                onClose={() => markViewedAndClose(active.id)}
                onOpenSection={(id) => {
                  setSectionId(id);
                  markViewedAndClose(active.id);
                }}
              />
            </div>
          )}

          {activeSection && !active && (
            <SectionReviewCard
              section={activeSection}
              onClose={() => setSectionId(null)}
            />
          )}
        </div>
      </div>

      {footnotes && footnotes.length > 0 && (
        <ol style={{ marginTop: "1rem", fontSize: 12, color: "var(--ink-soft)" }}>
          {footnotes.map(([n, text]) => (
            <li key={n} id={`fn-${slug}-${device}-${n}`}>
              {text}
            </li>
          ))}
        </ol>
      )}

      {summaryOpen && (
        <div className="page-summary" data-testid="page-summary">
          <div className="page-summary-panel" role="dialog" aria-modal="true">
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              End of page · {setName} · {device === "d" ? "desktop" : "mobile"}
            </div>
            <h3 style={{ marginTop: 4 }}>Most crucial improvements</h3>
            <ul>
              {weak.map((line) => {
                const parsed = parseWeakLine(line);
                return (
                  <li key={line}>
                    {parsed.main}
                    {parsed.sub ? (
                      <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                        {parsed.sub}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p>
              Average Cranial audit rating{" "}
              <strong>
                {avg.t.toFixed(1)}/12
              </strong>{" "}
              · C {avg.C.toFixed(1)} · O {avg.O.toFixed(1)} · M {avg.M.toFixed(1)}
            </p>
            {cs && (
              <p data-testid="summary-radar">
                Creative Score as of now: {cs.score} ({cs.label})
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setSummaryOpen(false)}>
                Back to this page
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FindingList({
  title,
  items,
  activeId,
  viewed,
  onOpen,
  groupWholePage,
}: {
  title: string;
  items: Finding[];
  activeId: string | null;
  viewed: string[];
  onOpen: (f: Finding) => void;
  groupWholePage?: boolean;
}) {
  const whole = groupWholePage ? items.filter((f) => f.b === 1) : [];
  const rest = groupWholePage ? items.filter((f) => f.b !== 1) : items;
  return (
    <div className="finding-list" data-testid={`finding-list-${title}`}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
      {whole.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Applies to the whole page
          </div>
          {whole.map((f) => (
            <ListItem
              key={f.id}
              finding={f}
              active={activeId === f.id}
              viewed={viewed.includes(f.id)}
              onOpen={onOpen}
            />
          ))}
        </>
      )}
      {rest.map((f) => (
        <ListItem
          key={f.id}
          finding={f}
          active={activeId === f.id}
          viewed={viewed.includes(f.id)}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function ListItem({
  finding,
  active,
  viewed,
  onOpen,
}: {
  finding: Finding;
  active: boolean;
  viewed: boolean;
  onOpen: (f: Finding) => void;
}) {
  const thesis = finding.f.split("\n")[0] ?? finding.id;
  return (
    <button
      type="button"
      className={`${active ? "active" : ""} ${viewed ? "viewed" : ""}`}
      data-testid={`list-${finding.id}`}
      onClick={() => onOpen(finding)}
    >
      {thesis}
    </button>
  );
}

function SectionChrome({
  section,
  index,
  total,
  totalH,
  active,
  onOpen,
}: {
  section: Section;
  index: number;
  total: number;
  totalH: number;
  active: boolean;
  onOpen: () => void;
}) {
  const top = section.y0 * totalH;
  const height = Math.max(24, (section.y1 - section.y0) * totalH);
  return (
    <>
      <div
        className="section-rail"
        style={{
          top,
          height,
          background: active ? "rgba(91,33,182,0.45)" : undefined,
        }}
        data-testid={`section-rail-${section.id}`}
      />
      <button
        type="button"
        className="section-tab"
        style={{ top: top + height / 2 }}
        data-testid={`section-tab-${section.id}`}
        aria-label={`Review ${index + 1} of ${total}: ${section.name}`}
        onClick={onOpen}
      >
        ● REVIEW {index + 1}/{total}
      </button>
    </>
  );
}

function SectionReviewCard({
  section,
  onClose,
}: {
  section: Section;
  onClose: () => void;
}) {
  return (
    <aside
      className="finding-card"
      data-testid={`section-card-${section.id}`}
      style={{ marginTop: 12 }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--rail)",
        }}
      >
        Section review · {section.name}
      </div>
      <p style={{ margin: "0.4rem 0 0.75rem" }}>
        Cranial audit rating <strong>{section.combt}/12</strong>{" "}
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          ({section.comb_state})
        </span>
      </p>
      <div className="comb-bars" style={{ marginBottom: 10 }}>
        {(["C", "O", "M"] as const).map((k) => (
          <div className="comb-row" key={k}>
            <span>{k}</span>
            <CombSquares value={section.comb[k]} />
          </div>
        ))}
      </div>
      {section.radar && (
        <p style={{ fontSize: 13 }} data-testid="section-radar">
          Creative Score {section.radar.score} · {section.radar.label}
        </p>
      )}
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {section.r
          .filter(([k]) => k === "Definite")
          .map(([, text]) => (
            <div
              key={text}
              style={{
                background: "var(--ok-soft)",
                borderRadius: 6,
                padding: "0.55rem 0.65rem",
                fontSize: 13,
              }}
            >
              <strong>Definite fix</strong>
              <div>{text}</div>
            </div>
          ))}
        {section.r
          .filter(([k]) => k === "Experiment")
          .map(([, text]) => (
            <div key={text} style={{ fontSize: 13 }}>
              <strong>Optional test:</strong> {text}
            </div>
          ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 13 }}>
        The {section.of.length} findings here
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </aside>
  );
}
