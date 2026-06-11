import { useEffect, useRef, useState } from 'react';

import '../styles/editor.css';
import { useSprites, generateMediaSoundId } from '../lib/sprites';
import { AudioLines, PlayIcon, Plus, Square } from 'lucide-react';
import { Menu, Item, useContextMenu } from "react-contexify";
import runtime from '../lib/runtime';

function WaveformPreview({ src, soundId, volume }: { src: string; soundId: string; volume: number }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [peaks, setPeaks] = useState<number[]>([]);
	const [duration, setDuration] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const startRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	const previewId = `preview_${soundId}`;

	const BUCKETS = 240;

	useEffect(() => {
		let cancelled = false;
		setPeaks([]);
		setProgress(0);
		if (!src) return;
		runtime.decodeAudio(src).then(buffer => {
			if (cancelled || !buffer) return;
			const channel = buffer.getChannelData(0);
			const bucketSize = Math.max(1, Math.floor(channel.length / BUCKETS));
			const result: number[] = [];
			for (let i = 0; i < BUCKETS; i++) {
				let peak = 0;
				const start = i * bucketSize;
				for (let j = 0; j < bucketSize && start + j < channel.length; j++) {
					const v = Math.abs(channel[start + j]);
					if (v > peak) peak = v;
				}
				result.push(peak);
			}
			setPeaks(result);
			setDuration(buffer.duration);
		});
		return () => { cancelled = true; };
	}, [src]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();

		canvas.width = Math.round(rect.width * dpr);
		canvas.height = Math.round(rect.height * dpr);

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const w = rect.width;
		const h = rect.height;

		ctx.clearRect(0, 0, w, h);
		if (peaks.length === 0) return;

		const barWidth = w / peaks.length;
		for (let i = 0; i < peaks.length; i++) {
			const played = (i / peaks.length) <= progress;
			const barHeight = Math.max(2, peaks[i] * h * 0.92);
			ctx.fillStyle = played ? '#7aa2f7' : '#3a3f55';
			ctx.fillRect(i * barWidth, (h - barHeight) / 2, Math.max(1, barWidth - 1), barHeight);
		}
	}, [peaks, progress]);

	useEffect(() => {
		if (playing) runtime.setSoundVolume(previewId, volume);
	}, [volume, playing, previewId]);

	const stop = () => {
		runtime.stopSound(previewId);
		if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
		setPlaying(false);
		setProgress(0);
	};

	const play = () => {
		if (playing) { stop(); return; }
		startRef.current = performance.now();
		setPlaying(true);
		const tick = () => {
			const elapsed = (performance.now() - startRef.current) / 1000;
			setProgress(duration > 0 ? Math.min(1, elapsed / duration) : 0);
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		runtime.previewSound(src, previewId, volume).then(() => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
			setPlaying(false);
			setProgress(0);
		});
	};

	useEffect(() => () => {
		runtime.stopSound(previewId);
		if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
	}, [previewId]);

	return (
		<div className="audio-preview">
			<button className="audio-editor-play" onClick={play} aria-label={playing ? 'Stop' : 'Play'}>
				{playing ? <Square /> : <PlayIcon />}
			</button>
			<canvas
				ref={canvasRef}
				className="audio-waveform"
				style={{
					width: '100%',
					height: '90px',
					display: 'block'
				}}
			/>
		</div>
	);
}

const MENU_ID = "sound-menu";

export default function SoundTab() {
	const { state, dispatch } = useSprites();
	const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
	const [audioIDX, setAudioIDX] = useState(0);
	const activeItem = sprite?.data.sounds[audioIDX];
	const { show } = useContextMenu({ id: MENU_ID });
	const updateSound = (id: string, changes: Record<string, unknown>) => {
		if (!sprite) return;
		dispatch({
			type: 'UPDATE_SPRITE',
			id: sprite.id,
			changes: {
				data: {
					...sprite.data,
					sounds: sprite.data.sounds.map((s, j) =>
						j === audioIDX ? { ...s, ...changes } : s
					),
				},
			},
		});
	};
	const readSoundFile = (file: File, replace?: boolean, iId?: string) => {
		const reader = new FileReader();
		reader.onload = () => {
			const src = String(reader.result ?? '');
			let id = ""
			if (replace && iId) id = iId;
			else id = generateMediaSoundId();
			const newSounds = sprite!.data.sounds
			if (!replace && !iId) {
				newSounds?.push({
					id,
					name: file.name.replace(/\.[^.]+$/, '') || 'Sound' + (sprite?.data.sounds.length! + 1),
					src,
				});
			} else {
				newSounds.map(s => {
					if (s.id === id) {
						s.src = src;
					}
					return s;
				})
			}
			// YO THIS SYSTEM HAS CAUSED ME SO MUCH PAIN
			// i can tell,,, -dotun
			if (sprite?.type === 'media') {
				dispatch(
					{
						type: "UPDATE_SPRITE",
						id: sprite!.id,
						changes: {
							data: {
								...sprite!.data,
								sounds: newSounds,
								currentSoundId: id
							}
						}
					}
				);
			} else {
				dispatch(
					{
						type: "UPDATE_SPRITE",
						id: sprite!.id,
						changes: {
							data: {
								...sprite!.data,
								sounds: newSounds,
								currentSoundId: id,
							}
						}
					}
				);
			}
		};
		reader.readAsDataURL(file);
	};

	const newSound = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'audio/*';
		input.onchange = () => {
			const file = input.files?.[0];
			if (file) readSoundFile(file);
		};
		input.click();
	};

	const replaceSound = (id: string) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'audio/*';
		input.onchange = () => {
			const file = input.files?.[0];
			if (file) readSoundFile(file, true, id);
		};
		input.click();
	};
	return (
		<div className="sound-tab">
			<div className="sound-tab-side">
				{
					sprite?.data.sounds.map((s, i) => (
						<button key={i} className={i == audioIDX ? "sound-tab-sound-selected" : "sound-tab-sound"} onClick={() => {
							setAudioIDX(i);
						}}
							onContextMenu={(e) => {
								e.preventDefault();
								show({
									event: e,
									props: {
										soundIndex: i,
										sound: s,
									},
								});
							}}>
							<AudioLines style={{ height: "40px", width: "40px" }} />
							<span>{s.name}</span>
						</button>
					))
				}
				<Menu id={MENU_ID}>
					<Item onClick={(e) => {
						const newName = prompt("What's the new name?");
						if (!newName) return;
						updateSound(e.props.sound.id, { name: newName });
					}
					}>
						Quick rename
					</Item>
					<Item onClick={(e) => {
						replaceSound(e.props.sound.id);
					}
					}>
						Quick replace
					</Item>
					{
						//@ts-ignore
						sprite?.data.sounds.length > 1 ? (
							<Item onClick={(e) => {
								let soundsRemoved = sprite!.data.sounds.filter(i => i.id !== e.props.sound.id);

								dispatch({
									type: "UPDATE_SPRITE", id: sprite?.id as string, changes: {
										data: {
											...sprite!.data,
											sounds: soundsRemoved
										}
									}
								})
							}
							} style={{ color: "red", fontWeight: "bold" }}>
								Delete
							</Item>
						) : null
					}
				</Menu>
				<button className="sound-tab-sound-new" onClick={() => {
					newSound();
				}}>
					<Plus style={{ height: "40px", width: "40px" }} />
					<span>Add sound</span>
				</button>
			</div>
			<div className="sound-tab-editor">
				{
					sprite == undefined || activeItem == undefined ? (
						/* taken from blocklyeditor lol */
						<div style={{
							display: 'flex',
							width: '100%',
							height: '100%',
							alignItems: 'center',
							justifyContent: 'center',
							color: 'var(--text-secondary)',
							fontSize: '13px',
							fontWeight: 500,
							pointerEvents: 'all',
							textAlign: 'center',
							userSelect: 'none',
							boxSizing: 'border-box'
						}}>
							Select a source to view and edit its sounds or select a sound
						</div>
					) : (
						<div className="sound-tab-editor-inner">
							<div className="properties-row" style={{ marginRight: '450px' }}>
								<span className="properties-label">Name</span>
								<input
									className="properties-input"
									type="text"
									value={activeItem.name}
									onChange={(e) => {
										updateSound(activeItem.id, { name: e.target.value });
									}}
									onBlur={() => {
										if (activeItem.name.trim() !== '') return;
										updateSound(activeItem.id, { name: "Sound " + (audioIDX + 1) });
									}}
								/>
							</div>

							<div className="properties-row" style={{ marginRight: '450px' }}>
								<span className="properties-label">Volume</span>
								<input
									className="properties-slider"
									type="range"
									min={0}
									max={100}
									step={1}
									value={Math.round((activeItem.volume ?? 1) * 100)}
									onChange={(e) => {
										updateSound(activeItem.id, { volume: Number(e.target.value) / 100 });
									}}
								/>
								<span className="properties-value">{Math.round((activeItem.volume ?? 1) * 100)}%</span>
							</div>

							<WaveformPreview
								key={activeItem.id}
								src={activeItem.src}
								soundId={activeItem.id}
								volume={activeItem.volume ?? 1}
							/>
						</div>
					)
				}
			</div>
		</div>
	)
}