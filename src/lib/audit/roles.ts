import type { Role } from "@/lib/audit/types";

/** Hard role rules from brief §19.4 / §20.4. */
export function canSignOff(role: Role): boolean {
  return role === "expert";
}

export function canPublish(role: Role): boolean {
  return role === "expert";
}

export function canReviewDraft(role: Role): boolean {
  return role === "expert" || role === "operator" || role === "admin";
}

export function assertExpert(role: Role, action: string): void {
  if (!canSignOff(role)) {
    throw new Error(
      `${action} requires the expert role. Operators and admins cannot ${action.toLowerCase()}.`,
    );
  }
}
