import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CapturedImage } from "@/types";

interface ImagePreviewPanelProps {
	images: CapturedImage[];
	onClose: () => void;
}

export function ImagePreviewPanel({ images, onClose }: ImagePreviewPanelProps) {
	const [viewingIndex, setViewingIndex] = useState(images.length - 1);

	const currentImage = images[viewingIndex];
	const canGoPrev = viewingIndex > 0;
	const canGoNext = viewingIndex < images.length - 1;
	const hasMultiple = images.length > 1;

	const handleNavigate = (direction: "prev" | "next") => {
		setViewingIndex((prev) => {
			if (direction === "prev") {
				return Math.max(0, prev - 1);
			}
			return Math.min(images.length - 1, prev + 1);
		});
	};

	const handleBackdropClick = (e: React.MouseEvent) => {
		// Only close if clicking the backdrop itself, not the image or buttons
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="absolute inset-0 bottom-9 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-fade-in rounded-t-md overflow-hidden"
			onClick={handleBackdropClick}
		>
			{/* Close button */}
			<Button
				variant="ghost"
				size="icon"
				className="absolute top-1 right-1 z-10 h-7 w-7"
				onClick={onClose}
			>
				<X size={16} />
			</Button>

			{/* Navigation arrows */}
			{hasMultiple && (
				<>
					<Button
						variant="ghost"
						size="icon"
						className="absolute left-1 z-10 h-8 w-8"
						onClick={() => handleNavigate("prev")}
						disabled={!canGoPrev}
					>
						<ChevronLeft size={20} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="absolute right-1 z-10 h-8 w-8"
						onClick={() => handleNavigate("next")}
						disabled={!canGoNext}
					>
						<ChevronRight size={20} />
					</Button>
				</>
			)}

			{/* Image */}
			<img
				src={currentImage.src}
				alt=""
				className="max-w-[calc(100%-4rem)] max-h-[calc(100%-2rem)] object-contain rounded-md shadow-lg"
			/>

			{/* Image counter */}
			{hasMultiple && (
				<div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-mono tabular-nums">
					{viewingIndex + 1} / {images.length}
				</div>
			)}
		</div>
	);
}
