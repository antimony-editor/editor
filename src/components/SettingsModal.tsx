import { Monitor, Gauge, Palette, Grid3x3, X } from 'lucide-react';
import { RESOLUTION_PRESETS, type ProjectSettings } from '../lib/settings';

interface SettingsModalProps {
	settings: ProjectSettings;
	onChange: (settings: ProjectSettings) => void;
	isClosing?: boolean;
	onClose: () => void;
}

export default function SettingsModal({ settings, onChange, isClosing = false, onClose }: SettingsModalProps) {
	const matchedPreset = RESOLUTION_PRESETS.find(
		(preset) => preset.width === settings.width && preset.height === settings.height,
	);
	const presetValue = matchedPreset
		? `${matchedPreset.width}x${matchedPreset.height}`
		: 'custom';

	const update = (changes: Partial<ProjectSettings>) => {
		onChange({ ...settings, ...changes });
	};

	return (
		<div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onClick={onClose}>
			<div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2>Project Settings</h2>
					<button className="close-modal-btn" onClick={onClose}><X size={18} /></button>
				</div>
				<div className="modal-body settings-modal-body">
					<section className="settings-section">
						<div className="settings-section-title">
							<Monitor size={16} />
							<span>Resolution</span>
						</div>
						<div className="settings-row">
							<span className="settings-label">Preset</span>
							<select
								className="settings-select"
								value={presetValue}
								onChange={(e) => {
									const value = e.target.value;
									if (value === 'custom') return;
									const [width, height] = value.split('x').map(Number);
									update({ width, height });
								}}
							>
								{RESOLUTION_PRESETS.map((preset) => (
									<option key={preset.label} value={`${preset.width}x${preset.height}`}>
										{preset.label}
									</option>
								))}
								<option value="custom">Custom</option>
							</select>
						</div>
						<div className="settings-row">
							<span className="settings-label">Width</span>
							<input
								className="settings-input"
								type="number"
								min={64}
								max={3840}
								value={settings.width}
								onChange={(e) => update({ width: parseInt(e.target.value, 10) || settings.width })}
							/>
						</div>
						<div className="settings-row">
							<span className="settings-label">Height</span>
							<input
								className="settings-input"
								type="number"
								min={64}
								max={2160}
								value={settings.height}
								onChange={(e) => update({ height: parseInt(e.target.value, 10) || settings.height })}
							/>
						</div>
					</section>

					<section className="settings-section">
						<div className="settings-section-title">
							<Gauge size={16} />
							<span>Playback</span>
						</div>
						<div className="settings-row">
							<span className="settings-label">FPS</span>
							<input
								className="settings-input"
								type="number"
								min={1}
								max={240}
								value={settings.fps}
								onChange={(e) => update({ fps: parseInt(e.target.value, 10) || settings.fps })}
							/>
						</div>
					</section>

					<section className="settings-section">
						<div className="settings-section-title">
							<Palette size={16} />
							<span>Stage</span>
						</div>
						<div className="settings-row">
							<span className="settings-label">Background</span>
							<div className="settings-color-field">
								<input
									type="color"
									value={settings.backgroundColor}
									onChange={(e) => update({ backgroundColor: e.target.value })}
								/>
								<input
									className="settings-input"
									type="text"
									value={settings.backgroundColor}
									onChange={(e) => update({ backgroundColor: e.target.value })}
								/>
							</div>
						</div>
					</section>

					<section className="settings-section">
						<div className="settings-section-title">
							<Grid3x3 size={16} />
							<span>Grid</span>
						</div>
						<div className="settings-row">
							<span className="settings-label">Show grid</span>
							<button
								className={`settings-toggle ${settings.showGrid ? 'on' : 'off'}`}
								onClick={() => update({ showGrid: !settings.showGrid })}
							/>
						</div>
						<div className="settings-row">
							<span className="settings-label">Grid size</span>
							<input
								className="settings-input"
								type="number"
								min={5}
								max={200}
								value={settings.gridSize}
								onChange={(e) => update({ gridSize: parseInt(e.target.value, 10) || settings.gridSize })}
							/>
						</div>
						<div className="settings-row">
							<span className="settings-label">Snap to grid</span>
							<button
								className={`settings-toggle ${settings.snapToGrid ? 'on' : 'off'}`}
								onClick={() => update({ snapToGrid: !settings.snapToGrid })}
							/>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
