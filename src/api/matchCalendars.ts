export interface CalendarListItem {
	id: string;
	summary: string;
	primary?: boolean;
	backgroundColor?: string;
	foregroundColor?: string;
	colorId?: string;
}

export interface MatchCalendarsResult {
	matched: CalendarListItem[];
	unresolved: string[];
}

export function matchCalendars(calendars: CalendarListItem[], selectors: string[]): MatchCalendarsResult {
	if (!selectors.length) {
		const primary = calendars.find((item) => item.primary) ?? calendars[0];
		return {
			matched: primary ? [primary] : [],
			unresolved: [],
		};
	}

	const matchedMap = new Map<string, CalendarListItem>();
	const unresolved: string[] = [];

	for (const selectorRaw of selectors) {
		const selector = selectorRaw.trim().toLowerCase();
		if (!selector) {
			continue;
		}
		const found = calendars.find((calendar) => {
			return calendar.id.toLowerCase() === selector || calendar.summary.trim().toLowerCase() === selector;
		});

		if (found) {
			matchedMap.set(found.id, found);
		} else {
			unresolved.push(selectorRaw);
		}
	}

	return {
		matched: [...matchedMap.values()],
		unresolved,
	};
}
