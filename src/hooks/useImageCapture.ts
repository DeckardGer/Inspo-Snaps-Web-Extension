import { useCallback } from "react";
import {
	TOOLBAR_TIMING_FUNCTION,
	TOOLBAR_TRANSITION_DURATION,
} from "@/lib/constants";
import { generateId } from "@/lib/id";
import { calculatePosition, getToolbarSize } from "@/lib/positioning";
import { useImagesStore } from "@/store/imagesStore";
import { useToolbarStore } from "@/store/toolbarStore";
import type { FlyingImageData, ImageCaptureData } from "@/types";

export const useImageCapture = (
	toolbarRef: React.RefObject<HTMLDivElement>,
	updatePosition: (x: number, y: number) => void,
) => {
	const { isMinimised, corner, setIsMinimised } = useToolbarStore();
	const { addFlyingImage, addCapturedImage, removeFlyingImage } =
		useImagesStore();

	const handleImageCapture = useCallback(
		(data: ImageCaptureData) => {
			// Expand toolbar if minimised
			if (isMinimised && toolbarRef.current) {
				toolbarRef.current.style.transition = `all ${TOOLBAR_TRANSITION_DURATION}ms ${TOOLBAR_TIMING_FUNCTION}`;

				const { width, height } = getToolbarSize(false);
				const { x, y } = calculatePosition(corner, width, height);

				// Update position ref to keep it in sync
				updatePosition(x, y);

				toolbarRef.current.style.transform = `translate(${x}px, ${y}px)`;
				setIsMinimised(false);
			}

			// Create flying image
			const flyingImage: FlyingImageData = {
				...data,
				id: generateId(),
			};

			addFlyingImage(flyingImage);
		},
		[
			isMinimised,
			corner,
			toolbarRef,
			setIsMinimised,
			addFlyingImage,
			updatePosition,
		],
	);

	const handleFlyingAnimationComplete = useCallback(
		(id: string, src: string) => {
			addCapturedImage({ id, src });
			removeFlyingImage(id);
		},
		[addCapturedImage, removeFlyingImage],
	);

	return {
		handleImageCapture,
		handleFlyingAnimationComplete,
	};
};
