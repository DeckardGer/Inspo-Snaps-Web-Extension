const env = import.meta.env.MODE as "development" | "production";

export const INSPO_SNAPS_DOMAIN =
	env === "development" ? "http://localhost:3000" : "https://insposnaps.com";

export const ENABLED_SITES_KEY = "enabledSites";
export const SESSION_CACHE_KEY = "authSession";

// How long after updatedAt before the session should be refreshed (matches Better Auth updateAge)
export const SESSION_UPDATE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
