import { Command } from "cmdk";
import {
	ChevronRight,
	Folder as FolderIcon,
	Home,
	Loader2,
	Plus,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { flattenFolders } from "@/lib/helpers";
import type { FlattenedFolder, Folder } from "@/types";

export const FolderMenu = ({
	folders,
	isMinimised = false,
}: {
	folders: Folder[] | null;
	isMinimised?: boolean;
}) => {
	const [search, setSearch] = useState("");
	const [pages, setPages] = useState<string[]>([]); // Stack of folder IDs
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

		// Refocus input after navigation
		setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
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
		<div className="command-bar flex flex-col flex-1 min-h-0">
			<Command
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						e.preventDefault();
						if (search) {
							setSearch("");
						} else {
							setPages((pages) => pages.slice(0, -1));
						}
					} else if (e.key === "Backspace" && !search) {
						e.preventDefault();
						setPages((pages) => pages.slice(0, -1));
					}
				}}
			>
				<Command.Input
					ref={inputRef}
					value={search}
					onValueChange={setSearch}
					placeholder="Search Folders..."
				/>
				{search.length === 0 && (
					<div className="px-4 py-3 border-b border-border">
						<Breadcrumb>
							<BreadcrumbList>
								{breadcrumbPath.map((item, idx) => {
									const isLast = idx === breadcrumbPath.length - 1;
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
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				)}
				<Command.List ref={listRef}>
					<Command.Empty>No folders found.</Command.Empty>

					{search ? (
						// Search mode: Show all folders (flattened)
						<SearchView
							flattenedFolders={flattenedFolders}
							onSelect={navigateToFolder}
						/>
					) : (
						// Normal mode: Show current folder's contents
						<FoldersView folders={currentFolders} onSelect={navigateToFolder} />
					)}
				</Command.List>
			</Command>
		</div>
	);
};

// SearchView: Shows all folders (flattened) when searching
function SearchView({
	flattenedFolders,
	onSelect,
}: {
	flattenedFolders: FlattenedFolder[];
	onSelect: (folderId: string) => void;
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

			<Actions />
		</>
	);
}

// FoldersView: Pure presentational component - just renders the folders passed to it
function FoldersView({
	folders,
	onSelect,
}: {
	folders: Folder[];
	onSelect: (folderId: string) => void;
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

			<Actions />
		</>
	);
}

// Actions: Always shown at bottom of every page
function Actions() {
	return (
		<Command.Group heading="Actions">
			<Command.Item>
				<Plus size={18} />
				New Folder...
			</Command.Item>
		</Command.Group>
	);
}
