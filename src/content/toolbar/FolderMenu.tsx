import { Command } from "cmdk";
import { Folder as FolderIcon, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flattenFolders } from "@/lib/helpers";
import type { FlattenedFolder, Folder } from "@/types";

// Sample data for testing - replace with API data
const SAMPLE_FOLDERS: Folder[] = [
	{
		name: "Folder 1",
		id: "folder-1",
		folders: [
			{
				name: "Folder 1 A",
				id: "folder-1-a",
				folders: [],
			},
			{
				name: "Folder 1 B",
				id: "folder-1-b",
				folders: [
					{
						name: "Folder 1 B A",
						id: "folder-1-b-a",
						folders: [],
					},
					{
						name: "Folder 1 B B",
						id: "folder-1-b-b",
						folders: [],
					},
					{
						name: "Folder 1 B C",
						id: "folder-1-b-c",
						folders: [],
					},
				],
			},
			{
				name: "Folder 1 C",
				id: "folder-1-c",
				folders: [],
			},
		],
	},
	{
		name: "Folder 2",
		id: "folder-2",
		folders: [],
	},
	{
		name: "Folder 3",
		id: "folder-3",
		folders: [],
	},
	{
		name: "Folder 4",
		id: "folder-4",
		folders: [],
	},
	{
		name: "Folder 5",
		id: "folder-5",
		folders: [],
	},
	{
		name: "Folder 6",
		id: "folder-6",
		folders: [],
	},
];

// Utility: Find folder by ID in tree
function findFolderById(folders: Folder[], id: string): Folder | null {
	for (const folder of folders) {
		if (folder.id === id) return folder;
		if (folder.folders.length > 0) {
			const found = findFolderById(folder.folders, id);
			if (found) return found;
		}
	}
	return null;
}

/**
 * FolderMenu component for folder navigation
 *
 * Usage with API data:
 * ```tsx
 * function MyComponent() {
 *   const { data: folders } = useQuery(['folders'], fetchFolders);
 *   return <FolderMenu folders={folders || []} />;
 * }
 * ```
 *
 * The `flattenFolders` function is memoized and will only re-run when
 * the `folders` array reference changes.
 */
export const FolderMenu = ({
	folders = SAMPLE_FOLDERS,
	isMinimised = false,
}: {
	folders?: Folder[];
	isMinimised?: boolean;
}) => {
	const [search, setSearch] = useState("");
	const [pages, setPages] = useState<string[]>([]); // Stack of folder IDs
	const inputRef = useRef<HTMLInputElement>(null);

	// Memoize flattened folders - only recalculates when folders array changes
	const flattenedFolders = useMemo(() => flattenFolders(folders), [folders]);

	// Get current folder based on navigation stack
	const currentFolder =
		pages.length > 0 ? findFolderById(folders, pages[pages.length - 1]) : null;

	// Get current folders to display
	const currentFolders = currentFolder ? currentFolder.folders : folders;

	// // Build breadcrumb path
	// const breadcrumbPath = useMemo(() => {
	// 	const path: string[] = ["Home"];
	// 	for (const folderId of pages) {
	// 		const folder = findFolderById(folders, folderId);
	// 		if (folder) path.push(folder.name);
	// 	}
	// 	return path;
	// }, [pages, folders]);

	// Navigate into a folder
	const navigateToFolder = (folderId: string) => {
		setPages((prev) => [...prev, folderId]);
		setSearch(""); // Clear search when navigating
	};

	// Focus input when maximized
	useEffect(() => {
		if (!isMinimised && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isMinimised]);

	return (
		<div className="command-bar flex flex-col flex-1 min-h-0">
			<Command
				onKeyDown={(e) => {
					if (e.key === "Escape" || (e.key === "Backspace" && !search)) {
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
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>

					{/* {!search && pages.length > 0 && (
					<div
						style={{
							padding: "8px 16px",
							fontSize: "12px",
							opacity: 0.6,
							borderBottom: "1px solid var(--gray6)",
							marginBottom: "8px",
						}}
					>
						{breadcrumbPath.join(" / ")}
					</div>
				)} */}

					{/* {search ? (
					// Search mode: Show all folders (flattened)
					<SearchView
						flattenedFolders={flattenedFolders}
						onSelect={navigateToFolder}
					/>
				) : (
					// Normal mode: Show current folder's contents
					<FolderView folders={currentFolders} onSelect={navigateToFolder} />
				)} */}
					<FoldersView />
				</Command.List>
			</Command>
		</div>
	);
};

// FolderView: Shows folders in the current directory
function FolderView({
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
								<span
									style={{ marginLeft: "auto", opacity: 0.5, fontSize: "12px" }}
								>
									{folder.folders.length}
								</span>
							)}
						</Command.Item>
					))}
				</Command.Group>
			)}

			<Actions />
		</>
	);
}

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
				{flattenedFolders.map(({ folder, path }) => (
					<Command.Item
						key={folder.id}
						value={`${folder.name} ${path.join(" ")}`}
						onSelect={() => onSelect(folder.id)}
					>
						<FolderIcon size={18} />
						<div
							style={{ display: "flex", flexDirection: "column", gap: "2px" }}
						>
							<span>{folder.name}</span>
							<span style={{ fontSize: "11px", opacity: 0.5 }}>
								{path.slice(0, -1).join(" / ")}
							</span>
						</div>
					</Command.Item>
				))}
			</Command.Group>

			<Actions />
		</>
	);
}

function FoldersView() {
	return (
		<>
			<Command.Group heading="Folders">
				<Command.Item>
					<FolderIcon size={18} />
					Folder 1
				</Command.Item>
				<Command.Item>
					<FolderIcon size={18} />
					Folder 2
				</Command.Item>
				<Command.Item>
					<FolderIcon size={18} />
					Folder 3
				</Command.Item>
				<Command.Item>
					<FolderIcon size={18} />
					Folder 4
				</Command.Item>
				<Command.Item>
					<FolderIcon size={18} />
					Folder 5
				</Command.Item>
			</Command.Group>

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
