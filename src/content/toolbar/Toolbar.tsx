import { Camera, ExternalLink, Folder, GripVertical } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

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
		width: "168px",
		maxWidth: "calc(100vw - 48px)",
		height: "36px",
		maxHeight: "calc(100vh - 48px)",
	};

	return (
		<div
			className="flex fixed inset-0 select-none z-50 touch-none opacity-0 animate-fade-in"
			style={extraStyles}
		>
			<div className="flex flex-1 flex-col bg-black rounded-md overflow-hidden">
				<div className="flex flex-1 flex-col overflow-hidden">Top</div>
				<div className="flex flex-1 max-h-9 min-h-9 overflow-hidden">
					<ButtonGroup>
						<Button variant="ghost" size="icon">
							<Camera />
						</Button>
						<Button variant="ghost" size="icon">
							<Folder />
						</Button>
						<Button variant="ghost" size="icon" className="rounded-r-none">
							<ExternalLink />
						</Button>
					</ButtonGroup>
					<div className="flex justify-center items-center ml-auto px-1 cursor-grab">
						<GripVertical size={16} />
					</div>
				</div>
			</div>
		</div>
	);
};
