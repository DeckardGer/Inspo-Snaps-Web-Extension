import {
	Camera,
	ExternalLink,
	Folder as FolderIcon,
	GripVertical,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import { saveToolbarCorner } from "@/content/index";
import { FolderMenu } from "@/content/toolbar/FolderMenu";
import { ImageSnapper } from "@/content/toolbar/ImageSnapper";
import {
	SAFE_ZONE,
	TOOLBAR_TIMING_FUNCTION,
	TOOLBAR_TRANSITION_DURATION,
} from "@/lib/constants";
import {
	calculatePosition,
	getBestCorner,
	getToolbarSize,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { Corner, Folder } from "@/types";

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
	const corner = useRef<Corner>(initialCorner);

	const [isMinimised, setIsMinimised] = useState(true);
	const [folders, setFolders] = useState<Folder[] | null>(null);

	// Fetch folders on mount
	useEffect(() => {
		fetchFolders().then(setFolders);
	}, []);

	const openWebsite = () => {
		window.open("https://insposnaps.com", "_blank");
	};

	const toggleFolders = () => {
		if (!toolbarRef.current) return;
		toolbarRef.current.style.transition = `all ${TOOLBAR_TRANSITION_DURATION} ${TOOLBAR_TIMING_FUNCTION}`;

		const { width, height } = getToolbarSize(!isMinimised);

		const { x, y } = calculatePosition(corner.current, width, height);

		position.current = { x, y };
		toolbarRef.current.style.transform = `translate(${x}px, ${y}px)`;

		setIsMinimised(!isMinimised);
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
			toolbarRef.current.style.transition = `transform ${TOOLBAR_TRANSITION_DURATION} ${TOOLBAR_TIMING_FUNCTION}`;

			const bestCorner = getBestCorner(
				e.clientX,
				e.clientY,
				dragStartPos.current.x,
				dragStartPos.current.y,
			);
			corner.current = bestCorner;
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
			const { x, y } = calculatePosition(corner.current, width, height);

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
	}, [isMinimised]);

	return (
		<>
			<ImageSnapper />
			<div
				ref={toolbarRef}
				className="flex fixed inset-0 select-none touch-none opacity-0 shadow-2xl animate-fade-in z-999999999 backdrop-blur-sm rounded-[7px] border border-border-outside"
				style={{
					width: getToolbarSize(isMinimised).width,
					maxWidth: `calc(100vw - ${SAFE_ZONE * 2}px)`,
					height: getToolbarSize(isMinimised).height,
					maxHeight: `calc(100vh - ${SAFE_ZONE * 2}px)`,
				}}
			>
				<div className="flex flex-1 flex-col bg-background rounded-md overflow-hidden">
					<div className="flex flex-1 flex-col overflow-hidden">
						<FolderMenu folders={folders} isMinimised={isMinimised} />
						<Separator />
					</div>
					<div className="flex flex-1 max-h-9 min-h-9 overflow-hidden">
						<ButtonGroup>
							<Button
								variant="ghost"
								size="icon"
								className={isMinimised ? "" : "rounded-tl-none"}
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
								isMinimised ? "" : "rounded-tr-none",
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
