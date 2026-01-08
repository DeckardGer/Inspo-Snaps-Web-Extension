import { useEffect } from "react";
import browser from "webextension-polyfill";
import { folderService } from "@/services/folders";
import { useAuthStore } from "@/store/authStore";
import { useFoldersStore } from "@/store/foldersStore";
import type { Message } from "@/types";

export const useFolderSync = () => {
	const { setFolders } = useFoldersStore();
	const session = useAuthStore((state) => state.session);
	const tier = session?.user.tier ?? "free";

	// Fetch folders when auth changes or on initial mount
	useEffect(() => {
		// Only fetch from API if logged in with paid tier
		// Free tier uses local storage and works without auth
		if (tier !== "free" && !session) {
			// Paid tier but not logged in - show empty state
			setFolders([]);
			return;
		}

		folderService
			.getFolders()
			.then(setFolders)
			.catch((error) => {
				console.error("[FolderSync] Failed to fetch folders:", error);
				setFolders([]); // Show empty state on error instead of infinite loading
			});
	}, [session, tier, setFolders]);

	// Listen for changes from other tabs
	useEffect(() => {
		const handleMessage = (message: Message) => {
			if (message.type === "FOLDERS_CHANGED") {
				console.log(
					"[FolderSync] Folders changed in another tab, refetching...",
				);
				folderService.getFolders().then(setFolders).catch(console.error);
			} else if (message.type === "AUTH_SESSION_UPDATED") {
				// Auth changed - the session useEffect will handle refetching
				console.log("[FolderSync] Auth session updated");
			}
		};

		browser.runtime.onMessage.addListener(handleMessage);

		return () => {
			browser.runtime.onMessage.removeListener(handleMessage);
		};
	}, [setFolders]);
};
