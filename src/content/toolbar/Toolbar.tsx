import type React from "react";
import { useState } from "react";

interface ToolbarProps {
	onAction: (action: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAction }) => {
	// const [isPickerActive, setIsPickerActive] = useState(false);

	// const handlePickerToggle = () => {
	// 	const action = isPickerActive ? "deactivate-picker" : "activate-picker";
	// 	onAction(action);
	// 	setIsPickerActive(!isPickerActive);
	// };

	const extraStyles = {
		transform: "translate(24px, 24px)",
		width: "189px",
		maxWidth: "calc(100vw - 48px)",
		height: "36px",
		maxHeight: "calc(100vh - 48px)",
	};

	return (
		<div
			className="flex fixed inset-0 shadow-lg select-none z-50 touch-none opacity-0 animate-fade-in"
			style={extraStyles}
		>
			<div className="flex flex-1 flex-col rounded-lg bg-black text-white overflow-hidden">
				<div className="flex flex-1 flex-col overflow-hidden">Top</div>
				<div className="flex flex-1 max-h-9 min-h-9 items-stretch overflow-hidden">
					Bottom
				</div>
			</div>
		</div>
	);
};
