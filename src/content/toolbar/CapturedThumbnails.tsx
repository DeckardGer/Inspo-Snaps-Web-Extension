import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { THUMBNAIL_SIZE } from "@/lib/constants";
import type { CapturedImage } from "@/types";

interface CapturedThumbnailsProps {
	images: CapturedImage[];
	onClick: () => void;
	onRemove: () => void;
}

export const CapturedThumbnails = React.memo<CapturedThumbnailsProps>(
	function CapturedThumbnails({
		images,
		onClick,
		onRemove,
	}: CapturedThumbnailsProps) {
		const [isHovered, setIsHovered] = useState(false);

		if (images.length === 0) return null;

		// Show the most recent image
		const latestImage = images[images.length - 1];
		const count = images.length;

		const handleRemoveClick = (e: React.MouseEvent) => {
			e.stopPropagation();
			onRemove();
		};

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: Need for hover state
			<div
				className="relative flex items-center gap-2"
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<Button
					className="relative block cursor-pointer p-0 border-0 bg-transparent rounded-lg shadow-md"
					style={{
						width: THUMBNAIL_SIZE,
						height: THUMBNAIL_SIZE,
					}}
					onClick={onClick}
				>
					<img
						src={latestImage.src}
						alt=""
						className="object-cover rounded-lg"
						style={{
							width: THUMBNAIL_SIZE,
							height: THUMBNAIL_SIZE,
						}}
					/>
				</Button>
				{isHovered ? (
					<Button
						size="icon"
						className="absolute top-[-6px] left-[-6px] bg-primary hover:bg-primary text-white h-5 w-5 rounded-full"
						onClick={handleRemoveClick}
					>
						<HugeiconsIcon icon={Cancel01Icon} size={8} strokeWidth={2} />
					</Button>
				) : (
					count > 1 && (
						<Badge className="absolute top-[-6px] left-[-6px] bg-primary text-white h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
							{count}
						</Badge>
					)
				)}
			</div>
		);
	},
);
