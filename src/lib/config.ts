const env = import.meta.env.MODE as "development" | "production";

export type AppMode = "free" | "paid";

/**
 * Application mode configuration.
 * - "free": Uses local IndexedDB storage
 * - "paid": Uses API/backend storage (requires authentication)
 */
export const APP_MODE: AppMode = "free";

export const INSPO_SNAPS_DOMAIN =
	env === "development" ? "http://localhost:3000" : "https://insposnaps.com";
