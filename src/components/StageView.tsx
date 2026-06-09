import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Play, Square, Pause } from 'lucide-react';
import { Stage, Layer, Rect, Text, Ellipse, Transformer, Line } from 'react-konva';
import type Konva from 'konva';
import { useSprites, isTextData, isShapeData, type Sprite } from '../lib/sprites';
import { buildFontStack } from '../lib/fonts';
import { useProjectSettings } from '../lib/settings';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import runtime, { type SpriteContext } from '../lib/runtime';

function createStageCoords(virtualWidth: number, virtualHeight: number) {
	return {
		toCanvasX: (x: number) => x + virtualWidth / 2,
		toCanvasY: (y: number) => virtualHeight / 2 - y,
		fromCanvasX: (cx: number) => cx - virtualWidth / 2,
		fromCanvasY: (cy: number) => virtualHeight / 2 - cy,
	};
}

function snapCanvasCoord(value: number, gridSize: number) {
	return Math.round(value / gridSize) * gridSize;
}

function snapCanvasPoint(x: number, y: number, gridSize: number) {
	return {
		x: snapCanvasCoord(x, gridSize),
		y: snapCanvasCoord(y, gridSize),
	};
}

function snapTopLeftToGrid(
	topLeftX: number,
	topLeftY: number,
	width: number,
	height: number,
	gridSize: number,
) {
	const centerX = topLeftX + width / 2;
	const centerY = topLeftY + height / 2;
	const snapped = snapCanvasPoint(centerX, centerY, gridSize);
	return {
		x: snapped.x - width / 2,
		y: snapped.y - height / 2,
	};
}

function getFpsColor(fps: number, targetFps: number): string {
	if (fps <= 0) return 'var(--text-muted)';
	const ratio = fps / targetFps;
	if (ratio >= 0.9) return 'var(--success)';
	if (ratio >= 0.7) return '#84cc16';
	if (ratio >= 0.5) return 'var(--warning)';
	if (ratio >= 0.3) return '#f97316';
	return 'var(--danger)';
}

function getFrameMs(fps: number): number {
	return 1000 / Math.max(1, fps);
}

function parseHexColor(color: string): [number, number, number] | null {
	let hex = color.trim();
	if (!hex.startsWith('#')) hex = `#${hex}`;
	hex = hex.slice(1);
	if (hex.length === 3) {
		hex = hex.split('').map((c) => c + c).join('');
	}
	if (hex.length !== 6 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
	return [
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16),
	];
}

function toHexByte(value: number) {
	return Math.round(value).toString(16).padStart(2, '0');
}

function getGridColorFromBackground(backgroundColor: string): string {
	const rgb = parseHexColor(backgroundColor);
	if (!rgb) return '#2a2a2a';
	const [r, g, b] = rgb;
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	const mix = luminance < 0.5 ? 0.18 : 0.14;
	const target = luminance < 0.5 ? 255 : 0;
	return `#${toHexByte(r + (target - r) * mix)}${toHexByte(g + (target - g) * mix)}${toHexByte(b + (target - b) * mix)}`;
}

function StageGrid({
	width,
	height,
	gridSize,
	stroke,
}: {
	width: number;
	height: number;
	gridSize: number;
	stroke: string;
}) {
	const lines = useMemo(() => {
		const elements: React.ReactNode[] = [];
		for (let x = 0; x <= width; x += gridSize) {
			elements.push(
				<Line
					key={`v-${x}`}
					points={[x, 0, x, height]}
					stroke={stroke}
					strokeWidth={1}
					listening={false}
				/>,
			);
		}
		for (let y = 0; y <= height; y += gridSize) {
			elements.push(
				<Line
					key={`h-${y}`}
					points={[0, y, width, y]}
					stroke={stroke}
					strokeWidth={1}
					listening={false}
				/>,
			);
		}
		return elements;
	}, [width, height, gridSize, stroke]);

	return <>{lines}</>;
}

function SpriteRenderer({ sprite, isSelected, showTransformer, onSelect, onNodeReady, stageCoords, snapToGrid, gridSize }: {
	sprite: Sprite;
	isSelected: boolean;
	showTransformer: boolean;
	onSelect: () => void;
	onNodeReady: (id: string, node: Konva.Shape | null) => void;
	stageCoords: ReturnType<typeof createStageCoords>;
	snapToGrid: boolean;
	gridSize: number;
}) {
	const { toCanvasX, toCanvasY, fromCanvasX, fromCanvasY } = stageCoords;
	const shapeRef = useRef<Konva.Shape | null>(null);
	const trRef = useRef<Konva.Transformer | null>(null);
	const { dispatch } = useSprites();

	useEffect(() => {
		onNodeReady(sprite.id, shapeRef.current);
		return () => onNodeReady(sprite.id, null);
	}, [onNodeReady, sprite.id]);

	useEffect(() => {
		if (isSelected && showTransformer && trRef.current && shapeRef.current) {
			trRef.current.nodes([shapeRef.current]);
			trRef.current.getLayer()?.batchDraw();
		}
	}, [isSelected, showTransformer]);

	const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
		if (!snapToGrid || sprite.locked) return;
		const node = e.target;
		if (isShapeData(sprite.data) && sprite.data.shape === 'ellipse') {
			const snapped = snapCanvasPoint(node.x(), node.y(), gridSize);
			node.x(snapped.x);
			node.y(snapped.y);
			return;
		}
		const snapped = snapTopLeftToGrid(node.x(), node.y(), node.width(), node.height(), gridSize);
		node.x(snapped.x);
		node.y(snapped.y);
	};

	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		if (sprite.locked) return;
		const node = e.target;
		if (isShapeData(sprite.data) && sprite.data.shape === 'ellipse') {
			const canvasX = snapToGrid ? snapCanvasCoord(node.x(), gridSize) : node.x();
			const canvasY = snapToGrid ? snapCanvasCoord(node.y(), gridSize) : node.y();
			if (snapToGrid) {
				node.x(canvasX);
				node.y(canvasY);
			}
			dispatch({ type: 'UPDATE_SPRITE', id: sprite.id, changes: { x: fromCanvasX(canvasX), y: fromCanvasY(canvasY) } });
			return;
		}
		const width = node.width();
		const height = node.height();
		const topLeft = snapToGrid
			? snapTopLeftToGrid(node.x(), node.y(), width, height, gridSize)
			: { x: node.x(), y: node.y() };
		if (snapToGrid) {
			node.x(topLeft.x);
			node.y(topLeft.y);
		}
		dispatch({
			type: 'UPDATE_SPRITE',
			id: sprite.id,
			changes: {
				x: fromCanvasX(topLeft.x + width / 2),
				y: fromCanvasY(topLeft.y + height / 2),
			},
		});
	};

	const handleTransformEnd = () => {
		const node = shapeRef.current;
		if (!node) return;
		const scaleX = node.scaleX();
		const scaleY = node.scaleY();
		node.scaleX(1);
		node.scaleY(1);

		const updatedWidth = Math.max(5, Number((node.width() * scaleX).toFixed(2)));
		const updatedHeight = Math.max(5, Number((node.height() * scaleY).toFixed(2)));
		const updatedRotation = node.rotation();
		const changes: { x: number; y: number; width: number; height: number; rotation: number; data?: typeof sprite.data } = {
			x: 0,
			y: 0,
			width: updatedWidth,
			height: updatedHeight,
			rotation: updatedRotation,
		};

		if (isShapeData(sprite.data) && sprite.data.shape === 'ellipse') {
			const canvasX = snapToGrid ? snapCanvasCoord(node.x(), gridSize) : node.x();
			const canvasY = snapToGrid ? snapCanvasCoord(node.y(), gridSize) : node.y();
			changes.x = fromCanvasX(canvasX);
			changes.y = fromCanvasY(canvasY);
			if (snapToGrid) {
				node.x(canvasX);
				node.y(canvasY);
			}
		} else {
			const topLeft = snapToGrid
				? snapTopLeftToGrid(node.x(), node.y(), updatedWidth, updatedHeight, gridSize)
				: { x: node.x(), y: node.y() };
			changes.x = fromCanvasX(topLeft.x + updatedWidth / 2);
			changes.y = fromCanvasY(topLeft.y + updatedHeight / 2);
			if (snapToGrid) {
				node.x(topLeft.x);
				node.y(topLeft.y);
			}
		}

		if (isTextSprite && isTextData(sprite.data)) {
			const fontScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
			changes.data = {
				...sprite.data,
				fontSize: Math.max(8, Number((sprite.data.fontSize * fontScale).toFixed(2))),
			};
		}

		dispatch({
			type: 'UPDATE_SPRITE',
			id: sprite.id,
			changes,
		});
	};

	const isTextSprite = sprite.type === 'text';
	const canvasCenterX = toCanvasX(sprite.x);
	const canvasCenterY = toCanvasY(sprite.y);
	const canvasTopLeftX = canvasCenterX - sprite.width / 2;
	const canvasTopLeftY = canvasCenterY - sprite.height / 2;
	const commonProps = {
		x: canvasTopLeftX,
		y: canvasTopLeftY,
		width: sprite.width,
		height: sprite.height,
		rotation: sprite.rotation,
		opacity: sprite.opacity,
		draggable: !sprite.locked,
		onClick: onSelect,
		onTap: onSelect,
		onDragMove: handleDragMove,
		onDragEnd: handleDragEnd,
		onTransformEnd: handleTransformEnd,
	};

	if (!sprite.visible) return null;

	let element: React.ReactNode = null;

	if (isTextData(sprite.data)) {
		const d = sprite.data;
		element = (
			<Text
				{...commonProps}
				ref={shapeRef as React.RefObject<Konva.Text | null>}
				text={d.content}
				fontFamily={buildFontStack(d.fontFamily)}
				fontSize={d.fontSize}
				fontStyle={d.fontWeight >= 600 ? 'bold' : 'normal'}
				fill={d.color}
				align={d.align}
				verticalAlign="middle"
				wrap="word"
			/>
		);
	} else if (isShapeData(sprite.data)) {
		const d = sprite.data;
		if (d.shape === 'ellipse') {
			element = (
				<Ellipse
					ref={shapeRef as React.RefObject<Konva.Ellipse | null>}
					radiusX={sprite.width / 2}
					radiusY={sprite.height / 2}
					x={toCanvasX(sprite.x)}
					y={toCanvasY(sprite.y)}
					fill={d.fill}
					stroke={d.stroke}
					strokeWidth={d.strokeWidth}
					draggable={!sprite.locked}
					onClick={onSelect}
					onTap={onSelect}
					onDragMove={handleDragMove}
					onDragEnd={handleDragEnd}
					onTransformEnd={handleTransformEnd}
				/>
			);
		} else {
			element = (
				<Rect
					{...commonProps}
					ref={shapeRef as React.RefObject<Konva.Rect | null>}
					fill={d.fill}
					stroke={d.stroke}
					strokeWidth={d.strokeWidth}
					cornerRadius={4}
				/>
			);
		}
	}

	return (
		<>
			{element}
			{isSelected && showTransformer && (
				<Transformer
					ref={trRef}
					borderStroke="#a63ef5"
					borderStrokeWidth={1.5}
					anchorFill="#a63ef5"
					anchorStroke="#fff"
					anchorSize={8}
					anchorCornerRadius={2}
					rotateEnabled={!sprite.locked}
					flipEnabled={false}
					enabledAnchors={sprite.locked ? [] : (isTextSprite ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : undefined)}
					borderDash={isTextSprite ? [6, 4] : undefined}
					boundBoxFunc={(oldBox, newBox) => {
						if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
						return newBox;
					}}
				/>
			)}
		</>
	);
}

export default function StageView() {
	const parentRef = useRef<HTMLDivElement>(null);
	const layerRef = useRef<Konva.Layer>(null);
	const fpsRef = useRef<HTMLDivElement>(null);
	const spriteNodeRefs = useRef(new Map<string, Konva.Shape>());
	const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
	const { state, dispatch } = useSprites();
	const { settings } = useProjectSettings();
	const [isPlaying, setIsPlaying] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const playGenerationRef = useRef(0);
	const spritesRef = useRef(state.sprites);
	const pendingPlaybackChangesRef = useRef(new Map<string, Partial<Omit<Sprite, 'id' | 'type'>>>());
	spritesRef.current = state.sprites;

	const virtualWidth = settings.width;
	const virtualHeight = settings.height;
	const stageCoords = useMemo(
		() => createStageCoords(virtualWidth, virtualHeight),
		[virtualWidth, virtualHeight],
	);
	const scale = stageSize.width / virtualWidth;

	const [canvasEffects, setCanvasEffects] = useState<Record<string, number>>({});

	useEffect(() => {
		let mounted = true;
		const effectKeys = [
			'blur',
			'contrast',
			'saturation',
			'color_shift',
			'brightness',
			'invert',
			'sepia',
			'transparency',
		];

		const readEffects = () => {
			if (!mounted) return;
			const effects: Record<string, number> = {};
			for (const k of effectKeys) {
				effects[k] = (window.RUNTIME && window.RUNTIME.getCanvasEffect && window.RUNTIME.getCanvasEffect(k)) || 0;
			}
			setCanvasEffects(effects);
		};

		readEffects();
		const id = window.setInterval(readEffects, getFrameMs(settings.fps));
		return () => {
			mounted = false;
			clearInterval(id);
		};
	}, [settings.fps]);

	const computeFilterAndOpacity = () => {
		const e = canvasEffects;
		const parts: string[] = [];
		if ((e.blur ?? 0) !== 0) parts.push(`blur(${e.blur}px)`);
		if ((e.contrast ?? 0) !== 0) parts.push(`contrast(${100 + e.contrast}%)`);
		if ((e.saturation ?? 0) !== 0) parts.push(`saturate(${100 + e.saturation}%)`);
		if ((e['color_shift'] ?? 0) !== 0) parts.push(`hue-rotate(${e['color_shift']}deg)`);
		if ((e.brightness ?? 0) !== 0) parts.push(`brightness(${100 + e.brightness}%)`);
		if ((e.invert ?? 0) !== 0) parts.push(`invert(${e.invert}%)`);
		if ((e.sepia ?? 0) !== 0) parts.push(`sepia(${e.sepia}%)`);
		const opacity = 1 - ((e.transparency ?? 0) / 100);
		return { filter: parts.join(' '), opacity: Math.max(0, Math.min(1, opacity)) };
	};

	const { filter: stageFilter, opacity: stageOpacity } = computeFilterAndOpacity();

	useEffect(() => {
		runtime.setCompiler(() => {
			const parts: string[] = [];
			state.sprites.forEach(sprite => {
				if (!sprite.blocklyXml) return;
				const tempWorkspace = new Blockly.Workspace();
				try {
					const dom = Blockly.utils.xml.textToDom(sprite.blocklyXml);
					Blockly.Xml.domToWorkspace(dom, tempWorkspace);
					const code = javascriptGenerator.workspaceToCode(tempWorkspace);
					if (code.trim()) {
						parts.push(`window.RUNTIME?.setCurrentSprite(${JSON.stringify(sprite.id)});\ncontext = spriteContextMap[${JSON.stringify(sprite.id)}];\n${code.trim()}`);
					}
				} catch (e) {
					console.error(e);
				} finally {
					tempWorkspace.dispose();
				}
			});

			return parts.join('\n');
		});
		return () => {
			runtime.setCompiler(null);
		};
	}, [state.sprites]);

	useEffect(() => {
		runtime.setFps(settings.fps);
	}, [settings.fps]);

	useEffect(() => {
		const layer = layerRef.current;
		if (!layer) return;

		const drawTimes: number[] = [];
		const windowMs = 500;
		const onDraw = () => {
			drawTimes.push(performance.now());
		};

		let rafId = 0;
		const tick = () => {
			const now = performance.now();
			while (drawTimes.length > 0 && now - drawTimes[0] > windowMs) {
				drawTimes.shift();
			}

			let fps = 0;
			if (drawTimes.length >= 2) {
				fps = Math.round(((drawTimes.length - 1) / (now - drawTimes[0])) * 1000);
			}

			const fpsNode = fpsRef.current;
			if (fpsNode) {
				fpsNode.textContent = `${fps} FPS`;
				fpsNode.style.color = getFpsColor(fps, settings.fps);
			}
			rafId = requestAnimationFrame(tick);
		};

		layer.on('draw', onDraw);
		rafId = requestAnimationFrame(tick);

		return () => {
			layer.off('draw', onDraw);
			cancelAnimationFrame(rafId);
		};
	}, [stageSize.width, stageSize.height, settings.fps]);

	useEffect(() => {
		if (!parentRef.current) return;
		const ratio = virtualWidth / virtualHeight;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width: pw, height: ph } = entry.contentRect;
				let w = pw - 16;
				let h = w / ratio;
				if (h > ph - 16) {
					h = ph - 16;
					w = h * ratio;
				}
				setStageSize({ width: Math.floor(w), height: Math.floor(h) });
			}
		});
		observer.observe(parentRef.current);
		return () => observer.disconnect();
	}, [virtualWidth, virtualHeight]);

	const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
		const target = e.target;
		const isEmptyStageClick = target === target.getStage() || target.name() === 'background';
		if (isEmptyStageClick) {
			dispatch({ type: 'SELECT_SPRITE', id: null });
		}
	}, [dispatch]);

	const handleSpriteNodeReady = useCallback((id: string, node: Konva.Shape | null) => {
		if (node) {
			spriteNodeRefs.current.set(id, node);
		} else {
			spriteNodeRefs.current.delete(id);
		}
	}, []);

	const queuePlaybackStateUpdate = useCallback((id: string, changes: Partial<Omit<Sprite, 'id' | 'type'>>) => {
		const pending = pendingPlaybackChangesRef.current.get(id) ?? {};
		pendingPlaybackChangesRef.current.set(id, { ...pending, ...changes });
	}, []);

	const flushPlaybackStateUpdates = useCallback(() => {
		const pending = pendingPlaybackChangesRef.current;
		if (pending.size === 0) return;
		pendingPlaybackChangesRef.current = new Map();
		for (const [id, changes] of pending) {
			if (Object.keys(changes).length === 0) continue;
			dispatch({
				type: 'UPDATE_SPRITE',
				id,
				changes,
			});
		}
	}, [dispatch]);

	const handlePlay = async () => {
		const generation = ++playGenerationRef.current;
		runtime.stop();
		runtime.setFps(settings.fps);
		pendingPlaybackChangesRef.current.clear();
		setIsPlaying(true);
		setIsPaused(false);

		state.sprites.forEach(sprite => {
			const applyLiveSprite = () => {
				const node = spriteNodeRefs.current.get(sprite.id);
				if (!node) return;
				const x = Number(spriteData.x ?? sprite.x);
				const y = Number(spriteData.y ?? sprite.y);
				const width = Number(spriteData.width ?? sprite.width);
				const height = Number(spriteData.height ?? sprite.height);
				const rotation = Number(spriteData.rotation ?? sprite.rotation);
				const opacity = Number(spriteData.opacity ?? sprite.opacity);
				const visible = Boolean(spriteData.visible ?? sprite.visible);
				if (isShapeData(sprite.data) && sprite.data.shape === 'ellipse') {
					node.setAttrs({
						x: stageCoords.toCanvasX(x),
						y: stageCoords.toCanvasY(y),
						radiusX: width / 2,
						radiusY: height / 2,
						rotation,
						opacity,
						visible,
					});
				} else {
					node.setAttrs({
						x: stageCoords.toCanvasX(x) - width / 2,
						y: stageCoords.toCanvasY(y) - height / 2,
						width,
						height,
						rotation,
						opacity,
						visible,
					});
				}
				if (sprite.type === 'text') {
					if (typeof spriteData.color === 'string') node.setAttr('fill', spriteData.color);
					if (typeof spriteData.text === 'string') node.setAttr('text', spriteData.text);
				}
				node.getLayer()?.batchDraw();
			};

			const spriteData: Record<string, unknown> = {
				x: sprite.x,
				y: sprite.y,
				rotation: sprite.rotation,
				width: sprite.width,
				height: sprite.height,
				opacity: sprite.opacity,
				visible: sprite.visible,
				zIndex: sprite.zIndex,
				tweenMode: sprite.tweenMode,
				tweenModes: { ...sprite.tweenModes },
			};

			if (sprite.type === 'text' && isTextData(sprite.data)) {
				spriteData.color = sprite.data.color;
				spriteData.text = sprite.data.content;
			}

			const spriteProxy = new Proxy(spriteData, {
				get: (target, property) => {
					const current = spritesRef.current.find(s => s.id === sprite.id);
					if (property === 'zIndex') {
						return target.zIndex ?? current?.zIndex;
					}
					if (property === 'tweenMode') {
						return target.tweenMode ?? current?.tweenMode;
					}
					if (property === 'tweenModes') {
						return { ...(target.tweenModes as Record<string, unknown> ?? current?.tweenModes) };
					}
					if (property === 'color') {
						return target.color;
					}
					if (property === 'text') {
						return target.text;
					}
					return target[property as keyof typeof target];
				},
				set: (target, property, value) => {
					const current = spritesRef.current.find(s => s.id === sprite.id);
					if (property === 'tweenMode') {
						target.tweenMode = value;
						dispatch({
							type: 'UPDATE_SPRITE',
							id: sprite.id,
							changes: { tweenMode: value as typeof sprite.tweenMode },
						});
						return true;
					}
					if (property === 'tweenModes') {
						target.tweenModes = value;
						dispatch({
							type: 'UPDATE_SPRITE',
							id: sprite.id,
							changes: { tweenModes: value as typeof sprite.tweenModes },
						});
						return true;
					}
					if (property === 'color') {
						if (current && isTextData(current.data)) {
							target.color = value;
							applyLiveSprite();
							queuePlaybackStateUpdate(sprite.id, {
								data: { ...current.data, color: value as string },
							});
						}
						return true;
					}
					if (property === 'text') {
						if (current && isTextData(current.data)) {
							target.text = value;
							applyLiveSprite();
							queuePlaybackStateUpdate(sprite.id, {
								data: { ...current.data, content: value as string },
							});
						}
						return true;
					}
					if (typeof property === 'string' && property in target) {
						target[property] = value;
						applyLiveSprite();
						queuePlaybackStateUpdate(sprite.id, { [property]: value });
					}
					return true;
				},
			});

			runtime.registerSprite(sprite.id, {
				sprite: spriteProxy as SpriteContext['sprite'],
				spriteId: sprite.id,
				dispatch,
				getSprites: () => spritesRef.current,
			});
		});

		await runtime.start();
		if (generation === playGenerationRef.current) {
			flushPlaybackStateUpdates();
			setIsPlaying(false);
			setIsPaused(false);
		}
	};

	const handlePause = () => {
		if (!isPlaying) return;
		if (isPaused) {
			runtime.resume();
			setIsPaused(false);
			return;
		}
		runtime.pause();
		flushPlaybackStateUpdates();
		setIsPaused(true);
	};

	const handleStop = () => {
		playGenerationRef.current++;
		setIsPlaying(false);
		setIsPaused(false);
		runtime.stop();
		flushPlaybackStateUpdates();
	};

	const sorted = [...state.sprites].sort((a, b) => a.zIndex - b.zIndex);
	const gridColor = useMemo(
		() => getGridColorFromBackground(settings.backgroundColor),
		[settings.backgroundColor],
	);
	const showGrid = settings.showGrid && !(isPlaying && !isPaused);
	const showTransformers = !isPlaying || isPaused;

	return (
		<div className="stage-area panel">
			<div className="panel-header stage-panel-header">
				<div className="transport-controls" style={{ background: 'transparent', border: 'none', padding: 0 }}>
					<button
						className={`transport-btn ${isPlaying && !isPaused ? 'active' : ''}`}
						title={isPaused ? 'Resume' : 'Play'}
						onClick={handlePlay}
					>
						<Play size={18} />
					</button>
					<button
						className={`transport-btn ${isPaused ? 'active' : ''}`}
						title="Pause"
						onClick={handlePause}
						disabled={!isPlaying}
					>
						<Pause size={18} />
					</button>
					<button
						className="transport-btn"
						title="Stop"
						onClick={handleStop}
					>
						<Square size={18} />
					</button>
				</div>
				<div
					ref={fpsRef}
					className="stage-fps-counter"
					style={{ color: getFpsColor(0, settings.fps) }}
					title={`Target: ${settings.fps} FPS`}
				>
					0 FPS
				</div>
			</div>
			<div className="panel-body" ref={parentRef}>
				<div className="stage-container">
					<Stage
						width={stageSize.width}
						height={stageSize.height}
						scaleX={scale}
						scaleY={scale}
						onClick={handleStageClick}
						style={{ borderRadius: '4px', overflow: 'hidden', filter: stageFilter || undefined, opacity: stageOpacity }}
					>
						<Layer ref={layerRef}>
							<Rect
								x={0}
								y={0}
								width={virtualWidth}
								height={virtualHeight}
								name="background"
								fill={settings.backgroundColor}
							/>
							{showGrid && (
								<StageGrid
									width={virtualWidth}
									height={virtualHeight}
									gridSize={settings.gridSize}
									stroke={gridColor}
								/>
							)}
							{sorted.map(sprite => (
								<SpriteRenderer
									key={sprite.id}
									sprite={sprite}
									isSelected={state.selectedSpriteId === sprite.id}
									showTransformer={showTransformers}
									onSelect={() => dispatch({ type: 'SELECT_SPRITE', id: sprite.id })}
									onNodeReady={handleSpriteNodeReady}
									stageCoords={stageCoords}
									snapToGrid={settings.snapToGrid}
									gridSize={settings.gridSize}
								/>
							))}
						</Layer>
					</Stage>
				</div>
			</div>
		</div>
	);
}
