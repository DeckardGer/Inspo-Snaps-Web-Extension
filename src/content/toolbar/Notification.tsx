import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification as NotificationType } from "@/store/toolbarStore";

interface NotificationProps {
	notification: NotificationType;
	onDismiss: () => void;
	autoClose?: boolean;
	autoCloseDelay?: number;
}

export const Notification = ({
	notification,
	onDismiss,
	autoClose = true,
	autoCloseDelay = 3000,
}: NotificationProps) => {
	// Auto-close notification after delay
	useEffect(() => {
		if (!autoClose) return;

		const currentNotificationId = notification.id;
		const timeout = setTimeout(() => {
			// Bail if a newer notification replaced this one before the timeout fires
			if (notification.id !== currentNotificationId) return;
			onDismiss();
		}, autoCloseDelay);

		return () => clearTimeout(timeout);
	}, [notification.id, autoClose, autoCloseDelay, onDismiss]);

	const getIcon = () => {
		switch (notification.type) {
			case "error":
				return <AlertCircle size={18} className="text-destructive" />;
			case "success":
				return <CheckCircle size={18} className="text-green-500" />;
			case "info":
				return <Info size={18} className="text-blue-500" />;
		}
	};

	const getBackgroundColor = () => {
		switch (notification.type) {
			case "error":
				return "bg-destructive/20 border-destructive/40";
			case "success":
				return "bg-green-500/20 border-green-500/40";
			case "info":
				return "bg-blue-500/20 border-blue-500/40";
		}
	};

	return (
		<div
			className={cn(
				"flex items-center gap-2 px-4 py-2 border rounded-full shadow-lg backdrop-blur-3xl",
				getBackgroundColor(),
			)}
		>
			{getIcon()}
			<span className="text-sm text-foreground truncate">
				{notification.message}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-5 w-5 rounded-full hover:bg-transparent ml-1"
				onClick={onDismiss}
			>
				<X size={12} />
			</Button>
		</div>
	);
};
