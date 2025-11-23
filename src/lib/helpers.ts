import {
	MAXIMISED_HEIGHT,
	MAXIMISED_WIDTH,
	MINIMISED_HEIGHT,
	MINIMISED_WIDTH,
	SAFE_ZONE,
	THUMBNAIL_SIZE,
	THUMBNAIL_TOOLBAR_PADDING,
} from "@/lib/constants";
import type { Corner, FlattenedFolder, Folder } from "@/types";

// Get the toolbar size based on whether it is minimised
export const getToolbarSize = (isMinimised: boolean) => {
	if (isMinimised) {
		return {
			width: MINIMISED_WIDTH,
			height: MINIMISED_HEIGHT,
		};
	}

	return {
		width: MAXIMISED_WIDTH,
		height: MAXIMISED_HEIGHT,
	};
};

// Determine the best corner to place the toolbar based on cursor position and movement
export const getBestCorner = (
	mouseX: number,
	mouseY: number,
	initialMouseX?: number,
	initialMouseY?: number,
	threshold = 30,
): Corner => {
	const deltaX = initialMouseX !== undefined ? mouseX - initialMouseX : 0;
	const deltaY = initialMouseY !== undefined ? mouseY - initialMouseY : 0;

	// Check if there was significant drag movement
	const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	const hasSignificantDrag = dragDistance > threshold;

	if (hasSignificantDrag) {
		// Use drag direction to determine corner
		// Weight the direction vector more heavily than absolute position

		// Normalize the drag vector
		const normalizedDeltaX = deltaX / dragDistance;
		const normalizedDeltaY = deltaY / dragDistance;

		// Calculate weighted position (70% drag direction, 30% final position)
		const dragWeight = 0.7;
		const posWeight = 0.3;

		const windowCenterX = window.innerWidth / 2;
		const windowCenterY = window.innerHeight / 2;

		// Current position relative to center (-1 to 1)
		const posX = (mouseX - windowCenterX) / windowCenterX;
		const posY = (mouseY - windowCenterY) / windowCenterY;

		// Combine drag direction and position
		const combinedX = normalizedDeltaX * dragWeight + posX * posWeight;
		const combinedY = normalizedDeltaY * dragWeight + posY * posWeight;

		// Determine corner based on combined vector
		return combinedX > 0
			? combinedY > 0
				? "bottom-right"
				: "top-right"
			: combinedY > 0
				? "bottom-left"
				: "top-left";
	}

	// If no significant drag, use quadrant-based position only
	const windowCenterX = window.innerWidth / 2;
	const windowCenterY = window.innerHeight / 2;

	return mouseX > windowCenterX
		? mouseY > windowCenterY
			? "bottom-right"
			: "top-right"
		: mouseY > windowCenterY
			? "bottom-left"
			: "top-left";
};

// Calculate the position of the toolbar based on the corner
export const calculatePosition = (
	corner: Corner,
	width: number,
	height: number,
): { x: number; y: number } => {
	const windowWidth = window.innerWidth;
	const windowHeight = window.innerHeight;

	// Check if widget is minimized
	const isMinimized = width === 168;

	// Only bound dimensions if minimized
	const effectiveWidth = isMinimized
		? width
		: Math.min(width, windowWidth - SAFE_ZONE * 2);
	const effectiveHeight = isMinimized
		? height
		: Math.min(height, windowHeight - SAFE_ZONE * 2);

	// Calculate base positions
	let x: number;
	let y: number;

	const leftBound = SAFE_ZONE;
	const rightBound = windowWidth - effectiveWidth - SAFE_ZONE;
	const topBound = SAFE_ZONE;
	const bottomBound = windowHeight - effectiveHeight - SAFE_ZONE;

	switch (corner) {
		case "top-right":
			x = rightBound;
			y = topBound;
			break;
		case "bottom-right":
			x = rightBound;
			y = bottomBound;
			break;
		case "bottom-left":
			x = leftBound;
			y = bottomBound;
			break;
		case "top-left":
			x = leftBound;
			y = topBound;
			break;
		default:
			x = leftBound;
			y = topBound;
			break;
	}

	// Only ensure positions are within bounds if minimized
	if (isMinimized) {
		x = Math.max(leftBound, Math.min(x, rightBound));
		y = Math.max(topBound, Math.min(y, bottomBound));
	}

	return { x, y };
};

// Flattens the folder tree for search
export function flattenFolders(
	folders: Folder[],
	path: string[] = [],
	depth: number = 0,
): FlattenedFolder[] {
	const result: FlattenedFolder[] = [];

	for (const folder of folders) {
		const currentPath = [...path, folder.name];
		result.push({ folder, path: currentPath, depth });

		if (folder.folders.length > 0) {
			result.push(...flattenFolders(folder.folders, currentPath, depth + 1));
		}
	}

	return result;
}

// Linear interpolation between two values
export const lerp = (start: number, end: number, t: number): number => {
	return start + (end - start) * t;
};

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

// Ease-out cubic for smooth deceleration
export const easeOutCubic = (t: number): number => {
	return 1 - (1 - t) ** 3;
};

// Calculate the target position for a flying thumbnail relative to toolbar
// The thumbnail floats in the bottom-right corner of the toolbar, above the button row
export const getThumbnailTargetPosition = (
	corner: Corner,
): { x: number; y: number } => {
	// Get toolbar's final position when maximised
	const toolbarPos = calculatePosition(
		corner,
		MAXIMISED_WIDTH,
		MAXIMISED_HEIGHT,
	);

	// Calculate position: bottom-right corner, above button row
	const x =
		toolbarPos.x +
		MAXIMISED_WIDTH -
		THUMBNAIL_SIZE -
		THUMBNAIL_TOOLBAR_PADDING -
		1;
	const y =
		toolbarPos.y +
		MAXIMISED_HEIGHT -
		MINIMISED_HEIGHT -
		THUMBNAIL_TOOLBAR_PADDING -
		THUMBNAIL_SIZE;

	return { x, y };
};
