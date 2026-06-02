import { useSprites, isTextData, isShapeData, type TextSpriteData, type ShapeSpriteData } from '../lib/sprites';
import { useEffect, useState } from 'react';
import { getAvailableFonts, COMMON_FONTS, detectAvailableFonts, requestFontAccess, getFontPermissionState } from '../lib/fonts';

export default function PropertiesPanel() {
	const { state, dispatch } = useSprites();
	const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);

	if (!sprite) return;

	const [fonts, setFonts] = useState<string[]>([]);
	const [fontPermission, setFontPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
	const [requestingFonts, setRequestingFonts] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const state = await getFontPermissionState();
				if (!mounted) return;
				setFontPermission(state);
				if (state === 'granted') {
					const found = await detectAvailableFonts(COMMON_FONTS);
					if (!mounted) return;
					setFonts([...found, 'system-ui', 'sans-serif', 'serif', 'monospace']);
					return;
				}
				const fallback = getAvailableFonts(COMMON_FONTS);
				if (!mounted) return;
				setFonts([...fallback, 'system-ui', 'sans-serif', 'serif', 'monospace']);
			} catch {
				if (!mounted) return;
				setFonts(['Inter', 'Arial', 'Georgia', 'monospace']);
			}
		})();
		return () => { mounted = false; };
	}, []);

	const handleUnlockFonts = async () => {
		setRequestingFonts(true);
		try {
			const list = await requestFontAccess();
			if (list && list.length) {
				setFonts([...Array.from(new Set(list)), 'system-ui', 'sans-serif', 'serif', 'monospace']);
				setFontPermission('granted');
			} else {
				setFontPermission('denied');
			}
		} catch {
			setFontPermission('denied');
		} finally {
			setRequestingFonts(false);
		}
	};

	const update = (changes: Record<string, unknown>) => {
		dispatch({ type: 'UPDATE_SPRITE', id: sprite.id, changes });
	};

	const updateData = (dataChanges: Record<string, unknown>) => {
		update({ data: { ...sprite.data, ...dataChanges } });
	};

	const numField = (label: string, value: number, key: string, isData = false) => (
		<div className="properties-row">
			<span className="properties-label">{label}</span>
			<input
				className="properties-input"
				type="number"
				step="0.01"
				value={Number(value.toFixed(2))}
				onChange={(e) => {
					const v = parseFloat(e.target.value) || 0;
					if (isData) updateData({ [key]: v });
					else update({ [key]: v });
				}}
			/>
		</div>
	);

	return (
		<div className="properties-panel" style={{ flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
			<div className="panel-body" style={{ overflowY: 'visible', flex: 'none', background: 'transparent' }}>
				<div className="properties-section">
					<div className="properties-section-title">Transform</div>
					{numField('X', sprite.x, 'x')}
					{numField('Y', sprite.y, 'y')}
					{numField('Width', sprite.width, 'width')}
					{numField('Height', sprite.height, 'height')}
					{numField('Rotation', sprite.rotation, 'rotation')}
				</div>

				<div className="properties-section">
					<div className="properties-section-title">Appearance</div>
					<div className="properties-row">
						<span className="properties-label">Opacity</span>
						<input
							className="properties-slider"
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={sprite.opacity}
							onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
						/>
						<span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '32px', textAlign: 'right' }}>
							{Math.round(sprite.opacity * 100)}%
						</span>
					</div>
					<div className="properties-row">
						<span className="properties-label">Visible</span>
						<button
							className={`properties-toggle ${sprite.visible ? 'on' : 'off'}`}
							onClick={() => update({ visible: !sprite.visible })}
						/>
					</div>
					<div className="properties-row">
						<span className="properties-label">Locked</span>
						<button
							className={`properties-toggle ${sprite.locked ? 'on' : 'off'}`}
							onClick={() => update({ locked: !sprite.locked })}
						/>
					</div>
				</div>

				{isTextData(sprite.data) && (() => {
					const d = sprite.data as TextSpriteData;
					return (
						<div className="properties-section">
							<div className="properties-section-title">Text</div>
							<div className="properties-row">
								<textarea
									className="properties-textarea"
									value={d.content}
									onChange={(e) => updateData({ content: e.target.value })}
								/>
							</div>
							<div className="properties-row" style={{ alignItems: 'center' }}>
								<span className="properties-label">Font</span>
								<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
									<select
										className="properties-select"
										value={d.fontFamily}
										onChange={(e) => updateData({ fontFamily: e.target.value })}
										disabled={fontPermission !== 'granted'}
										style={{ minWidth: 160 }}
									>
										{(!fonts.includes(d.fontFamily) && d.fontFamily) ? (
											<option value={d.fontFamily}>{d.fontFamily}</option>
										) : null}
										{fonts.map(f => (
											<option key={f} value={f}>{f}</option>
										))}
									</select>
									{fontPermission !== 'granted' && (
										<button
											className="properties-btn"
											onClick={handleUnlockFonts}
											disabled={requestingFonts}
											title="Request permission to access local fonts"
										>
											{requestingFonts ? 'Unlocking...' : 'Unlock Fonts'}
										</button>
									)}
								</div>
							</div>
							{numField('Size', d.fontSize, 'fontSize', true)}
							<div className="properties-row">
								<span className="properties-label">Weight</span>
								<select
									className="properties-select"
									value={d.fontWeight}
									onChange={(e) => updateData({ fontWeight: parseInt(e.target.value) })}
								>
									<option value={300}>Light</option>
									<option value={400}>Regular</option>
									<option value={500}>Medium</option>
									<option value={600}>Semibold</option>
									<option value={700}>Bold</option>
								</select>
							</div>
							<div className="properties-row">
								<span className="properties-label">Color</span>
								<div className="properties-color-swatch">
									<input
										type="color"
										value={d.color}
										onChange={(e) => updateData({ color: e.target.value })}
									/>
								</div>
								<input
									className="properties-input"
									type="text"
									value={d.color}
									onChange={(e) => updateData({ color: e.target.value })}
								/>
							</div>
							<div className="properties-row">
								<span className="properties-label">Align</span>
								<select
									className="properties-select"
									value={d.align}
									onChange={(e) => updateData({ align: e.target.value })}
								>
									<option value="left">Left</option>
									<option value="center">Center</option>
									<option value="right">Right</option>
								</select>
							</div>
						</div>
					);
				})()}

				{isShapeData(sprite.data) && (() => {
					const d = sprite.data as ShapeSpriteData;
					return (
						<div className="properties-section">
							<div className="properties-section-title">Shape</div>
							<div className="properties-row">
								<span className="properties-label">Type</span>
								<select
									className="properties-select"
									value={d.shape}
									onChange={(e) => updateData({ shape: e.target.value })}
								>
									<option value="rect">Rectangle</option>
									<option value="ellipse">Ellipse</option>
								</select>
							</div>
							<div className="properties-row">
								<span className="properties-label">Fill</span>
								<div className="properties-color-swatch">
									<input
										type="color"
										value={d.fill}
										onChange={(e) => updateData({ fill: e.target.value })}
									/>
								</div>
								<input
									className="properties-input"
									type="text"
									value={d.fill}
									onChange={(e) => updateData({ fill: e.target.value })}
								/>
							</div>
							<div className="properties-row">
								<span className="properties-label">Stroke</span>
								<div className="properties-color-swatch">
									<input
										type="color"
										value={d.stroke}
										onChange={(e) => updateData({ stroke: e.target.value })}
									/>
								</div>
								<input
									className="properties-input"
									type="text"
									value={d.stroke}
									onChange={(e) => updateData({ stroke: e.target.value })}
								/>
							</div>
							{numField('Stroke W', d.strokeWidth, 'strokeWidth', true)}
						</div>
					);
				})()}
			</div>
		</div>
	);
}
