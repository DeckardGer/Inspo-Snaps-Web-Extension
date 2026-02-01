import {
	Add01Icon,
	ArrowDown01Icon,
	ArrowLeft01Icon,
	ArrowRight01Icon,
	Delete01Icon,
	Edit01Icon,
	Folder01Icon,
	Home01Icon,
	InformationCircleIcon,
	Loading01Icon,
	UserGroupIcon,
	UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Command } from "cmdk";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { flattenFolders } from "@/lib/transforms";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import type { FlattenedFolder, Folder } from "@/types";
import type { Organization } from "@/types/messages";

interface FolderMenuProps {
	folders: Folder[] | null;
	isMinimised?: boolean;
	onCreateFolder?: (name: string, parentId: string | null) => Promise<string>;
	onUpdateFolder?: (id: string, name: string) => Promise<void>;
	onDeleteFolder?: (id: string) => Promise<void>;
	onFolderSelect?: (folderId: string | null) => void;
	onOrganizationChange?: (organizationId: string | null) => void;
}

export const FolderMenu = memo(function FolderMenu({
	folders,
	isMinimised = false,
	onCreateFolder,
	onUpdateFolder,
	onDeleteFolder,
	onFolderSelect,
	onOrganizationChange,
}: FolderMenuProps) {
	const [search, setSearch] = useState("");
	const [pages, setPages] = useState<string[]>([]);
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [isRenamingFolder, setIsRenamingFolder] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const { organizations, activeOrganizationId, setActiveOrganizationId } =
		useOrganizationsStore();
	const session = useAuthStore((s) => s.session);
	const tier = session?.user.tier ?? "free";
	const showOrgSwitcher =
		tier === "free" && organizations && organizations.length > 0;

	const activeOrg = useMemo(
		() => organizations?.find((o) => o.id === activeOrganizationId) ?? null,
		[organizations, activeOrganizationId],
	);

	const handleOrgSelect = useCallback(
		(orgId: string | null) => {
			setActiveOrganizationId(orgId);
			setPages([]);
			setSearch("");
			onOrganizationChange?.(orgId);
		},
		[setActiveOrganizationId, onOrganizationChange],
	);

	// Helper to focus input after state changes
	const focusInput = useCallback((options?: { placeCursorAtEnd?: boolean }) => {
		setTimeout(() => {
			const input = inputRef.current;
			if (!input) return;
			input.focus();
			if (options?.placeCursorAtEnd) {
				const length = input.value.length;
				input.setSelectionRange(length, length);
			}
		}, 0);
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
		focusInput({ placeCursorAtEnd: true });
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
				<HugeiconsIcon
					icon={Loading01Icon}
					size={24}
					strokeWidth={2}
					className="animate-spin text-muted-foreground"
				/>
			</div>
		);
	}

	const showBreadcrumbs = !search || isCreatingFolder || isRenamingFolder;
	const isCreatingWithText = isCreatingFolder && search.length > 0;
	const isRenamingWithText = isRenamingFolder && search.length > 0;

	return (
		<div
			ref={containerRef}
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
							<HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
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
						<HugeiconsIcon
							icon={Loading01Icon}
							size={16}
							strokeWidth={2}
							className="animate-spin text-muted-foreground mr-3"
						/>
					)}
					{showOrgSwitcher && (
						<DropdownMenu modal={false}>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className={cn(
										"flex items-center gap-1 rounded-md transition-colors mr-2 shrink-0 px-2 h-7 max-w-[140px] outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-ring/50",
										"hover:bg-accent/80 data-[state=open]:bg-accent/80 text-muted-foreground hover:text-foreground data-[state=open]:text-foreground text-xs",
									)}
									aria-label="Switch workspace"
								>
									<span className="truncate">
										{activeOrg ? activeOrg.name : "Personal"}
									</span>
									<HugeiconsIcon
										icon={ArrowDown01Icon}
										size={12}
										strokeWidth={2}
										className="shrink-0"
									/>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="min-w-[180px]"
								container={containerRef.current ?? undefined}
							>
								<DropdownMenuItem
									onSelect={() => handleOrgSelect(null)}
									className={cn(activeOrganizationId === null && "bg-accent")}
								>
									<div className="flex size-5 items-center justify-center rounded-md border">
										<HugeiconsIcon
											icon={UserIcon}
											className="size-3 text-muted-foreground"
											strokeWidth={2}
										/>
									</div>
									Personal
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								{organizations?.map((org) => (
									<DropdownMenuItem
										key={org.id}
										disabled={org.role === "viewer"}
										onSelect={() => handleOrgSelect(org.id)}
										className={cn(
											activeOrganizationId === org.id && "bg-accent",
										)}
									>
										<OrgAvatar org={org} />
										<span className="truncate">{org.name}</span>
										{org.role === "viewer" && (
											<TooltipProvider delayDuration={200}>
												<Tooltip>
													<TooltipTrigger
														asChild
														onClick={(e) => e.preventDefault()}
													>
														<span className="ml-auto flex items-center pointer-events-auto">
															<HugeiconsIcon
																icon={InformationCircleIcon}
																className="size-3.5 text-muted-foreground"
																strokeWidth={2}
															/>
														</span>
													</TooltipTrigger>
													<TooltipContent
														container={containerRef.current ?? undefined}
													>
														Viewers can't access team folders from the
														extension.
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
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
														{isHome && (
															<HugeiconsIcon
																icon={Home01Icon}
																size={14}
																strokeWidth={2}
															/>
														)}
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
														{isHome && (
															<HugeiconsIcon
																icon={Home01Icon}
																size={14}
																strokeWidth={2}
															/>
														)}
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
							<HugeiconsIcon icon={Folder01Icon} size={18} strokeWidth={2} />
							<span cmdk-item-text="">{folder.name}</span>
							{parentPath.length > 0 && (
								<div cmdk-shortcuts="">
									{parentPath.map((dir, idx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: directory path has no unique ID
										<span key={idx} className="inline-flex items-center">
											{idx > 0 && (
												<HugeiconsIcon
													icon={ArrowRight01Icon}
													size={12}
													strokeWidth={2}
													className="mx-0.5"
												/>
											)}
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
							value={`${folder.name}-${folder.id}`}
							onSelect={() => onSelect(folder.id)}
						>
							<HugeiconsIcon icon={Folder01Icon} size={18} strokeWidth={2} />
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
				<HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={2} />
				<span cmdk-item-text="">New Folder...</span>
			</Command.Item>
			{currentFolderId && (
				<>
					<Command.Item onSelect={onPrepareRenameFolder}>
						<HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={2} />
						<span cmdk-item-text="">Rename Folder...</span>
					</Command.Item>
					<Command.Item onSelect={onDeleteFolder}>
						<HugeiconsIcon icon={Delete01Icon} size={18} strokeWidth={2} />
						<span cmdk-item-text="">Delete Folder...</span>
					</Command.Item>
				</>
			)}
		</Command.Group>
	);
}

// Organization switcher sub-components

function OrgAvatar({ org }: { org: Organization }) {
	return (
		<div className="flex size-5 items-center justify-center rounded-md border">
			{org.logo ? (
				<img
					src={org.logo}
					alt={org.name}
					className="size-full rounded-md object-cover"
				/>
			) : (
				<HugeiconsIcon
					icon={UserGroupIcon}
					className="size-3 text-muted-foreground"
					strokeWidth={2}
				/>
			)}
		</div>
	);
}
