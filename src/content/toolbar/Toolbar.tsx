import {
	Camera,
	ExternalLink,
	Folder as FolderIcon,
	GripVertical,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import browser from "webextension-polyfill";
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
import { getFolderService } from "@/services/folders";
import { getImageService } from "@/services/images";
import type {
	CapturedImage,
	Corner,
	FlyingImageData,
	Folder,
	ImageCaptureData,
	Message,
} from "@/types";
import { MessageType } from "@/types";

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
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
	const [isSavingImages, setIsSavingImages] = useState(false);

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

	const handleCreateFolder = async (
		name: string,
		parentId: string | null,
	): Promise<string> => {
		const folderService = getFolderService();
		const newFolder = await folderService.createFolder(name, parentId);

		// Refetch all folders to get updated tree structure
		const updatedFolders = await folderService.getFolders();
		setFolders(updatedFolders);

		return newFolder.id;
	};

	const handleFolderSelect = (folderId: string | null) => {
		setCurrentFolderId(folderId);
	};

	const handleSaveImages = async () => {
		if (capturedImages.length === 0 || isSavingImages) return;

		setIsSavingImages(true);

		try {
			const imageService = getImageService();
			await imageService.saveImages(
				capturedImages.map((img) => ({
					folderId: currentFolderId,
					src: img.src,
				})),
			);

			// Clear captured images after successful save
			setCapturedImages([]);
			setIsPreviewOpen(false);
		} finally {
			setIsSavingImages(false);
		}
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
		const folderService = getFolderService();
		folderService.getFolders().then(setFolders);
	}, []);

	// Listen for folder changes from background script
	useEffect(() => {
		const handleMessage = (message: Message) => {
			if (message.type === MessageType.FOLDERS_CHANGED) {
				console.log(
					"[Background] Folders changed in another tab, refetching...",
				);
				const folderService = getFolderService();
				folderService.getFolders().then(setFolders);
			} else if (message.type === MessageType.IMAGES_CHANGED) {
				console.log("[Background] Images changed in another tab");
				// Images are only shown after explicit user action (opening preview),
				// so we don't need to refetch automatically here
			}
		};

		browser.runtime.onMessage.addListener(handleMessage);

		return () => {
			browser.runtime.onMessage.removeListener(handleMessage);
		};
	}, []);

	// Listen for context menu image saves
	useEffect(() => {
		const handleSaveImage = (e: Event) => {
			const { src, rect } = (e as CustomEvent).detail;
			handleImageCapture({ src, rect });
		};

		window.addEventListener("inspo-save-image", handleSaveImage);
		return () =>
			window.removeEventListener("inspo-save-image", handleSaveImage);
	}, [handleImageCapture]);

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
						<FolderMenu
							folders={folders}
							isMinimised={isMinimised}
							onCreateFolder={handleCreateFolder}
							onFolderSelect={handleFolderSelect}
						/>
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
								onSave={handleSaveImages}
								isSaving={isSavingImages}
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
