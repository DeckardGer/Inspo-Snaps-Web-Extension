import { Badge } from "@/components/ui/badge";
import { THUMBNAIL_SIZE } from "@/lib/constants";
import type { CapturedImage } from "@/types";

interface CapturedThumbnailsProps {
	images: CapturedImage[];
}

export function CapturedThumbnails({ images }: CapturedThumbnailsProps) {
	if (images.length === 0) return null;

	// Show the most recent image
	const latestImage = images[images.length - 1];
	const count = images.length;

	return (
		<div
			className="relative"
			style={{
				width: THUMBNAIL_SIZE,
				height: THUMBNAIL_SIZE,
			}}
		>
			<img
				src={latestImage.src}
				alt=""
				className="object-cover rounded-lg shadow-md"
				style={{
					width: THUMBNAIL_SIZE,
					height: THUMBNAIL_SIZE,
				}}
			/>
			{count > 1 && (
				<Badge className="absolute top-[-6px] left-[-6px] bg-purple-400 text-white h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
					{count}
				</Badge>
			)}
		</div>
	);
}
