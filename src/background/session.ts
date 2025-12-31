import browser from "webextension-polyfill";
import { authClient } from "@/auth/auth-client";
import { SESSION_CACHE_KEY, SESSION_UPDATE_AGE_MS } from "@/lib/config";
import type { AuthSession } from "@/types/messages";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CachedSession {
	session: AuthSession | null;
	cachedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a session is expired (past expiresAt)
 */
export const isSessionExpired = (session: AuthSession | null): boolean => {
	if (!session) return true;
	const expiresAt = new Date(session.session.expiresAt).getTime();
	return Date.now() >= expiresAt;
};

/**
 * Check if a session needs refresh (past updatedAt + updateAge)
 */
export const needsRefresh = (session: AuthSession | null): boolean => {
	if (!session?.session.updatedAt) return false;
	const updatedAt = new Date(session.session.updatedAt).getTime();
	const refreshAt = updatedAt + SESSION_UPDATE_AGE_MS;
	return Date.now() >= refreshAt;
};

// ─────────────────────────────────────────────────────────────────────────────
// Cache Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get cached session from storage (returns null if expired)
 */
export const getCachedSession = async (): Promise<CachedSession | null> => {
	const result = await browser.storage.session.get(SESSION_CACHE_KEY);
	const cached = result[SESSION_CACHE_KEY] as CachedSession | undefined;

	if (!cached) return null;

	// Return null if session is fully expired
	if (isSessionExpired(cached.session)) {
		await clearCachedSession();
		return null;
	}

	return cached;
};

/**
 * Cache session to storage
 */
export const cacheSession = async (
	session: AuthSession | null,
): Promise<void> => {
	const cached: CachedSession = {
		session,
		cachedAt: Date.now(),
	};
	await browser.storage.session.set({ [SESSION_CACHE_KEY]: cached });
};

/**
 * Clear cached session from storage
 */
export const clearCachedSession = async (): Promise<void> => {
	await browser.storage.session.remove(SESSION_CACHE_KEY);
};

// ─────────────────────────────────────────────────────────────────────────────
// Session Fetching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Better Auth session response to our AuthSession type
 */
const toAuthSession = (data: {
	user: { id: string; name: string; email: string; image?: string | null };
	session: { id: string; expiresAt: Date; updatedAt: Date };
}): AuthSession => ({
	user: {
		id: data.user.id,
		name: data.user.name,
		email: data.user.email,
		image: data.user.image,
	},
	session: {
		id: data.session.id,
		expiresAt: data.session.expiresAt.toISOString(),
		updatedAt: data.session.updatedAt.toISOString(),
	},
});

/**
 * Fetch fresh session from server, cache it, and return
 */
export const fetchAndCacheSession = async (): Promise<{
	session: AuthSession | null;
	error?: { message: string };
}> => {
	const { data, error } = await authClient.getSession();

	if (error) {
		await clearCachedSession();
		return {
			session: null,
			error: { message: error.message || "Failed to get session" },
		};
	}

	if (!data) {
		await clearCachedSession();
		return { session: null };
	}

	const session = toAuthSession(data);
	await cacheSession(session);
	return { session };
};
