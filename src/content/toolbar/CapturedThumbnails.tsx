import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { THUMBNAIL_SIZE } from "@/lib/constants";
import type { CapturedImage } from "@/types";

interface CapturedThumbnailProps {
	images: CapturedImage[];
	onClick: () => void;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
}

export const CapturedThumbnail = React.memo<CapturedThumbnailProps>(
	function CapturedThumbnail({
		images,
		onClick,
		onMouseEnter,
		onMouseLeave,
	}: CapturedThumbnailProps) {
		if (images.length === 0) return null;

		const latestImage = images[images.length - 1];

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: Need for hover state
			<div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
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
			</div>
		);
	},
);

interface CapturedThumbnailOverlayProps {
	count: number;
	isHovered: boolean;
	onRemove: () => void;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
}

export const CapturedThumbnailOverlay =
	React.memo<CapturedThumbnailOverlayProps>(function CapturedThumbnailOverlay({
		count,
		isHovered,
		onRemove,
		onMouseEnter,
		onMouseLeave,
	}: CapturedThumbnailOverlayProps) {
		const handleRemoveClick = (e: React.MouseEvent) => {
			e.stopPropagation();
			onRemove();
		};

		if (!isHovered && count <= 1) return null;

		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: Need for hover state
			<div
				className="pointer-events-none"
				style={{
					width: THUMBNAIL_SIZE,
					height: THUMBNAIL_SIZE,
				}}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
			>
				{isHovered ? (
					<Button
						size="icon"
						className="absolute top-[-6px] left-[-6px] bg-primary hover:bg-primary text-white h-5 w-5 rounded-full pointer-events-auto"
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
	});
