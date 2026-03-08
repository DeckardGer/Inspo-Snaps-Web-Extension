import React, { useEffect, useState } from "react";
import {
	CAPTURE_ANIMATION_DURATION,
	THUMBNAIL_SIZE,
	TOOLBAR_TIMING_FUNCTION,
} from "@/lib/constants";
import { getThumbnailTargetPosition } from "@/lib/positioning";
import type { Corner, ImageCaptureData } from "@/types";

interface FlyingImageProps {
	id: string;
	captureData: ImageCaptureData;
	corner: Corner;
	onAnimationComplete: (id: string, src: string) => void;
}

export const FlyingImage = React.memo<FlyingImageProps>(function FlyingImage({
	id,
	captureData,
	corner,
	onAnimationComplete,
}: FlyingImageProps) {
	const [isAnimating, setIsAnimating] = useState(false);

	// Calculate target position based on toolbar's final position
	const targetPosition = getThumbnailTargetPosition(corner);

	useEffect(() => {
		// Trigger animation on next frame to ensure initial styles are applied
		const frameId = requestAnimationFrame(() => {
			setIsAnimating(true);
		});

		return () => cancelAnimationFrame(frameId);
	}, []);

	const handleTransitionEnd = (e: React.TransitionEvent) => {
		// Only trigger once - use 'left' as the canonical property to detect completion
		if (e.propertyName === "left") {
			onAnimationComplete(id, captureData.src);
		}
	};

	return (
		<img
			src={captureData.src}
			alt=""
			onTransitionEnd={handleTransitionEnd}
			className="fixed object-cover pointer-events-none rounded-lg shadow-md"
			style={{
				left: isAnimating ? targetPosition.x : captureData.rect.left,
				top: isAnimating ? targetPosition.y : captureData.rect.top,
				width: isAnimating ? THUMBNAIL_SIZE : captureData.rect.width,
				height: isAnimating ? THUMBNAIL_SIZE : captureData.rect.height,
				transition: `all ${CAPTURE_ANIMATION_DURATION}ms ${TOOLBAR_TIMING_FUNCTION}`,
				zIndex: 1000000001,
			}}
		/>
	);
});
