import { useEffect, useRef } from "react";
import { saveToolbarCorner } from "@/content/index";
import {
	TOOLBAR_TIMING_FUNCTION,
	TOOLBAR_TRANSITION_DURATION,
} from "@/lib/constants";
import {
	calculatePosition,
	getBestCorner,
	getToolbarSize,
} from "@/lib/positioning";
import { useToolbarStore } from "@/store/toolbarStore";
import type { Corner } from "@/types";

export const useToolbarDrag = (
	toolbarRef: React.RefObject<HTMLDivElement>,
	initialCorner: Corner,
) => {
	const { isMinimised, setCorner } = useToolbarStore();

	const { width, height } = getToolbarSize(true);
	const initialPosition = calculatePosition(initialCorner, width, height);

	const position = useRef(initialPosition);
	const dragStartPos = useRef({ x: 0, y: 0 });
	const dragOffset = useRef({ x: 0, y: 0 });
	const isDragging = useRef(false);

	// Expose function to update position (used by toggleFolders)
	const updatePosition = (newX: number, newY: number) => {
		position.current = { x: newX, y: newY };
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		isDragging.current = true;
		dragStartPos.current = { x: e.clientX, y: e.clientY };
		dragOffset.current = {
			x: e.clientX - position.current.x,
			y: e.clientY - position.current.y,
		};

		if (toolbarRef.current) {
			toolbarRef.current.style.transition = "none";
		}
	};

	useEffect(() => {
		// Set initial position
		if (toolbarRef.current) {
			toolbarRef.current.style.transform = `translate(${position.current.x}px, ${position.current.y}px)`;
		}

		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging.current || !toolbarRef.current) return;

			const newX = e.clientX - dragOffset.current.x;
			const newY = e.clientY - dragOffset.current.y;

			position.current = { x: newX, y: newY };
			toolbarRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
		};

		const handleMouseUp = (e: MouseEvent) => {
			if (!isDragging.current) return;

			isDragging.current = false;

			if (!toolbarRef.current) return;
			toolbarRef.current.style.transition = `transform ${TOOLBAR_TRANSITION_DURATION}ms ${TOOLBAR_TIMING_FUNCTION}`;

			const bestCorner = getBestCorner(
				e.clientX,
				e.clientY,
				dragStartPos.current.x,
				dragStartPos.current.y,
			);

			setCorner(bestCorner);
			saveToolbarCorner(bestCorner);

			const { width, height } = getToolbarSize(isMinimised);
			const { x, y } = calculatePosition(bestCorner, width, height);
			position.current = { x, y };
			toolbarRef.current.style.transform = `translate(${x}px, ${y}px)`;
		};

		const handleResize = () => {
			if (!toolbarRef.current) return;

			const { width, height } = getToolbarSize(isMinimised);
			const corner = useToolbarStore.getState().corner;
			const { x, y } = calculatePosition(corner, width, height);

			position.current = { x, y };
			toolbarRef.current.style.transform = `translate(${x}px, ${y}px)`;
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		window.addEventListener("resize", handleResize);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("resize", handleResize);
		};
	}, [isMinimised, toolbarRef, setCorner]);

	return { handleMouseDown, updatePosition };
};
