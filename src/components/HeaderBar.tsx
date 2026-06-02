import { useState } from 'react';

export default function HeaderBar() {
	const [projectName, setProjectName] = useState('Untitled Project');

	return (
		<div className="header-bar">
			<div className="header-logo">
				<img src="logo.svg" alt="Antimony Logo" />
			</div>
			<div className="header-project-name">
				<input
					type="text"
					value={projectName}
					onChange={(e) => setProjectName(e.target.value)}
				/>
			</div>
		</div>
	);
}
