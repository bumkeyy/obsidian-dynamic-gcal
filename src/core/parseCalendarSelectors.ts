export function parseCalendarSelectors(input: string | undefined): string[] {
	if (!input) {
		return [];
	}

	const unique = new Set<string>();
	for (const rawItem of input.split(",")) {
		const value = rawItem.trim();
		if (value.length > 0) {
			unique.add(value);
		}
	}

	return [...unique];
}
