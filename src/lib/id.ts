/**
 * Generate unique ID with optional prefix
 * Used across storage.ts and components
 */
export const generateId = (prefix?: string): string => {
	const timestamp = Date.now();
	const random = Math.random().toString(36).slice(2, 9);
	return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
};
