import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { CapturedImage } from "@/types";

interface ImagePreviewPanelProps {
	images: CapturedImage[];
	onClose: () => void;
	onRemoveImage: (id: string) => void;
}

export function ImagePreviewPanel({
	images,
	onClose,
	onRemoveImage,
}: ImagePreviewPanelProps) {
	const [api, setApi] = useState<CarouselApi>();
	const [isClosing, setIsClosing] = useState(false);

	const handleClose = useCallback(() => {
		if (isClosing) return;
		setIsClosing(true);
		setTimeout(onClose, 200); // Match fade-out duration
	}, [isClosing, onClose]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			} else if (e.key === "Backspace") {
				const currentIndex = api?.selectedScrollSnap() ?? 0;
				const currentImage = images[currentIndex];
				if (currentImage) {
					onRemoveImage(currentImage.id);
				}
			} else if (e.key === "ArrowLeft") {
				api?.scrollPrev();
			} else if (e.key === "ArrowRight") {
				api?.scrollNext();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [api, handleClose, images, onRemoveImage]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Image preview"
			className={cn(
				"absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-md overflow-hidden",
				isClosing ? "animate-fade-out" : "animate-fade-in",
			)}
		>
			{/* Close button */}
			<Button
				variant="ghost"
				size="icon"
				className="absolute top-2 right-2 z-10 h-9 w-9"
				onClick={handleClose}
			>
				<X />
			</Button>

			<Carousel
				setApi={setApi}
				className="w-full max-w-[calc(100%-8rem)] h-full max-h-[calc(100%-4rem)]"
			>
				<CarouselContent className="h-full">
					{images.map((image) => (
						<CarouselItem
							key={image.id}
							className="flex items-center justify-center h-full"
						>
							<div className="relative group">
								<Button
									size="icon"
									className="absolute top-[-6px] left-[-6px] bg-primary hover:bg-primary text-white h-5 w-5 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => onRemoveImage(image.id)}
								>
									<X size={8} />
								</Button>
								<img
									src={image.src}
									alt=""
									className="w-auto h-auto max-w-full max-h-full rounded-md shadow-lg"
								/>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious className="rounded-md" />
				<CarouselNext className="rounded-md" />
			</Carousel>
		</div>
	);
}
