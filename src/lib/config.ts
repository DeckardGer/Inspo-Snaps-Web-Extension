export type AppMode = "free" | "paid";

/**
 * Application mode configuration.
 * - "free": Uses local IndexedDB storage
 * - "paid": Uses API/backend storage (requires authentication)
 */
export const APP_MODE: AppMode = "free";
