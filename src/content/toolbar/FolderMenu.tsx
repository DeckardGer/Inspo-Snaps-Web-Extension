import { Command } from "cmdk";
import {
	ArrowLeft,
	ChevronRight,
	Folder as FolderIcon,
	Home,
	Loader2,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { flattenFolders } from "@/lib/transforms";
import { cn } from "@/lib/utils";
import type { FlattenedFolder, Folder } from "@/types";

interface FolderMenuProps {
	folders: Folder[] | null;
	isMinimised?: boolean;
	onCreateFolder?: (name: string, parentId: string | null) => Promise<string>;
	onUpdateFolder?: (id: string, name: string) => Promise<void>;
	onDeleteFolder?: (id: string) => Promise<void>;
	onFolderSelect?: (folderId: string | null) => void;
}

export const FolderMenu = memo(function FolderMenu({
	folders,
	isMinimised = false,
	onCreateFolder,
	onUpdateFolder,
	onDeleteFolder,
	onFolderSelect,
}: FolderMenuProps) {
	const [search, setSearch] = useState("");
	const [pages, setPages] = useState<string[]>([]);
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [isRenamingFolder, setIsRenamingFolder] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Helper to focus input after state changes
	const focusInput = useCallback(() => {
		setTimeout(() => inputRef.current?.focus(), 0);
	}, []);

	// Helper to reset to normal browsing state
	const resetToNormalState = useCallback(() => {
		setIsCreatingFolder(false);
		setIsRenamingFolder(false);
		setSearch("");
		focusInput();
	}, [focusInput]);

	// Build ID lookup and parent maps for O(1) folder access
	const { folderMap, parentMap } = useMemo(() => {
		if (!folders) return { folderMap: new Map(), parentMap: new Map() };

		const folderMap = new Map<string, Folder>();
		const parentMap = new Map<string, string>();

		const buildMaps = (
			folderList: Folder[],
			parentId: string | null = null,
		) => {
			for (const folder of folderList) {
				folderMap.set(folder.id, folder);
				if (parentId) parentMap.set(folder.id, parentId);
				if (folder.folders.length > 0) buildMaps(folder.folders, folder.id);
			}
		};

		buildMaps(folders);
		return { folderMap, parentMap };
	}, [folders]);

	// Build full path of folder IDs from root to target folder
	const getFullPath = useCallback(
		(folderId: string): string[] => {
			const path: string[] = [];
			let currentId: string | undefined = folderId;
			while (currentId) {
				path.unshift(currentId);
				currentId = parentMap.get(currentId);
			}
			return path;
		},
		[parentMap],
	);

	// Derived state
	const flattenedFolders = useMemo(
		() => (folders ? flattenFolders(folders) : []),
		[folders],
	);

	const currentFolderId = pages.at(-1);

	const currentFolder = useMemo(
		() => (currentFolderId ? (folderMap.get(currentFolderId) ?? null) : null),
		[currentFolderId, folderMap],
	);

	const currentFolders = useMemo(
		() => currentFolder?.folders ?? folders ?? [],
		[currentFolder, folders],
	);

	const breadcrumbPath = useMemo(() => {
		const path: Array<{ name: string; index: number }> = [
			{ name: "Home", index: -1 },
		];
		pages.forEach((pageId, i) => {
			const folder = folderMap.get(pageId);
			if (folder) path.push({ name: folder.name, index: i });
		});
		return path;
	}, [pages, folderMap]);

	// Navigation handlers
	const navigateToFolder = (folderId: string) => {
		setPages(search ? getFullPath(folderId) : (prev) => [...prev, folderId]);
		setSearch("");
		focusInput();
	};

	const navigateToBreadcrumb = (index: number) => {
		setPages(index === -1 ? [] : (prev) => prev.slice(0, index + 1));
		resetToNormalState();
	};

	// Folder creation handlers
	const handlePrepareAddFolder = () => {
		setIsCreatingFolder(true);
		setSearch("");
		focusInput();
	};

	const handleCreateFolder = useCallback(async () => {
		if (!search.trim() || !onCreateFolder || isSaving) return;

		const parentId = currentFolderId ?? null;
		setIsSaving(true);

		try {
			const newFolderId = await onCreateFolder(search.trim(), parentId);
			setPages((prev) => [...prev, newFolderId]);
			resetToNormalState();
		} finally {
			setIsSaving(false);
		}
	}, [search, onCreateFolder, isSaving, currentFolderId, resetToNormalState]);

	// Folder rename handlers
	const handlePrepareRenameFolder = () => {
		if (!currentFolderId) return;
		setIsRenamingFolder(true);
		setSearch(currentFolder?.name ?? "");
		focusInput();
	};

	const handleRenameFolder = useCallback(async () => {
		if (!search.trim() || !onUpdateFolder || !currentFolderId || isSaving)
			return;

		setIsSaving(true);

		try {
			await onUpdateFolder(currentFolderId, search.trim());
			resetToNormalState();
		} finally {
			setIsSaving(false);
		}
	}, [search, onUpdateFolder, currentFolderId, isSaving, resetToNormalState]);

	// Folder delete handler
	const handleDeleteFolder = useCallback(async () => {
		if (!onDeleteFolder || !currentFolderId || isSaving) return;

		setIsSaving(true);

		try {
			await onDeleteFolder(currentFolderId);
			// Navigate back to parent after successful deletion
			setPages((prev) => prev.slice(0, -1));
		} catch (error) {
			console.error("[FolderMenu] Failed to delete folder:", error);
			// Error is already displayed to the user via the service
		} finally {
			setIsSaving(false);
		}
	}, [onDeleteFolder, currentFolderId, isSaving]);

	// Keyboard handler
	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Enter: create or rename folder
		if (e.key === "Enter" && search.trim()) {
			e.preventDefault();
			if (isCreatingFolder) {
				handleCreateFolder();
			} else if (isRenamingFolder) {
				handleRenameFolder();
			}
			return;
		}

		// Escape: clear search or exit creating/renaming mode or go back
		if (e.key === "Escape") {
			e.preventDefault();
			if (search) {
				setSearch("");
			} else if (isCreatingFolder || isRenamingFolder) {
				resetToNormalState();
			} else {
				setPages((prev) => prev.slice(0, -1));
			}
			return;
		}

		// Backspace without search: exit creating/renaming mode or go back
		if (e.key === "Backspace" && !search) {
			e.preventDefault();
			if (isCreatingFolder || isRenamingFolder) {
				resetToNormalState();
			} else {
				setPages((prev) => prev.slice(0, -1));
			}
		}
	};

	// Focus input when maximized
	useEffect(() => {
		if (!isMinimised) {
			inputRef.current?.focus();

			if (listRef.current) {
				listRef.current.scrollTop = 0;
			}
		}
	}, [isMinimised]);

	// Notify parent of folder selection changes
	useEffect(() => {
		onFolderSelect?.(currentFolderId ?? null);
	}, [currentFolderId, onFolderSelect]);

	// Loading state
	if (folders === null) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Loader2 className="animate-spin text-muted-foreground" size={24} />
			</div>
		);
	}

	const showBreadcrumbs = !search || isCreatingFolder || isRenamingFolder;
	const isCreatingWithText = isCreatingFolder && search.length > 0;
	const isRenamingWithText = isRenamingFolder && search.length > 0;

	return (
		<div
			className={cn(
				"command-bar flex flex-col flex-1 min-h-0 transition-opacity duration-300",
				isMinimised ? "opacity-0" : "opacity-100",
			)}
		>
			<Command onKeyDown={handleKeyDown}>
				{/* Input area */}
				<div className="flex items-center border-b border-border">
					{(isCreatingFolder || isRenamingFolder) && (
						<Button
							variant="ghost"
							size="icon"
							className="w-7 h-7 ml-[9px]"
							onClick={resetToNormalState}
						>
							<ArrowLeft size={14} />
						</Button>
					)}
					<Command.Input
						ref={inputRef}
						value={search}
						onValueChange={setSearch}
						placeholder={
							isCreatingFolder
								? "New folder name..."
								: isRenamingFolder
									? "Rename folder..."
									: "Search Folders..."
						}
						className={cn(
							"border-b-0",
							(isCreatingFolder || isRenamingFolder) && "pl-[9px]",
						)}
					/>
					{isSaving && (
						<Loader2
							className="animate-spin text-muted-foreground mr-3"
							size={16}
						/>
					)}
				</div>

				{/* Breadcrumbs */}
				{showBreadcrumbs && (
					<div className="px-4 py-3 border-b border-border">
						<Breadcrumb>
							<BreadcrumbList>
								{breadcrumbPath.map((item, idx) => {
									const isLast =
										!isCreatingWithText &&
										!isRenamingWithText &&
										idx === breadcrumbPath.length - 1;
									const isHome = item.index === -1;
									const isBeingRenamed =
										isRenamingWithText && idx === breadcrumbPath.length - 1;

									return (
										<div key={item.index} className="contents">
											<BreadcrumbItem>
												{isLast ? (
													<BreadcrumbPage className="flex items-center gap-1.5">
														{isHome && <Home size={14} />}
														{item.name}
													</BreadcrumbPage>
												) : isBeingRenamed ? (
													<BreadcrumbPage className="flex items-center gap-1.5">
														{search}
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
											{!isLast && !isBeingRenamed && <BreadcrumbSeparator />}
										</div>
									);
								})}
								{isCreatingWithText && (
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

				{/* Folder list */}
				<Command.List ref={listRef}>
					{!isCreatingFolder && !isRenamingFolder && (
						<>
							<Command.Empty>No folders found.</Command.Empty>
							{search ? (
								<SearchView
									flattenedFolders={flattenedFolders}
									onSelect={navigateToFolder}
									onPrepareAddFolder={handlePrepareAddFolder}
									onPrepareRenameFolder={handlePrepareRenameFolder}
									onDeleteFolder={handleDeleteFolder}
									currentFolderId={currentFolderId}
								/>
							) : (
								<FoldersView
									folders={currentFolders}
									onSelect={navigateToFolder}
									onPrepareAddFolder={handlePrepareAddFolder}
									onPrepareRenameFolder={handlePrepareRenameFolder}
									onDeleteFolder={handleDeleteFolder}
									currentFolderId={currentFolderId}
								/>
							)}
						</>
					)}
				</Command.List>
			</Command>
		</div>
	);
});

// Sub-components

interface FolderListProps {
	onSelect: (folderId: string) => void;
	onPrepareAddFolder: () => void;
	onPrepareRenameFolder: () => void;
	onDeleteFolder: () => void;
	currentFolderId: string | undefined;
}

function SearchView({
	flattenedFolders,
	onSelect,
	onPrepareAddFolder,
	onPrepareRenameFolder,
	onDeleteFolder,
	currentFolderId,
}: FolderListProps & { flattenedFolders: FlattenedFolder[] }) {
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
							<span cmdk-item-text="">{folder.name}</span>
							{parentPath.length > 0 && (
								<div cmdk-shortcuts="">
									{parentPath.map((dir, idx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: directory path has no unique ID
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
			<Actions
				onPrepareAddFolder={onPrepareAddFolder}
				onPrepareRenameFolder={onPrepareRenameFolder}
				onDeleteFolder={onDeleteFolder}
				currentFolderId={currentFolderId}
			/>
		</>
	);
}

function FoldersView({
	folders,
	onSelect,
	onPrepareAddFolder,
	onPrepareRenameFolder,
	onDeleteFolder,
	currentFolderId,
}: FolderListProps & { folders: Folder[] }) {
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
							<span cmdk-item-text="">{folder.name}</span>
							{folder.folders.length > 0 && (
								<div cmdk-shortcuts="">{folder.folders.length}</div>
							)}
						</Command.Item>
					))}
				</Command.Group>
			)}
			<Actions
				onPrepareAddFolder={onPrepareAddFolder}
				onPrepareRenameFolder={onPrepareRenameFolder}
				onDeleteFolder={onDeleteFolder}
				currentFolderId={currentFolderId}
			/>
		</>
	);
}

function Actions({
	onPrepareAddFolder,
	onPrepareRenameFolder,
	onDeleteFolder,
	currentFolderId,
}: {
	onPrepareAddFolder: () => void;
	onPrepareRenameFolder: () => void;
	onDeleteFolder: () => void;
	currentFolderId: string | undefined;
}) {
	return (
		<Command.Group heading="Actions">
			<Command.Item onSelect={onPrepareAddFolder}>
				<Plus size={18} />
				<span cmdk-item-text="">New Folder...</span>
			</Command.Item>
			{currentFolderId && (
				<>
					<Command.Item onSelect={onPrepareRenameFolder}>
						<Pencil size={18} />
						<span cmdk-item-text="">Rename Folder...</span>
					</Command.Item>
					<Command.Item onSelect={onDeleteFolder}>
						<Trash2 size={18} />
						<span cmdk-item-text="">Delete Folder...</span>
					</Command.Item>
				</>
			)}
		</Command.Group>
	);
}
