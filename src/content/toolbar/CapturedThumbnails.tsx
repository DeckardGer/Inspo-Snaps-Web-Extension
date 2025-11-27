import { Loader2, Save, X } from "lucide-react";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { THUMBNAIL_SIZE } from "@/lib/constants";
import type { CapturedImage } from "@/types";

interface CapturedThumbnailsProps {
	images: CapturedImage[];
	onClick: () => void;
	onRemove: () => void;
	onSave?: () => void;
	isSaving?: boolean;
}

export const CapturedThumbnails = React.memo<CapturedThumbnailsProps>(
	function CapturedThumbnails({
		images,
		onClick,
		onRemove,
		onSave,
		isSaving = false,
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

		const handleSaveClick = (e: React.MouseEvent) => {
			e.stopPropagation();
			onSave?.();
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
						<X size={8} />
					</Button>
				) : (
					count > 1 && (
						<Badge className="absolute top-[-6px] left-[-6px] bg-primary text-white h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
							{count}
						</Badge>
					)
				)}
				{onSave && (
					<Button
						size="icon"
						className="absolute top-[-6px] right-[-6px] h-8 w-8 rounded-full shadow-md"
						onClick={handleSaveClick}
						disabled={isSaving}
					>
						{isSaving ? (
							<Loader2 className="animate-spin" size={16} />
						) : (
							<Save size={16} />
						)}
					</Button>
				)}
			</div>
		);
	},
);
