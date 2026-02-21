import { describe, expect, it } from "vitest";

import { parseGcalBlock } from "./parseGcalBlock";
import { normalizeFrontmatterDate, resolveTargetDate } from "./resolveTargetDate";

describe("resolveTargetDate", () => {
	it("uses literal block date first", () => {
		const parsed = parseGcalBlock("date: 2026-03-01");
		const resolved = resolveTargetDate(parsed, "2026-02-01", new Date("2026-01-01T00:00:00Z"));
		expect(resolved).toEqual({
			targetDate: "2026-03-01",
			source: "block",
			warnings: [],
		});
	});

	it("uses frontmatter when requested", () => {
		const parsed = parseGcalBlock("date: frontmatter");
		const resolved = resolveTargetDate(parsed, "2026-02-01", new Date("2026-01-01T00:00:00Z"));
		expect(resolved.targetDate).toBe("2026-02-01");
		expect(resolved.source).toBe("frontmatter");
	});

	it("falls back to today when frontmatter date is invalid", () => {
		const parsed = parseGcalBlock("date: frontmatter");
		const now = new Date("2026-01-07T10:00:00");
		const resolved = resolveTargetDate(parsed, "bad-date", now);
		expect(resolved.targetDate).toBe("2026-01-07");
		expect(resolved.source).toBe("today");
		expect(resolved.warnings).toContain("Frontmatter date is missing or invalid; using today.");
	});

	it("falls back to today when no date directive exists", () => {
		const parsed = parseGcalBlock("calendar: work");
		const now = new Date("2026-01-08T10:00:00");
		const resolved = resolveTargetDate(parsed, undefined, now);
		expect(resolved.targetDate).toBe("2026-01-08");
		expect(resolved.source).toBe("today");
	});
});

describe("normalizeFrontmatterDate", () => {
	it("returns YYYY-MM-DD as-is", () => {
		expect(normalizeFrontmatterDate("2026-02-21")).toBe("2026-02-21");
	});

	it("returns undefined for non-date value", () => {
		expect(normalizeFrontmatterDate(123)).toBeUndefined();
	});
});
