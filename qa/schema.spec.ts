import { expect, test } from "@playwright/test";
import { velifushiAnonFixture } from "../src/fixtures/velifushi-anon";
import {
  ReportDocumentSchema,
  assertClientPublishable,
} from "../src/lib/report/types";

test("anonymised fixture matches report schema and publish gates", () => {
  const parsed = ReportDocumentSchema.safeParse(velifushiAnonFixture);
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;
  const errors = assertClientPublishable(parsed.data);
  expect(errors).toEqual([]);
});
