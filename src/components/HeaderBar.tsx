import { useState, useRef, useEffect } from 'react';

interface HeaderBarProps {
	projectName: string;
	onProjectNameChange: (name: string) => void;
	onSeeJS: () => void;
	onSave: () => void;
	onLoad: () => void;
}

export default function HeaderBar({
	projectName,
	onProjectNameChange,
	onSeeJS,
	onSave,
	onLoad
}: HeaderBarProps) {
	const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsFileMenuOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className="header-bar">
			<div className="header-logo">
				<img src="logo_dark.svg" alt="Antimony Logo" />
			</div>

			<button className="see-js-btn" onClick={onSeeJS}>See JS</button>

			<div className="file-menu-container" ref={menuRef}>
				<button
					className="file-tab-btn"
					onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
				>
					File
				</button>
				{isFileMenuOpen && (
					<div className="file-menu">
						<button
							className="file-menu-item"
							onClick={() => {
								onSave();
								setIsFileMenuOpen(false);
							}}
						>
							Save Project
						</button>
						<button
							className="file-menu-item"
							onClick={() => {
								onLoad();
								setIsFileMenuOpen(false);
							}}
						>
							Load Project
						</button>
					</div>
				)}
			</div>

			<div className="header-project-name">
				<input
					type="text"
					value={projectName}
					onChange={(e) => onProjectNameChange(e.target.value)}
				/>
			</div>
		</div>
	);
}
