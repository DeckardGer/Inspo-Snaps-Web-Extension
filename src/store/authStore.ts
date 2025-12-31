import browser from "webextension-polyfill";
import { create } from "zustand";
import type { AuthSession } from "@/types/messages";

interface AuthState {
	// State
	session: AuthSession | null;
	isInitialized: boolean;

	// Actions
	setSession: (session: AuthSession | null) => void;
	setInitialized: () => void;
	isSessionValid: () => boolean;
	refreshSession: () => Promise<void>;
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

	refreshSession: async () => {
		try {
			const response = await browser.runtime.sendMessage({
				type: "AUTH_REFRESH_SESSION",
			});

			if (response.success) {
				set({ session: response.data.session });
			} else {
				set({ session: null });
			}
		} catch (error) {
			console.error("[AuthStore] Failed to refresh session:", error);
			set({ session: null });
		}
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
		console.error("[AuthStore] Failed to initialize auth:", error);
		useAuthStore.getState().setInitialized();
		return null;
	}
};
