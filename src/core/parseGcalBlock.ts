import { parseCalendarSelectors } from "./parseCalendarSelectors";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type GcalDateMode = "frontmatter" | "literal" | "unset";

export interface ParsedGcalBlock {
	dateMode: GcalDateMode;
	dateLiteral?: string;
	calendarSelectors: string[];
	hideAttendees: boolean;
	warnings: string[];
}

export function parseGcalBlock(source: string): ParsedGcalBlock {
	const result: ParsedGcalBlock = {
		dateMode: "unset",
		calendarSelectors: [],
		hideAttendees: false,
		warnings: [],
	};

	for (const rawLine of source.split(/\r?\n/u)) {
		const line = rawLine.trim();
		if (!line) {
			continue;
		}

		const lower = line.toLowerCase();

		if (lower.startsWith("date:")) {
			const dateValue = line.slice(line.indexOf(":") + 1).trim();
			if (dateValue.toLowerCase() === "frontmatter") {
				result.dateMode = "frontmatter";
				result.dateLiteral = undefined;
				continue;
			}

			if (DATE_ONLY_REGEX.test(dateValue)) {
				result.dateMode = "literal";
				result.dateLiteral = dateValue;
				continue;
			}

			result.dateMode = "unset";
			result.dateLiteral = undefined;
			result.warnings.push(`Unsupported date format: ${dateValue}`);
			continue;
		}

		if (lower.startsWith("calendar:")) {
			const calendarValue = line.slice(line.indexOf(":") + 1).trim();
			result.calendarSelectors = parseCalendarSelectors(calendarValue);
			continue;
		}

		if (lower === "hide attendees") {
			result.hideAttendees = true;
		}
	}

	return result;
}
