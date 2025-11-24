import {
	Camera,
	ExternalLink,
	Folder as FolderIcon,
	GripVertical,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import { saveToolbarCorner } from "@/content/index";
import { CapturedThumbnails } from "@/content/toolbar/CapturedThumbnails";
import { FlyingImage } from "@/content/toolbar/FlyingImage";
import { FolderMenu } from "@/content/toolbar/FolderMenu";
import { ImagePreviewPanel } from "@/content/toolbar/ImagePreviewPanel";
import { ImageSnapper } from "@/content/toolbar/ImageSnapper";
import {
	MAXIMISED_WIDTH,
	MINIMISED_HEIGHT,
	MINIMISED_WIDTH,
	SAFE_ZONE,
	THUMBNAIL_SIZE,
	THUMBNAIL_TOOLBAR_PADDING,
	TOOLBAR_TIMING_FUNCTION,
	TOOLBAR_TRANSITION_DURATION,
} from "@/lib/constants";
import {
	calculatePosition,
	getBestCorner,
	getToolbarSize,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type {
	CapturedImage,
	Corner,
	FlyingImageData,
	Folder,
	ImageCaptureData,
} from "@/types";

// Mock data - will be replaced with API call
const MOCK_FOLDERS: Folder[] = [
	{
		name: "Folder 1",
		id: "folder-1",
		folders: [
			{ name: "Folder 1 A", id: "folder-1-a", folders: [] },
			{
				name: "Folder 1 B",
				id: "folder-1-b",
				folders: [
					{ name: "Folder 1 B A", id: "folder-1-b-a", folders: [] },
					{ name: "Folder 1 B B", id: "folder-1-b-b", folders: [] },
					{ name: "Folder 1 B C", id: "folder-1-b-c", folders: [] },
				],
			},
			{ name: "Folder 1 C", id: "folder-1-c", folders: [] },
		],
	},
	{ name: "Folder 2", id: "folder-2", folders: [] },
	{ name: "Folder 3", id: "folder-3", folders: [] },
	{ name: "Folder 4", id: "folder-4", folders: [] },
	{ name: "Folder 5", id: "folder-5", folders: [] },
	{ name: "Folder 6", id: "folder-6", folders: [] },
];

// Mock API function - replace with real API call
const fetchFolders = async (): Promise<Folder[]> => {
	await new Promise((resolve) => setTimeout(resolve, 2000));
	return MOCK_FOLDERS;
};

interface ToolbarProps {
	initialCorner: Corner;
}

export const Toolbar: React.FC<ToolbarProps> = ({ initialCorner }) => {
	const toolbarRef = useRef<HTMLDivElement>(null);
	const { width, height } = getToolbarSize(true);
	const initialPosition = calculatePosition(initialCorner, width, height);
	const position = useRef(initialPosition);
	const dragStartPos = useRef({ x: 0, y: 0 });
	const dragOffset = useRef({ x: 0, y: 0 });
	const isDragging = useRef(false);

	const [corner, setCorner] = useState<Corner>(initialCorner);
	const [isMinimised, setIsMinimised] = useState(true);
	const [isInspecting, setIsInspecting] = useState(false);
	const [folders, setFolders] = useState<Folder[] | null>(null);
	const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
	const [flyingImages, setFlyingImages] = useState<FlyingImageData[]>([]);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	const handleImageCapture = useCallback(
		(data: ImageCaptureData) => {
			// Expand toolbar if minimised
			if (isMinimised && toolbarRef.current) {
				toolbarRef.current.style.transition = `all ${TOOLBAR_TRANSITION_DURATION}ms ${TOOLBAR_TIMING_FUNCTION}`;

				const { width, height } = getToolbarSize(false);
				const { x, y } = calculatePosition(corner, width, height);

				position.current = { x, y };
				toolbarRef.current.style.transform = `translate(${x}px, ${y}px)`;

				setIsMinimised(false);
			}

			// Create a new flying image with unique ID
			const flyingImage: FlyingImageData = {
				...data,
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			};

			setFlyingImages((prev) => [...prev, flyingImage]);
		},
		[isMinimised, corner],
	);

	const handleFlyingAnimationComplete = (id: string, src: string) => {
		// Add to captured images
		const newCapturedImage: CapturedImage = {
			id,
			src,
		};

		setCapturedImages((prev) => [...prev, newCapturedImage]);

		// Remove from flying images
		setFlyingImages((prev) => prev.filter((img) => img.id !== id));
	};

	const handleThumbnailClick = () => {
		setIsPreviewOpen(true);
	};

	const handlePreviewClose = () => {
		setIsPreviewOpen(false);
	};

	const handleRemoveLatestImage = () => {
		setCapturedImages((prev) => prev.slice(0, -1));
	};

	const handleRemoveImage = (id: string) => {
		setCapturedImages((prev) => {
			const updated = prev.filter((img) => img.id !== id);

			if (updated.length === 0) {
				setIsPreviewOpen(false);
			}

			return updated;
		});
	};

	const openWebsite = () => {
		window.open("https://insposnaps.com", "_blank");
	};

	const toggleFolders = () => {
		if (!toolbarRef.current) return;
		toolbarRef.current.style.transition = `all ${TOOLBAR_TRANSITION_DURATION}ms ${TOOLBAR_TIMING_FUNCTION}`;

		const newIsMinimised = !isMinimised;
		const { width, height } = getToolbarSize(newIsMinimised);

		const { x, y } = calculatePosition(corner, width, height);

		position.current = { x, y };
		toolbarRef.current.style.transform = `translate(${x}px, ${y}px)`;

		setIsMinimised(newIsMinimised);
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		isDragging.current = true;

		dragStartPos.current = {
			x: e.clientX,
			y: e.clientY,
		};

		dragOffset.current = {
			x: e.clientX - position.current.x,
			y: e.clientY - position.current.y,
		};

		if (!toolbarRef.current) return;
		toolbarRef.current.style.transition = "none";
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

			position.current = {
				x: newX,
				y: newY,
			};

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

			// Recalculate position based on current corner and new window size
			const { width, height } = getToolbarSize(isMinimised);
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
	}, [isMinimised, corner]);

	// Fetch folders on mount
	useEffect(() => {
		fetchFolders().then(setFolders);
	}, []);

	return (
		<>
			<ImageSnapper
				isInspecting={isInspecting}
				onImageCapture={handleImageCapture}
			/>
			{flyingImages.map((flyingImage) => (
				<FlyingImage
					key={flyingImage.id}
					id={flyingImage.id}
					captureData={flyingImage}
					corner={corner}
					onAnimationComplete={handleFlyingAnimationComplete}
				/>
			))}
			<div
				ref={toolbarRef}
				className="flex fixed inset-0 select-none touch-none opacity-0 shadow-2xl animate-fade-in z-999999999 backdrop-blur-sm rounded-[7px] border border-border-outside"
				style={{
					width: getToolbarSize(isMinimised).width,
					maxWidth: `calc(100vw - ${SAFE_ZONE * 2}px)`,
					height: getToolbarSize(isMinimised).height,
					maxHeight: `calc(100vh - ${SAFE_ZONE * 2}px)`,
					transform: `translate(-${MINIMISED_WIDTH}px, -${MINIMISED_HEIGHT}px)`,
				}}
			>
				<div className="flex flex-1 flex-col bg-background rounded-md overflow-hidden relative">
					<div className="flex flex-1 flex-col overflow-hidden">
						<FolderMenu folders={folders} isMinimised={isMinimised} />
						<Separator />
					</div>
					{/* Image preview panel - visible when viewing images */}
					{isPreviewOpen && capturedImages.length > 0 && (
						<ImagePreviewPanel
							images={capturedImages}
							onClose={handlePreviewClose}
							onRemoveImage={handleRemoveImage}
						/>
					)}
					{/* Floating thumbnail - visible when maximised with captured images */}
					{!isMinimised && capturedImages.length > 0 && (
						<div
							className="absolute"
							style={{
								left:
									MAXIMISED_WIDTH -
									THUMBNAIL_SIZE -
									THUMBNAIL_TOOLBAR_PADDING -
									2,
								bottom: MINIMISED_HEIGHT + THUMBNAIL_TOOLBAR_PADDING - 1,
							}}
						>
							<CapturedThumbnails
								images={capturedImages}
								onClick={handleThumbnailClick}
								onRemove={handleRemoveLatestImage}
							/>
						</div>
					)}
					<div className="flex flex-1 max-h-9 min-h-9 overflow-hidden">
						<ButtonGroup>
							<Button
								variant="ghost"
								size="icon"
								className={cn(
									!isMinimised && "rounded-tl-none",
									isInspecting && "text-primary hover:text-primary",
								)}
								onClick={() => setIsInspecting(!isInspecting)}
							>
								<Camera />
							</Button>
							<Button variant="ghost" size="icon" onClick={toggleFolders}>
								<FolderIcon />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="rounded-r-none"
								onClick={openWebsite}
							>
								<ExternalLink />
							</Button>
						</ButtonGroup>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								"ml-auto w-6 rounded-l-none cursor-grab active:cursor-grabbing",
								!isMinimised && "rounded-tr-none",
							)}
							onMouseDown={handleMouseDown}
							aria-label="Drag toolbar"
						>
							<GripVertical size={16} />
						</Button>
					</div>
				</div>
			</div>
		</>
	);
};
