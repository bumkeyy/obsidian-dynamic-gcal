import type { ParsedGcalBlock } from "./parseGcalBlock";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface ResolvedTargetDate {
	targetDate: string;
	source: "block" | "frontmatter" | "today";
	warnings: string[];
}

export function resolveTargetDate(
	parsed: ParsedGcalBlock,
	frontmatterDate: unknown,
	now: Date = new Date(),
): ResolvedTargetDate {
	const warnings = [...parsed.warnings];

	if (parsed.dateMode === "literal" && parsed.dateLiteral && DATE_ONLY_REGEX.test(parsed.dateLiteral)) {
		return {
			targetDate: parsed.dateLiteral,
			source: "block",
			warnings,
		};
	}

	if (parsed.dateMode === "frontmatter") {
		const frontmatterResolved = normalizeFrontmatterDate(frontmatterDate);
		if (frontmatterResolved) {
			return {
				targetDate: frontmatterResolved,
				source: "frontmatter",
				warnings,
			};
		}

		warnings.push("Frontmatter date is missing or invalid; using today.");
	}

	return {
		targetDate: toDateOnly(now),
		source: "today",
		warnings,
	};
}

export function normalizeFrontmatterDate(value: unknown): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (DATE_ONLY_REGEX.test(trimmed)) {
			return trimmed;
		}

		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) {
			return toDateOnly(parsed);
		}
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return toDateOnly(value);
	}

	return undefined;
}

function toDateOnly(value: Date): string {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
