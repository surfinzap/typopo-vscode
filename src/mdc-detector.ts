export interface MDCRegion {
	start: number; // Byte offset
	end: number; // Byte offset
	type: 'block' | 'inline';
}

export function detectMDCRegions(text: string): MDCRegion[] {
	const regions: MDCRegion[] = [];

	try {
		// Detect block components using stack-based matching
		// Block components: ::alert, :::container
		const lines = text.split('\n');
		const stack: Array<{ offset: number; level: number }> = [];
		let currentOffset = 0;

		for (const line of lines) {
			const lineStart = currentOffset;
			const lineEnd = currentOffset + line.length;

			// Check for block start: ::name or :::name
			const startMatch = line.match(/^(:::?)([\w-]+)/);
			if (startMatch) {
				const level = startMatch[1].length; // :: = 2, ::: = 3
				stack.push({ offset: lineStart, level });
			}

			// Check for block end: :: or :::
			const endMatch = line.match(/^(:::?)$/);
			if (endMatch && stack.length > 0) {
				const level = endMatch[1].length;
				// Find matching start with same level (stack-based LIFO)
				for (let i = stack.length - 1; i >= 0; i--) {
					if (stack[i].level === level) {
						const start = stack.splice(i, 1)[0];
						regions.push({
							start: start.offset,
							end: lineEnd,
							type: 'block'
						});
						break;
					}
				}
			}

			currentOffset = lineEnd + 1; // +1 for newline character
		}

		// Detect inline components: :icon{name="check"}
		const inlineRegex = /:([\w-]+)(?:\{[^}]*\})?/g;
		let match;
		while ((match = inlineRegex.exec(text)) !== null) {
			regions.push({
				start: match.index,
				end: match.index + match[0].length,
				type: 'inline'
			});
		}

	} catch (error) {
		console.warn('MDC detection encountered an error:', error);
		// Return partial results
	}

	return regions;
}

export function isInMDCRegion(offset: number, regions: MDCRegion[]): boolean {
	return regions.some(r => offset >= r.start && offset < r.end);
}
