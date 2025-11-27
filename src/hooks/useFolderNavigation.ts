import { useCallback, useMemo, useState } from "react";
import type { Folder } from "@/types";

export const useFolderNavigation = (folders: Folder[] | null) => {
	const [currentPath, setCurrentPath] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState("");

	const currentFolder = useMemo(() => {
		if (!folders || currentPath.length === 0) return null;

		let current = folders;
		for (const id of currentPath) {
			const found = current.find((f) => f.id === id);
			if (!found) return null;
			current = found.folders;
		}
		return current;
	}, [folders, currentPath]);

	const breadcrumbs = useMemo(() => {
		if (!folders) return [];

		const crumbs: Array<{ id: string; name: string }> = [
			{ id: "", name: "All Folders" },
		];
		let current = folders;

		for (const id of currentPath) {
			const found = current.find((f) => f.id === id);
			if (!found) break;
			crumbs.push({ id: found.id, name: found.name });
			current = found.folders;
		}

		return crumbs;
	}, [folders, currentPath]);

	const navigateToFolder = useCallback((folderId: string | null) => {
		if (folderId === null) {
			setCurrentPath([]);
		} else {
			setCurrentPath((prev) => [...prev, folderId]);
		}
	}, []);

	const navigateBack = useCallback(() => {
		setCurrentPath((prev) => prev.slice(0, -1));
	}, []);

	const navigateToBreadcrumb = useCallback((index: number) => {
		setCurrentPath((prev) => prev.slice(0, index));
	}, []);

	return {
		currentPath,
		currentFolder,
		breadcrumbs,
		searchQuery,
		setSearchQuery,
		navigateToFolder,
		navigateBack,
		navigateToBreadcrumb,
	};
};
