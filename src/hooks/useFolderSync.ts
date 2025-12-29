import { useEffect } from "react";
import browser from "webextension-polyfill";
import { getFolderService } from "@/services/folders";
import { useFoldersStore } from "@/store/foldersStore";
import type { Message } from "@/types";

export const useFolderSync = () => {
	const { setFolders } = useFoldersStore();

	// Initial fetch
	useEffect(() => {
		const folderService = getFolderService();
		folderService.getFolders().then(setFolders);
	}, [setFolders]);

	// Listen for changes from other tabs
	useEffect(() => {
		const handleMessage = (message: Message) => {
			if (message.type === "FOLDERS_CHANGED") {
				console.log("[Toolbar] Folders changed in another tab, refetching...");
				const folderService = getFolderService();
				folderService.getFolders().then(setFolders);
			} else if (message.type === "IMAGES_CHANGED") {
				console.log("[Toolbar] Images changed in another tab");
			}
		};

		browser.runtime.onMessage.addListener(handleMessage);

		return () => {
			browser.runtime.onMessage.removeListener(handleMessage);
		};
	}, [setFolders]);
};
