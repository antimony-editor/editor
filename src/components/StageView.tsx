import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Ellipse, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useSprites, isTextData, isShapeData, type Sprite } from '../lib/sprites';
import { buildFontStack } from '../lib/fonts';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import runtime, { type SpriteContext } from '../lib/runtime';

const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

function toCanvasX(x: number) {
	return x + VIRTUAL_WIDTH / 2;
}

function toCanvasY(y: number) {
	return VIRTUAL_HEIGHT / 2 - y;
}

function fromCanvasX(cx: number) {
	return cx - VIRTUAL_WIDTH / 2;
}

function fromCanvasY(cy: number) {
	return VIRTUAL_HEIGHT / 2 - cy;
}

function SpriteRenderer({ sprite, isSelected, onSelect }: {
	sprite: Sprite;
	isSelected: boolean;
	onSelect: () => void;
}) {
	const shapeRef = useRef<Konva.Shape | null>(null);
	const trRef = useRef<Konva.Transformer | null>(null);
	const { dispatch } = useSprites();

	useEffect(() => {
		if (isSelected && trRef.current && shapeRef.current) {
			trRef.current.nodes([shapeRef.current]);
			trRef.current.getLayer()?.batchDraw();
		}
	}, [isSelected]);

	const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
		if (sprite.locked) return;
		const node = e.target;
		if (isShapeData(sprite.data) && sprite.data.shape === 'ellipse') {
			const logicalX = fromCanvasX(node.x());
			const logicalY = fromCanvasY(node.y());
			dispatch({ type: 'UPDATE_SPRITE', id: sprite.id, changes: { x: logicalX, y: logicalY } });
			return;
		}
		const logicalX = fromCanvasX(node.x() + sprite.width / 2);
		const logicalY = fromCanvasY(node.y() + sprite.height / 2);
		dispatch({ type: 'UPDATE_SPRITE', id: sprite.id, changes: { x: logicalX, y: logicalY } });
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
			const logicalX = fromCanvasX(node.x());
			const logicalY = fromCanvasY(node.y());
			changes.x = logicalX;
			changes.y = logicalY;
		} else {
			changes.x = fromCanvasX(node.x() + updatedWidth / 2);
			changes.y = fromCanvasY(node.y() + updatedHeight / 2);
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
			{isSelected && (
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
	const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
	const { state, dispatch } = useSprites();
	const [isPlaying, setIsPlaying] = useState(false);
	const spritesRef = useRef(state.sprites);
	spritesRef.current = state.sprites;

	const scale = stageSize.width / VIRTUAL_WIDTH;

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
						parts.push(`
// ${sprite.id}
window.RUNTIME?.setCurrentSprite(${JSON.stringify(sprite.id)});
${code}
`);
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
		if (!parentRef.current) return;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width: pw, height: ph } = entry.contentRect;
				const ratio = 16 / 9;
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
	}, []);

	const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
		const target = e.target;
		const isEmptyStageClick = target === target.getStage() || target.name() === 'background';
		if (isEmptyStageClick) {
			dispatch({ type: 'SELECT_SPRITE', id: null });
		}
	}, [dispatch]);

	const handlePlay = async () => {
		setIsPlaying(true);
		
		state.sprites.forEach(sprite => {
			const spriteData: Record<string, unknown> = {
				x: sprite.x,
				y: sprite.y,
				rotation: sprite.rotation,
				width: sprite.width,
				height: sprite.height,
				opacity: sprite.opacity,
				visible: sprite.visible,
				zIndex: sprite.zIndex,
			};

			if (sprite.type === 'text' && isTextData(sprite.data)) {
				spriteData.color = sprite.data.color;
			}

			const spriteProxy = new Proxy(spriteData, {
				get: (target, property) => {
					if (property === 'zIndex') {
						return spritesRef.current.find(s => s.id === sprite.id)?.zIndex ?? target.zIndex;
					}
					if (property === 'color') {
						const current = spritesRef.current.find(s => s.id === sprite.id);
						if (current && isTextData(current.data)) {
							return current.data.color;
						}
						return target.color;
					}
					return target[property as keyof typeof target];
				},
				set: (target, property, value) => {
					if (property === 'color') {
						const current = spritesRef.current.find(s => s.id === sprite.id);
						if (current && isTextData(current.data)) {
							target.color = value;
							dispatch({
								type: 'UPDATE_SPRITE',
								id: sprite.id,
								changes: {
									data: { ...current.data, color: value as string },
								},
							});
						}
						return true;
					}
					if (typeof property === 'string' && property in target) {
						target[property] = value;
						dispatch({
							type: 'UPDATE_SPRITE',
							id: sprite.id,
							changes: { [property]: value },
						});
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
		setIsPlaying(false);
	};

	const handleStop = () => {
		setIsPlaying(false);
		runtime.stop();
	};

	const sorted = [...state.sprites].sort((a, b) => a.zIndex - b.zIndex);

	return (
		<div className="stage-area panel">
			<div className="panel-header" style={{ justifyContent: 'space-between' }}>
				<div className="transport-controls" style={{ background: 'transparent', border: 'none', padding: 0 }}>
					<button className="transport-btn" title="Rewind">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z"/></svg>
					</button>
					<button
						className={`transport-btn ${isPlaying ? 'active' : ''}`}
						title="Play"
						onClick={handlePlay}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
					</button>
					<button
						className="transport-btn"
						title="Stop"
						onClick={handleStop}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
					</button>
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
						style={{ borderRadius: '4px', overflow: 'hidden' }}
					>
						<Layer>
							<Rect
								x={0}
								y={0}
								width={VIRTUAL_WIDTH}
								height={VIRTUAL_HEIGHT}
								name="background"
						fill="#1a1a1a"
							/>
							{sorted.map(sprite => (
								<SpriteRenderer
									key={sprite.id}
									sprite={sprite}
									isSelected={state.selectedSpriteId === sprite.id}
									onSelect={() => dispatch({ type: 'SELECT_SPRITE', id: sprite.id })}
								/>
							))}
						</Layer>
					</Stage>
				</div>
			</div>
		</div>
	);
}