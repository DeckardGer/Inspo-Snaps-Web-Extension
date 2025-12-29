import { useCallback, useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type { AuthGetSessionResponse, AuthSession } from "@/types/messages";

interface UseAuthSessionReturn {
	session: AuthSession | null;
	isLoading: boolean;
	error: Error | null;
	refetch: (forceRefresh?: boolean) => Promise<void>;
	clearSession: () => Promise<void>;
}

/**
 * React hook to get the current auth session via the background script.
 * This avoids CORS issues when running in content scripts.
 * Sessions are cached in chrome.storage.session and shared across tabs.
 */
export function useAuthSession(): UseAuthSessionReturn {
	const [session, setSession] = useState<AuthSession | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchSession = useCallback(async (forceRefresh = false) => {
		setIsLoading(true);
		setError(null);

		try {
			const response = (await browser.runtime.sendMessage({
				type: "AUTH_GET_SESSION",
				payload: { forceRefresh },
			})) as AuthGetSessionResponse;

			if (response.success) {
				setSession(response.data.session);
			} else {
				setError(new Error(response.error.message));
				setSession(null);
			}
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Unknown error"));
			setSession(null);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const clearSession = useCallback(async () => {
		await browser.runtime.sendMessage({ type: "AUTH_CLEAR_SESSION" });
		setSession(null);
	}, []);

	useEffect(() => {
		fetchSession();
	}, [fetchSession]);

	return {
		session,
		isLoading,
		error,
		refetch: fetchSession,
		clearSession,
	};
}
