// Linear interpolation between two values
export const lerp = (start: number, end: number, t: number): number => {
	return start + (end - start) * t;
};

// Ease-out cubic for smooth deceleration
export const easeOutCubic = (t: number): number => {
	return 1 - (1 - t) ** 3;
};
