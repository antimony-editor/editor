import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import * as En from 'blockly/msg/en';
import { Stage, Layer, Rect, Text } from 'react-konva';

import { initAllBlocks, workspaceConfig } from './lib/config';
import './styles/editor.css';

export default function App() {
	const blocklyDivRef = useRef<HTMLDivElement | null>(null);
	const stageParentRef = useRef<HTMLDivElement | null>(null);
	const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const blocklyDiv = blocklyDivRef.current;

		if (!blocklyDiv) {
			return;
		}

		initAllBlocks();
		const locale = En as unknown as {
			[key: string]: string;
		};
		Blockly.setLocale(locale);

		const workspace = Blockly.inject(blocklyDiv, workspaceConfig);

		const handleResize = () => {
			Blockly.svgResize(workspace);
		};

		window.addEventListener('resize', handleResize);
		handleResize();

		return () => {
			window.removeEventListener('resize', handleResize);
			workspace.dispose();
		};
	}, []);

	useEffect(() => {
		if (!stageParentRef.current) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width: pWidth, height: pHeight } = entry.contentRect;
				const ratio = 16 / 9;
				let width = pWidth;
				let height = pWidth / ratio;

				if (height > pHeight) {
					height = pHeight;
					width = pHeight * ratio;
				}

				setStageSize({ width, height });
			}
		});

		resizeObserver.observe(stageParentRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div className="grid-top">
			<div ref={blocklyDivRef} className="blockly-container" />
			<div ref={stageParentRef} className="stage">
				<Stage width={stageSize.width} height={stageSize.height}>
					<Layer>
						<Rect
							x={0}
							y={0}
							width={stageSize.width}
							height={stageSize.height}
							fill="#1a1a1a"
						/>
						<Text
							text="Video Preview"
							fontSize={20}
							fill="white"
							x={20}
							y={20}
						/>
					</Layer>
				</Stage>
			</div>
		</div>
	);
}