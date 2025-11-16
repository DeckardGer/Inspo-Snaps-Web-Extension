import {
	MAXIMISED_HEIGHT,
	MAXIMISED_WIDTH,
	MINIMISED_HEIGHT,
	MINIMISED_WIDTH,
	SAFE_ZONE,
} from "@/lib/constants";
import type { Corner } from "@/types";

// Get the toolbar size based on whether it is minimised or maximised
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
