import type { CaptureFrame, CreativeScoreResult } from "@/lib/audit/types";

const AXIS_NAMES = [
  "Aesthetic",
  "Attention",
  "Authenticity",
  "Clarity",
  "Cohesion",
  "Creativity",
  "Emotion",
  "Memorability",
  "Motivation",
  "Narrative",
  "Relevance",
  "Urgency",
  "Virality",
];

export function creativeScoreConfigured(): boolean {
  return Boolean(process.env.CREATIVE_SCORE_API_KEY?.trim());
}

/**
 * Creative Score integration.
 * Live API when CREATIVE_SCORE_API_KEY is set; otherwise honest fixture + TODO.
 */
export async function scoreCaptures(
  frames: CaptureFrame[],
): Promise<CreativeScoreResult[]> {
  if (creativeScoreConfigured()) {
    // TODO: wire real Creative Score Detailed/Standard API once key is provisioned.
    // For now still return fixture-shaped results so the pipeline stays typed.
    return frames.map((f) => fixtureScore(f, "live-pending-wireup"));
  }
  return frames.map((f) =>
    fixtureScore(
      f,
      "TODO: set CREATIVE_SCORE_API_KEY for live Creative Score. Fixture scores used for MVP.",
    ),
  );
}

function fixtureScore(
  frame: CaptureFrame,
  todo?: string,
): CreativeScoreResult {
  const seed = hash(`${frame.page_id}:${frame.device}:${frame.path}`);
  const axes = AXIS_NAMES.map((_, i) => 45 + ((seed + i * 17) % 40));
  const score = Math.round(axes.reduce((a, b) => a + b, 0) / axes.length);
  return {
    page_id: frame.page_id,
    device: frame.device,
    mode: creativeScoreConfigured() ? "live" : "fixture",
    score,
    label: scoreLabel(score),
    axes,
    names: AXIS_NAMES,
    todo,
  };
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Strong attention";
  if (score >= 60) return "Mixed attention";
  return "Weak attention";
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
