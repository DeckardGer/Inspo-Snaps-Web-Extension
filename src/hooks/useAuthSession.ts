import { useCallback, useEffect, useState } from "react";
import browser from "webextension-polyfill";
import type { AuthGetSessionResponse, AuthSession } from "@/types/messages";

interface UseAuthSessionReturn {
	session: AuthSession | null;
	isLoading: boolean;
	error: Error | null;
	refetch: () => Promise<void>;
}

/**
 * React hook to get the current auth session via the background script.
 * This avoids CORS issues when running in content scripts.
 */
export function useAuthSession(): UseAuthSessionReturn {
	const [session, setSession] = useState<AuthSession | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchSession = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = (await browser.runtime.sendMessage({
				type: "AUTH_GET_SESSION",
			})) as AuthGetSessionResponse;

			if (response.success) {
				setSession(response.data.session);
			} else {
				setError(new Error(response.error.message));
			}
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Unknown error"));
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSession();
	}, [fetchSession]);

	return {
		session,
		isLoading,
		error,
		refetch: fetchSession,
	};
}
