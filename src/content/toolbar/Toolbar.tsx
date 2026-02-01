import {
	Camera01Icon,
	DragDropVerticalIcon,
	Folder01Icon,
	LinkSquare02Icon,
	Login01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { CapturedThumbnails } from "@/content/toolbar/CapturedThumbnails";
import { FlyingImage } from "@/content/toolbar/FlyingImage";
import { FolderMenu } from "@/content/toolbar/FolderMenu";
import { ImagePreviewPanel } from "@/content/toolbar/ImagePreviewPanel";
import { ImageSnapper } from "@/content/toolbar/ImageSnapper";
import { Notification } from "@/content/toolbar/Notification";
import { useFolderSync } from "@/hooks/useFolderSync";
import { useImageCapture } from "@/hooks/useImageCapture";
import { useOrganizationSync } from "@/hooks/useOrganizationSync";
import { useToolbarDrag } from "@/hooks/useToolbarDrag";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
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
import { calculatePosition, getToolbarSize } from "@/lib/positioning";
import { cn } from "@/lib/utils";
import { folderService } from "@/services/folders";
import { imageService } from "@/services/images";
import { useAuthStore } from "@/store/authStore";
import { useFoldersStore } from "@/store/foldersStore";
import { useImagesStore } from "@/store/imagesStore";
import { useToolbarStore } from "@/store/toolbarStore";
import type { Corner } from "@/types";

interface ToolbarProps {
	initialCorner: Corner;
}

export const Toolbar: React.FC<ToolbarProps> = ({ initialCorner }) => {
	const toolbarRef = useRef<HTMLDivElement>(null);
	const portalContainerRef = useRef<HTMLDivElement>(null);

	// Auth from store (already initialized before toolbar mounts)
	const { session, isInitialized: isAuthInitialized } = useAuthStore();
	const isLoggedOut = isAuthInitialized && !session;

	// Stores
	const {
		isMinimised,
		corner,
		isInspecting,
		isPreviewOpen,
		notification,
		setIsMinimised,
		setCorner,
		toggleIsInspecting,
		setIsPreviewOpen,
		showNotification,
		dismissNotification,
	} = useToolbarStore();

	const {
		capturedImages,
		flyingImages,
		isSavingImages,
		removeCapturedImage,
		removeLatestImage,
		clearCapturedImages,
		setIsSavingImages,
	} = useImagesStore();

	const { folders, currentFolderId, setFolders, setCurrentFolderId } =
		useFoldersStore();

	// Custom hooks
	const { handleMouseDown, updatePosition } = useToolbarDrag(
		toolbarRef,
		initialCorner,
	);
	const { handleImageCapture, handleFlyingAnimationComplete } = useImageCapture(
		toolbarRef,
		updatePosition,
	);
	useFolderSync();
	useOrganizationSync();

	// Folder panel controls
	const setFolderPanelOpen = useCallback(
		(open: boolean) => {
			if (!toolbarRef.current) return;

			const newIsMinimised = !open;
			if (newIsMinimised === isMinimised) return;

			toolbarRef.current.style.transition = `all ${TOOLBAR_TRANSITION_DURATION}ms ${TOOLBAR_TIMING_FUNCTION}`;

			const { width, height } = getToolbarSize(newIsMinimised);
			const { x, y } = calculatePosition(corner, width, height);

			updatePosition(x, y);
			toolbarRef.current.style.transform = `translate(${x}px, ${y}px)`;
			setIsMinimised(newIsMinimised);
		},
		[isMinimised, corner, setIsMinimised, updatePosition],
	);

	const toggleFolderPanel = useCallback(() => {
		setFolderPanelOpen(isMinimised);
	}, [isMinimised, setFolderPanelOpen]);

	// Initialize corner from prop on mount
	useEffect(() => {
		setCorner(initialCorner);
	}, [initialCorner, setCorner]);

	// Minimize toolbar when logged out
	useEffect(() => {
		if (isLoggedOut) {
			setFolderPanelOpen(false);
		}
	}, [isLoggedOut, setFolderPanelOpen]);

	// Event handlers
	const handleThumbnailClick = useCallback(
		() => setIsPreviewOpen(true),
		[setIsPreviewOpen],
	);

	const handlePreviewClose = useCallback(
		() => setIsPreviewOpen(false),
		[setIsPreviewOpen],
	);

	const handleRemoveImage = useCallback(
		(id: string) => {
			removeCapturedImage(id);
			if (capturedImages.length === 1) {
				setIsPreviewOpen(false);
			}
		},
		[removeCapturedImage, capturedImages.length, setIsPreviewOpen],
	);

	const handleCreateFolder = useCallback(
		async (name: string, parentId: string | null): Promise<string> => {
			try {
				const newFolder = await folderService.createFolder(name, parentId);
				const updatedFolders = await folderService.getFolders();
				setFolders(updatedFolders);
				return newFolder.id;
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to create folder. Please try again.";
				showNotification(message, "error");
				throw error;
			}
		},
		[setFolders, showNotification],
	);

	const handleUpdateFolder = useCallback(
		async (id: string, name: string): Promise<void> => {
			try {
				await folderService.updateFolder(id, { name });
				const updatedFolders = await folderService.getFolders();
				setFolders(updatedFolders);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to rename folder. Please try again.";
				showNotification(message, "error");
				throw error;
			}
		},
		[setFolders, showNotification],
	);

	const handleOrganizationChange = useCallback(
		async (_organizationId: string | null) => {
			// Refetch folders for the new context
			try {
				const updatedFolders = await folderService.getFolders();
				setFolders(updatedFolders);
				setCurrentFolderId(null);
			} catch (error) {
				console.error("[Toolbar] Failed to fetch folders:", error);
				showNotification("Failed to load folders.", "error");
			}
		},
		[setFolders, setCurrentFolderId, showNotification],
	);

	const handleDeleteFolder = useCallback(
		async (id: string): Promise<void> => {
			try {
				await folderService.deleteFolder(id);
				const updatedFolders = await folderService.getFolders();
				setFolders(updatedFolders);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to delete folder. Please try again.";
				showNotification(message, "error");
				throw error;
			}
		},
		[setFolders, showNotification],
	);

	const handleSaveImages = useCallback(async () => {
		if (capturedImages.length === 0 || isSavingImages) return;

		if (!currentFolderId) {
			showNotification("Please select a folder before saving.", "error");
			return;
		}

		setIsSavingImages(true);

		try {
			await imageService.saveImages(
				capturedImages.map((img) => ({
					folderId: currentFolderId,
					src: img.src,
				})),
			);

			clearCapturedImages();
			setIsPreviewOpen(false);
		} catch (error) {
			console.error("[Toolbar] Failed to save images:", error);
			const message =
				error instanceof Error
					? error.message
					: "Failed to save images. Please try again.";
			showNotification(message, "error");
			// Error stays in UI state for user to retry
		} finally {
			setIsSavingImages(false);
		}
	}, [
		capturedImages,
		currentFolderId,
		isSavingImages,
		setIsSavingImages,
		clearCapturedImages,
		setIsPreviewOpen,
		showNotification,
	]);

	const openWebsite = useCallback(() => {
		window.open(`${INSPO_SNAPS_DOMAIN}/my-folders`, "_blank");
	}, []);

	const openLogin = useCallback(() => {
		window.open(`${INSPO_SNAPS_DOMAIN}/login`, "_blank");
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
		<TooltipProvider>
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
				<div
					ref={portalContainerRef}
					className="flex flex-1 flex-col bg-background rounded-md overflow-hidden relative"
				>
					<div className="relative flex flex-1 flex-col overflow-hidden">
						<FolderMenu
							folders={folders}
							isMinimised={isMinimised}
							onCreateFolder={handleCreateFolder}
							onUpdateFolder={handleUpdateFolder}
							onDeleteFolder={handleDeleteFolder}
							onFolderSelect={setCurrentFolderId}
							onOrganizationChange={handleOrganizationChange}
						/>
						<Separator />

						{notification && (
							<div
								className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50"
								style={{
									maxWidth: MAXIMISED_WIDTH - 16,
								}}
							>
								<Notification
									notification={notification}
									onDismiss={dismissNotification}
								/>
							</div>
						)}
					</div>

					{isPreviewOpen && capturedImages.length > 0 && (
						<ImagePreviewPanel
							images={capturedImages}
							onClose={handlePreviewClose}
							onRemoveImage={handleRemoveImage}
						/>
					)}

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
								onRemove={removeLatestImage}
								onSave={handleSaveImages}
								isSaving={isSavingImages}
							/>
						</div>
					)}

					<div className="flex flex-1 max-h-9 min-h-9 overflow-hidden">
						{isAuthInitialized && !session ? (
							<ButtonGroup className="items-center">
								<Button
									variant="ghost"
									className="rounded-r-none"
									onClick={openLogin}
								>
									<HugeiconsIcon icon={Login01Icon} size={18} strokeWidth={2} />
									Login
								</Button>
							</ButtonGroup>
						) : (
							<ButtonGroup>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className={cn(
												!isMinimised && "rounded-tl-none",
												isInspecting && "text-primary hover:text-primary",
											)}
											onClick={toggleIsInspecting}
										>
											<HugeiconsIcon
												icon={Camera01Icon}
												size={18}
												strokeWidth={2}
											/>
										</Button>
									</TooltipTrigger>
									<TooltipContent
										container={portalContainerRef.current ?? undefined}
									>
										Capture Images
									</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											onClick={toggleFolderPanel}
										>
											<HugeiconsIcon
												icon={Folder01Icon}
												size={18}
												strokeWidth={2}
											/>
										</Button>
									</TooltipTrigger>
									<TooltipContent
										container={portalContainerRef.current ?? undefined}
									>
										Show Folders
									</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="rounded-r-none"
											onClick={openWebsite}
										>
											<HugeiconsIcon
												icon={LinkSquare02Icon}
												size={18}
												strokeWidth={2}
											/>
										</Button>
									</TooltipTrigger>
									<TooltipContent
										container={portalContainerRef.current ?? undefined}
									>
										View Collections
									</TooltipContent>
								</Tooltip>
							</ButtonGroup>
						)}

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
							<HugeiconsIcon
								icon={DragDropVerticalIcon}
								size={16}
								strokeWidth={3.5}
							/>
						</Button>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
};
