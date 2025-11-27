export const throttle = <E>(
	callback: (e?: E) => void,
	delay: number,
): ((e?: E) => void) => {
	let lastCall = 0;

	return (e?: E) => {
		const now = Date.now();

		if (now - lastCall >= delay) {
			lastCall = now;
			return callback(e);
		}

		return undefined;
	};
};

// Add debounce for future use
export const debounce = <T extends (...args: unknown[]) => void>(
	func: T,
	delay: number,
): ((...args: Parameters<T>) => void) => {
	let timeoutId: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
};
