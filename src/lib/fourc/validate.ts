import {
  intakeCustomerView,
  intakeDifference,
  intakeForceFlagBlob,
  intakeWhyNot,
} from "@/lib/audit/intake-fields";
import type { IntakeAnswers } from "@/lib/audit/types";
import type { FourCStepOutput, ValidationCheck } from "@/lib/fourc/types";

/**
 * Pass logic from brief §7.3 (proposal).
 * Validated when: who + why_buy pass (or partial only on why_not),
 * no contradiction fail, evidence floor not insufficient on who/why_buy.
 */
export function evaluateValidation(
  checks: ValidationCheck[],
): { validated: boolean; failed: ValidationCheck[] } {
  const by = Object.fromEntries(checks.map((c) => [c.check, c])) as Record<
    ValidationCheck["check"],
    ValidationCheck
  >;

  const failed: ValidationCheck[] = [];

  if (by.who?.result === "fail" || by.who?.result === "insufficient_evidence") {
    failed.push(by.who);
  }
  if (
    by.why_buy?.result === "fail" ||
    by.why_buy?.result === "insufficient_evidence"
  ) {
    failed.push(by.why_buy);
  }
  if (by.contradiction?.result === "fail") {
    failed.push(by.contradiction);
  }
  if (by.why_not?.result === "fail") {
    failed.push(by.why_not);
  }
  if (by.evidence_floor?.result === "fail") {
    failed.push(by.evidence_floor);
  }

  return { validated: failed.length === 0, failed };
}

/** Detect demo force-flag from intake (fixtures OK where APIs missing). */
export function detectForceFlag(intake: IntakeAnswers): boolean {
  return intakeForceFlagBlob(intake).toUpperCase().includes("FORCE_FLAG");
}

export function buildValidationChecks(args: {
  intake: IntakeAnswers;
  forceFlag: boolean;
  step2Verdict: string;
  step1SupportedReasons: number;
  shortlistIncludesClient: boolean;
  unresolvedWrongSource: boolean;
}): ValidationCheck[] {
  const { intake, forceFlag } = args;

  if (forceFlag) {
    return [
      {
        check: "who",
        result: "fail",
        evidence:
          "Client says first-visit couples; outside evidence points to repeat guests in shoulder season.",
        plain_words:
          "You told us most bookings come from couples on a first visit. Outside evidence points to repeat guests in shoulder season.",
      },
      {
        check: "why_buy",
        result: "partial",
        evidence: `Client difference: ${intakeDifference(intake).slice(0, 120)}`,
        plain_words:
          "One of your reasons to buy looks fair, but we want to check it against outside evidence.",
      },
      {
        check: "why_not",
        result: "partial",
        evidence: intakeWhyNot(intake).slice(0, 160),
        plain_words:
          "Your reasons for not booking are not clearly contradicted, but need a closer look.",
      },
      {
        check: "contradiction",
        result: "fail",
        evidence: args.step2Verdict,
        plain_words:
          "Research says the core audience in your answers does not match outside evidence.",
      },
      {
        check: "evidence_floor",
        result: "pass",
        evidence: "No unresolved wrong-source errors on the claims used above.",
        plain_words: "Source checks on the key claims look fine.",
      },
    ];
  }

  return [
    {
      check: "who",
      result: args.shortlistIncludesClient ? "pass" : "fail",
      evidence: args.shortlistIncludesClient
        ? `Client view matches shortlist segment 1: ${intakeCustomerView(intake).slice(0, 120)}`
        : "Client best-fit customer not in Step 2 shortlist top 2.",
      plain_words: args.shortlistIncludesClient
        ? "Your view of who books matches the outside evidence shortlist."
        : "Your view of who books does not match the outside evidence shortlist.",
    },
    {
      check: "why_buy",
      result: args.step1SupportedReasons >= 1 ? "pass" : "fail",
      evidence:
        args.step1SupportedReasons >= 1
          ? `At least one top reason survives the ladder test (${intakeDifference(intake).slice(0, 100)}).`
          : "No supported or fair-inference reason survived the rival test.",
      plain_words:
        args.step1SupportedReasons >= 1
          ? "At least one reason you gave for why they buy is supported."
          : "We could not support the reasons you gave for why they buy.",
    },
    {
      check: "why_not",
      result: "partial",
      evidence: `Client why-not: ${intakeWhyNot(intake).slice(0, 160)}`,
      plain_words:
        "Your reasons for not booking are treated as a working hypothesis (partial).",
    },
    {
      check: "contradiction",
      result: args.step2Verdict.includes("wrong on the core audience")
        ? "fail"
        : "pass",
      evidence: args.step2Verdict,
      plain_words: args.step2Verdict.includes("wrong on the core audience")
        ? "Research found a hard contradiction on the core audience."
        : "No hard contradiction on the core audience.",
    },
    {
      check: "evidence_floor",
      result: args.unresolvedWrongSource ? "fail" : "pass",
      evidence: args.unresolvedWrongSource
        ? "AI-mistake review left unresolved wrong-source errors."
        : "AI-mistake review cleared the claims used in who / why-buy / why-not.",
      plain_words: args.unresolvedWrongSource
        ? "Some evidence sources still look wrong."
        : "Evidence sources for the key checks look sound.",
    },
  ];
}

export function draftFlagWording(failed: ValidationCheck[]): {
  title: string;
  what_is_flagged: string[];
  questions: Array<{ id: string; prompt: string }>;
  what_happens_next: string;
} {
  const lines = failed.map((f) => f.plain_words);
  return {
    title: "We need your view on your customer",
    what_is_flagged: lines.length
      ? lines
      : ["We need to check your customer view before we go on."],
    questions: [
      {
        id: "q_who",
        prompt:
          "Who do you believe books (or buys) most often on your site, and how sure are you?",
      },
      {
        id: "q_evidence",
        prompt:
          "What evidence do you have (survey, booking mix, sales notes)? Optional — paste a short note.",
      },
      {
        id: "q_revise",
        prompt:
          "If outside evidence points elsewhere, what would you revise in your customer view?",
      },
    ],
    what_happens_next:
      "A Cranial expert will review your answer and confirm the customer view we use. Your audit carries on capturing your site in the meantime.",
  };
}

/** Build a short Approach line after validation or expert verify. */
export function customerViewApproachLine(args: {
  status: "validated" | "expert_verified";
  date: string;
}): string {
  if (args.status === "validated") {
    return `Customer view validated automatically on ${args.date}.`;
  }
  return `Customer view flagged once and verified by a Cranial expert on ${args.date}.`;
}

export function stepSummariesForReport(
  steps: FourCStepOutput[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of steps) {
    out[s.step] = s.summary;
  }
  return out;
}
