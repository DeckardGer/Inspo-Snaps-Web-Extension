import { useEffect, useRef } from "react";
import { lerp, throttle } from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

const OVERLAY_DPR = window.devicePixelRatio || 1;

const ANIMATION_CONFIG = {
	frameInterval: 1000 / 60,
	speed: 0.35,
} as const;

interface ImageSnapperProps {
	isInspecting: boolean;
}

export const ImageSnapper = ({ isInspecting }: ImageSnapperProps) => {
	const refCanvas = useRef<HTMLCanvasElement>(null);
	const refShadowHost = useRef<Element | null>(null);
	const refCurrentRect = useRef<Rect | null>(null);
	const refLastHoveredElement = useRef<Element | null>(null);
	const refRafId = useRef<number>(0);
	const refTimeout = useRef<ReturnType<typeof setTimeout>>();
	const refLastFrameTime = useRef<number>(0);
	const refIsFadingOut = useRef(false);

	// Get the shadow root host element on mount
	useEffect(() => {
		if (refCanvas.current) {
			const rootNode = refCanvas.current.getRootNode();
			if (rootNode instanceof ShadowRoot) {
				refShadowHost.current = rootNode.host;
			}
		}
	}, []);

	useEffect(() => {
		const canvas = refCanvas.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Update canvas size to handle DPR
		const updateCanvasSize = () => {
			const rect = canvas.getBoundingClientRect();
			canvas.width = rect.width * OVERLAY_DPR;
			canvas.height = rect.height * OVERLAY_DPR;
			ctx.scale(OVERLAY_DPR, OVERLAY_DPR);
			ctx.save();
		};

		// Draw highlight rectangle
		const drawRect = () => {
			if (!refCurrentRect.current) return;
			const rect = refCurrentRect.current;
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			ctx.strokeStyle = "rgba(142, 97, 227, 0.5)";
			ctx.fillStyle = "rgba(173, 97, 230, 0.10)";
			ctx.setLineDash([4]);
			ctx.lineWidth = 1;

			ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
			ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
		};

		// Animate rectangle transition
		const animate = (targetRect: Rect, onComplete?: () => void) => {
			const t = ANIMATION_CONFIG.speed;

			const animationFrame = (timestamp: number) => {
				if (
					timestamp - refLastFrameTime.current <
					ANIMATION_CONFIG.frameInterval
				) {
					refRafId.current = requestAnimationFrame(animationFrame);
					return;
				}
				refLastFrameTime.current = timestamp;

				if (!refCurrentRect.current) {
					cancelAnimationFrame(refRafId.current);
					return;
				}

				refCurrentRect.current = {
					left: lerp(refCurrentRect.current.left, targetRect.left, t),
					top: lerp(refCurrentRect.current.top, targetRect.top, t),
					width: lerp(refCurrentRect.current.width, targetRect.width, t),
					height: lerp(refCurrentRect.current.height, targetRect.height, t),
				};

				drawRect();

				const stillMoving =
					Math.abs(refCurrentRect.current.left - targetRect.left) > 0.1 ||
					Math.abs(refCurrentRect.current.top - targetRect.top) > 0.1 ||
					Math.abs(refCurrentRect.current.width - targetRect.width) > 0.1 ||
					Math.abs(refCurrentRect.current.height - targetRect.height) > 0.1;

				if (stillMoving) {
					refRafId.current = requestAnimationFrame(animationFrame);
				} else {
					refCurrentRect.current = targetRect;
					drawRect();
					cancelAnimationFrame(refRafId.current);
					ctx.restore();
					onComplete?.();
				}
			};

			cancelAnimationFrame(refRafId.current);
			clearTimeout(refTimeout.current);

			refRafId.current = requestAnimationFrame(animationFrame);

			// Fallback timeout to ensure animation completes
			refTimeout.current = setTimeout(() => {
				cancelAnimationFrame(refRafId.current);
				refCurrentRect.current = targetRect;
				drawRect();
				ctx.restore();
				onComplete?.();
			}, 1000);
		};

		// Setup overlay animation
		const setupOverlayAnimation = (targetRect: Rect) => {
			ctx.save();

			if (!refCurrentRect.current) {
				refCurrentRect.current = targetRect;
				drawRect();
				ctx.restore();
				return;
			}

			animate(targetRect);
		};

		// Clean up canvas
		const cleanupCanvas = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			refCurrentRect.current = null;
			refLastHoveredElement.current = null;
			canvas.classList.remove("fade-in");
			refIsFadingOut.current = false;
		};

		// Start fade out transition
		const startFadeOut = (onComplete?: () => void) => {
			if (refIsFadingOut.current) return;

			const handleTransitionEnd = (e: TransitionEvent) => {
				if (e.propertyName !== "opacity" || !refIsFadingOut.current) {
					return;
				}
				canvas.removeEventListener("transitionend", handleTransitionEnd);
				cleanupCanvas();
				onComplete?.();
			};

			canvas.addEventListener("transitionend", handleTransitionEnd);

			refIsFadingOut.current = true;
			canvas.classList.remove("fade-in");
			requestAnimationFrame(() => {
				canvas.classList.add("fade-out");
			});
		};

		// Start fade in transition
		const startFadeIn = () => {
			refIsFadingOut.current = false;
			canvas.classList.remove("fade-out");
			requestAnimationFrame(() => {
				canvas.classList.add("fade-in");
			});
		};

		// Draw hover overlay for an element
		const drawHoverOverlay = (element: Element) => {
			const boundingRect = element.getBoundingClientRect();
			const targetRect: Rect = {
				left: boundingRect.left,
				top: boundingRect.top,
				width: boundingRect.width,
				height: boundingRect.height,
			};

			setupOverlayAnimation(targetRect);
		};

		updateCanvasSize();

		if (!isInspecting) {
			startFadeOut();
			return;
		}

		const handlePointerMove = throttle((e?: PointerEvent) => {
			if (!e) return;

			// Temporarily disable pointer-events to "see through" the canvas
			canvas.style.pointerEvents = "none";
			const element = document.elementFromPoint(e.clientX, e.clientY);
			canvas.style.pointerEvents = "auto";

			clearTimeout(refTimeout.current);

			if (element && element !== refShadowHost.current) {
				// Skip if it's the same element
				if (element === refLastHoveredElement.current) return;

				refLastHoveredElement.current = element;
				startFadeIn();
				drawHoverOverlay(element);
			} else {
				// Mouse is not over a valid element
				if (!refCurrentRect.current || refIsFadingOut.current) return;
				startFadeOut();
			}
		}, 32);

		const handleResizeOrScroll = () => {
			cancelAnimationFrame(refRafId.current);
			clearTimeout(refTimeout.current);
			updateCanvasSize();
			refCurrentRect.current = null;

			// Redraw if we have a hovered element
			if (refLastHoveredElement.current) {
				drawHoverOverlay(refLastHoveredElement.current);
			}
		};

		document.addEventListener("pointermove", handlePointerMove, {
			passive: true,
			capture: true,
		});
		window.addEventListener("scroll", handleResizeOrScroll, { passive: true });
		window.addEventListener("resize", handleResizeOrScroll, { passive: true });

		return () => {
			document.removeEventListener("pointermove", handlePointerMove, {
				capture: true,
			});
			window.removeEventListener("scroll", handleResizeOrScroll);
			window.removeEventListener("resize", handleResizeOrScroll);

			if (refRafId.current) {
				cancelAnimationFrame(refRafId.current);
			}
			clearTimeout(refTimeout.current);
		};
	}, [isInspecting]);

	return (
		<canvas
			ref={refCanvas}
			className={cn(
				"fixed top-0 left-0 w-screen h-screen",
				"z-99999999",
				"opacity-0 transition-opacity duration-200",
				isInspecting
					? "pointer-events-auto cursor-default"
					: "pointer-events-none",
			)}
		/>
	);
};
