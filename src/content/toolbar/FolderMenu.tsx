import { Command } from "cmdk";
import {
	ArrowLeft,
	ChevronRight,
	Folder as FolderIcon,
	Home,
	Loader2,
	Plus,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { flattenFolders } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type { FlattenedFolder, Folder } from "@/types";

export const FolderMenu = memo(function FolderMenu({
	folders,
	isMinimised = false,
	onCreateFolder,
}: {
	folders: Folder[] | null;
	isMinimised?: boolean;
	onCreateFolder?: (name: string, parentId: string | null) => Promise<string>;
}) {
	const [search, setSearch] = useState("");
	const [pages, setPages] = useState<string[]>([]); // Stack of folder IDs
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Build ID lookup map and parent map once - O(1) folder access instead of O(n) tree traversal
	const { folderMap, parentMap } = useMemo(() => {
		if (!folders) return { folderMap: new Map(), parentMap: new Map() };

		const fMap = new Map<string, Folder>();
		const pMap = new Map<string, string>(); // child ID -> parent ID

		const buildMaps = (
			folderList: Folder[],
			parentId: string | null = null,
		) => {
			for (const folder of folderList) {
				fMap.set(folder.id, folder);
				if (parentId) {
					pMap.set(folder.id, parentId);
				}
				if (folder.folders.length > 0) {
					buildMaps(folder.folders, folder.id);
				}
			}
		};

		buildMaps(folders);
		return { folderMap: fMap, parentMap: pMap };
	}, [folders]);

	// Build full path of folder IDs from root to target folder
	const getFullPath = (folderId: string): string[] => {
		const path: string[] = [];
		let currentId: string | undefined = folderId;

		while (currentId) {
			path.unshift(currentId);
			currentId = parentMap.get(currentId);
		}

		return path;
	};

	// Memoize flattened folders - only recalculates when folders array changes
	const flattenedFolders = useMemo(
		() => (folders ? flattenFolders(folders) : []),
		[folders],
	);

	// Get current folder based on navigation stack - O(1) lookup instead of O(n) traversal
	const currentFolder = useMemo(
		() =>
			pages.length > 0
				? (folderMap.get(pages[pages.length - 1]) ?? null)
				: null,
		[pages, folderMap],
	);

	// Get current folders to display - memoized to prevent unnecessary re-renders
	const currentFolders = useMemo(
		() => (currentFolder ? currentFolder.folders : (folders ?? [])),
		[currentFolder, folders],
	);

	// Build breadcrumb path with folder objects for navigation
	const breadcrumbPath = useMemo(() => {
		const path: Array<{ name: string; index: number }> = [
			{ name: "Home", index: -1 },
		];
		for (let i = 0; i < pages.length; i++) {
			const folder = folderMap.get(pages[i]);
			if (folder) {
				path.push({ name: folder.name, index: i });
			}
		}
		return path;
	}, [pages, folderMap]);

	// Navigate into a folder
	const navigateToFolder = (folderId: string) => {
		// If navigating from search, build the full path
		if (search) {
			setPages(getFullPath(folderId));
		} else {
			// Normal navigation - append to current path
			setPages((prev) => [...prev, folderId]);
		}
		setSearch(""); // Clear search when navigating

		// Refocus input after navigation
		setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
	};

	// Navigate to a specific breadcrumb level
	const navigateToBreadcrumb = (index: number) => {
		if (index === -1) {
			// Home - clear all navigation
			setPages([]);
		} else {
			// Navigate to specific level by slicing pages array
			setPages((prev) => prev.slice(0, index + 1));
		}

		// Exit creating folder mode if active
		if (isCreatingFolder) {
			setIsCreatingFolder(false);
		}
		setSearch("");

		// Refocus input after navigation
		setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
	};

	// Prepare to add a new folder - sets state and focuses input
	const handlePrepareAddFolder = () => {
		setIsCreatingFolder(true);
		setSearch("");
		setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
	};

	const handleBack = () => {
		setIsCreatingFolder(false);
		setSearch("");
		setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
	};

	// Create the new folder
	const handleCreateFolder = async () => {
		if (!search.trim() || !onCreateFolder || isSaving) return;

		// Get the parent folder ID (null if at root)
		const parentId = pages.length > 0 ? pages[pages.length - 1] : null;

		setIsSaving(true);

		try {
			// Call API and get the new folder ID
			const newFolderId = await onCreateFolder(search.trim(), parentId);

			// Navigate to the new folder
			setPages((prev) => [...prev, newFolderId]);

			// Reset state after creation
			setIsCreatingFolder(false);
			setSearch("");
			setTimeout(() => {
				inputRef.current?.focus();
			}, 0);
		} finally {
			setIsSaving(false);
		}
	};

	// Focus input when maximized
	useEffect(() => {
		if (!isMinimised && inputRef.current) {
			inputRef.current.focus();
		}

		if (listRef.current) {
			listRef.current.scrollTop = 0;
		}
	}, [isMinimised]);

	// Show loading state while folders are being fetched
	if (folders === null) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Loader2 className="animate-spin text-muted-foreground" size={24} />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"command-bar flex flex-col flex-1 min-h-0 transition-opacity duration-300",
				isMinimised ? "opacity-0" : "opacity-100",
			)}
		>
			<Command
				onKeyDown={(e) => {
					// Handle Enter to create folder
					if (e.key === "Enter" && isCreatingFolder && search.trim()) {
						e.preventDefault();
						handleCreateFolder();
						return;
					}

					const isEscape = e.key === "Escape";
					const isBackspaceWithoutSearch = e.key === "Backspace" && !search;
					if (!isEscape && !isBackspaceWithoutSearch) return;

					e.preventDefault();
					if (isEscape && search) {
						setSearch("");
					} else if (isCreatingFolder) {
						handleBack();
					} else {
						setPages((pages) => pages.slice(0, -1));
					}
				}}
			>
				<div className="flex items-center border-b border-border">
					{isCreatingFolder && (
						<Button
							variant="ghost"
							size="icon"
							className="w-7 h-7 ml-[9px]"
							onClick={handleBack}
						>
							<ArrowLeft size={14} />
						</Button>
					)}
					<Command.Input
						ref={inputRef}
						value={search}
						onValueChange={setSearch}
						placeholder={
							isCreatingFolder ? "New folder name..." : "Search Folders..."
						}
						className={cn("border-b-0", isCreatingFolder && "pl-[9px]")}
					/>
					{isSaving && (
						<Loader2
							className="animate-spin text-muted-foreground mr-3"
							size={16}
						/>
					)}
				</div>
				{(search.length === 0 || isCreatingFolder) && (
					<div className="px-4 py-3 border-b border-border">
						<Breadcrumb>
							<BreadcrumbList>
								{breadcrumbPath.map((item, idx) => {
									// When creating folder with text, no existing item is "last" - the new folder name will be
									const isCreatingWithText =
										isCreatingFolder && search.length > 0;
									const isLast =
										!isCreatingWithText && idx === breadcrumbPath.length - 1;
									const isHome = item.index === -1;

									return (
										<div key={item.index} className="contents">
											<BreadcrumbItem>
												{isLast ? (
													<BreadcrumbPage className="flex items-center gap-1.5">
														{isHome && <Home size={14} />}
														{item.name}
													</BreadcrumbPage>
												) : (
													<BreadcrumbLink
														onClick={() => navigateToBreadcrumb(item.index)}
														className="cursor-pointer flex items-center gap-1.5"
													>
														{isHome && <Home size={14} />}
														{item.name}
													</BreadcrumbLink>
												)}
											</BreadcrumbItem>
											{!isLast && <BreadcrumbSeparator />}
										</div>
									);
								})}
								{isCreatingFolder && search.length > 0 && (
									<BreadcrumbItem>
										<BreadcrumbPage className="flex items-center gap-1.5">
											{search}
										</BreadcrumbPage>
									</BreadcrumbItem>
								)}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				)}
				<Command.List ref={listRef}>
					{!isCreatingFolder && (
						<>
							<Command.Empty>No folders found.</Command.Empty>

							{search ? (
								// Search mode: Show all folders (flattened)
								<SearchView
									flattenedFolders={flattenedFolders}
									onSelect={navigateToFolder}
									onPrepareAddFolder={handlePrepareAddFolder}
								/>
							) : (
								// Normal mode: Show current folder's contents
								<FoldersView
									folders={currentFolders}
									onSelect={navigateToFolder}
									onPrepareAddFolder={handlePrepareAddFolder}
								/>
							)}
						</>
					)}
				</Command.List>
			</Command>
		</div>
	);
});

// SearchView: Shows all folders (flattened) when searching
function SearchView({
	flattenedFolders,
	onSelect,
	onPrepareAddFolder,
}: {
	flattenedFolders: FlattenedFolder[];
	onSelect: (folderId: string) => void;
	onPrepareAddFolder: () => void;
}) {
	return (
		<>
			<Command.Group heading="All Folders">
				{flattenedFolders.map(({ folder, path }) => {
					const parentPath = path.slice(0, -1);
					return (
						<Command.Item
							key={folder.id}
							value={`${folder.name} ${path.join(" ")}`}
							onSelect={() => onSelect(folder.id)}
						>
							<FolderIcon size={18} />
							{folder.name}

							{parentPath.length > 0 && (
								<div cmdk-shortcuts="">
									{parentPath.map((dir, idx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: directory doesn't have unique name
										<span key={idx} className="inline-flex items-center">
											{idx > 0 && <ChevronRight size={12} className="mx-0.5" />}
											{dir}
										</span>
									))}
								</div>
							)}
						</Command.Item>
					);
				})}
			</Command.Group>

			<Actions onPrepareAddFolder={onPrepareAddFolder} />
		</>
	);
}

// FoldersView: Pure presentational component - just renders the folders passed to it
function FoldersView({
	folders,
	onSelect,
	onPrepareAddFolder,
}: {
	folders: Folder[];
	onSelect: (folderId: string) => void;
	onPrepareAddFolder: () => void;
}) {
	return (
		<>
			{folders.length > 0 && (
				<Command.Group heading="Folders">
					{folders.map((folder) => (
						<Command.Item
							key={folder.id}
							value={folder.name}
							onSelect={() => onSelect(folder.id)}
						>
							<FolderIcon size={18} />
							{folder.name}
							{folder.folders.length > 0 && (
								<div cmdk-shortcuts="">{folder.folders.length}</div>
							)}
						</Command.Item>
					))}
				</Command.Group>
			)}

			<Actions onPrepareAddFolder={onPrepareAddFolder} />
		</>
	);
}

// Actions: Always shown at bottom of every page
function Actions({ onPrepareAddFolder }: { onPrepareAddFolder: () => void }) {
	return (
		<Command.Group heading="Actions">
			<Command.Item onSelect={onPrepareAddFolder}>
				<Plus size={18} />
				New Folder...
			</Command.Item>
		</Command.Group>
	);
}
