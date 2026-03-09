import browser from "webextension-polyfill";
import { create } from "zustand";
import { logger } from "@/lib/logger";
import type { AuthSession } from "@/types/messages";

interface AuthState {
	// State
	session: AuthSession | null;
	isInitialized: boolean;

	// Actions
	setSession: (session: AuthSession | null) => void;
	setInitialized: () => void;
	isSessionValid: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	session: null,
	isInitialized: false,

	setSession: (session) => set({ session }),

	setInitialized: () => set({ isInitialized: true }),

	isSessionValid: () => {
		const { session } = get();
		if (!session) return false;
		const expiresAt = new Date(session.session.expiresAt).getTime();
		return Date.now() < expiresAt;
	},
}));

/**
 * Initialize auth from session.
 * Call this BEFORE mounting toolbar.
 * Uses AUTH_GET_SESSION which checks if refresh is needed.
 */
export const initializeAuth = async (): Promise<AuthSession | null> => {
	try {
		const response = await browser.runtime.sendMessage({
			type: "AUTH_GET_SESSION",
		});

		const session = response.success ? response.data.session : null;

		useAuthStore.getState().setSession(session);
		useAuthStore.getState().setInitialized();

		return session;
	} catch (error) {
		logger.error("[AuthStore] Failed to initialize auth:", error);
		useAuthStore.getState().setInitialized();
		return null;
	}
};
