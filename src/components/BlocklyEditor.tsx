import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

import 'blockly/blocks';

(() => {
	try {
		const proc = [
			'procedures_defnoreturn',
			'procedures_defreturn',
			'procedures_callnoreturn',
			'procedures_callreturn',
		];
		const blk = Blockly as unknown as { Blocks?: Record<string, unknown> };
		const gen = javascriptGenerator as unknown as { forBlock?: Record<string, unknown> };
		for (const t of proc) {
			if (blk.Blocks && blk.Blocks[t]) delete blk.Blocks[t];
			if (gen.forBlock && gen.forBlock[t]) delete gen.forBlock[t];
		}
	} catch {
		// ignore
	}
})();
import * as En from 'blockly/msg/en';
import { initAllBlocks, workspaceConfig, buildToolboxForSource } from '../lib/config';
import { getSourceTypeForSprite } from '../lib/blockVisibility';
import { useSprites } from '../lib/sprites';

function syncShadowColours(workspace: Blockly.WorkspaceSvg | Blockly.Workspace) {
	for (const block of workspace.getAllBlocks(false)) {
		if (!block.isShadow()) continue;
		const parent = block.getParent();
		if (!parent) continue;
		block.setColour(parent.getColour());
	}
}

function ensureForLoopVariableBlocks(workspace: Blockly.WorkspaceSvg | Blockly.Workspace) {
	for (const block of workspace.getAllBlocks(false)) {
		if (block.type !== 'controls_forLoop') continue;
		const input = block.getInput('VAR');
		if (!input || input.connection?.targetBlock()) continue;

		const variableBlock = workspace.newBlock('controls_forLoop_var');
		const renderedVariableBlock = variableBlock as unknown as { initSvg?: () => void; render?: () => void };
		renderedVariableBlock.initSvg?.();
		renderedVariableBlock.render?.();
		variableBlock.moveBy(0, 0);

		const outputConnection = variableBlock.outputConnection;
		if (outputConnection && input.connection) {
			outputConnection.connect(input.connection);
		}
	}
}


function getFlyoutWorkspace(workspace: Blockly.WorkspaceSvg) {
	return workspace.getFlyout()?.getWorkspace() ?? null;
}

export default function BlocklyEditor() {
	const blocklyDivRef = useRef<HTMLDivElement | null>(null);
	const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
	const { state, dispatch } = useSprites();
	const selectedSpriteId = state.selectedSpriteId;
	const selectedSprite = state.sprites.find(s => s.id === selectedSpriteId);

	const loadedSpriteIdRef = useRef<string | null>(null);
	const lastLoadKeyRef = useRef<number>(state.loadKey);
	const isSwappingRef = useRef(false);
	const [toolboxWidth, setToolboxWidth] = useState(0);

	useEffect(() => {
		const blocklyDiv = blocklyDivRef.current;
		if (!blocklyDiv) return;

		initAllBlocks();
		const locale = En as unknown as { [key: string]: string };
		Blockly.setLocale(locale);

		const workspace = Blockly.inject(blocklyDiv, workspaceConfig);
		workspaceRef.current = workspace;
		if (selectedSprite) {
			workspace.updateToolbox(buildToolboxForSource(getSourceTypeForSprite(selectedSprite.type)));
		}
		syncShadowColours(workspace);

		const flyoutWorkspace = getFlyoutWorkspace(workspace);
		if (flyoutWorkspace) syncShadowColours(flyoutWorkspace);

		const toolbox = blocklyDiv.querySelector('.blocklyToolbox');
		let toolboxObserver: ResizeObserver | null = null;
		let mutationObserver: MutationObserver | null = null;

		const attachToolboxObserver = (el: Element) => {
			toolboxObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					setToolboxWidth(entry.contentRect.width);
				}
			});
			toolboxObserver.observe(el);
		};

		if (toolbox) {
			attachToolboxObserver(toolbox);
		} else {
			mutationObserver = new MutationObserver(() => {
				const found = blocklyDiv.querySelector('.blocklyToolbox');
				if (found) {
					mutationObserver?.disconnect();
					mutationObserver = null;
					attachToolboxObserver(found);
				}
			});
			mutationObserver.observe(blocklyDiv, { childList: true, subtree: true });
		}

		if (selectedSprite && selectedSprite.blocklyXml) {
			isSwappingRef.current = true;
			try {
				const dom = Blockly.utils.xml.textToDom(selectedSprite.blocklyXml);
				Blockly.Xml.domToWorkspace(dom, workspace);
			} catch (e) {
				console.error(e);
			}
			isSwappingRef.current = false;
		}
		loadedSpriteIdRef.current = selectedSpriteId;

		const handleWorkspaceChange = (e: Blockly.Events.Abstract) => {
			ensureForLoopVariableBlocks(workspace);
			syncShadowColours(workspace);
			const fw = getFlyoutWorkspace(workspace);
			if (fw) syncShadowColours(fw);

			if (isSwappingRef.current) return;
			if (e.isUiEvent) return;

			const currentSpriteId = loadedSpriteIdRef.current;
			if (!currentSpriteId) return;

			const xmlDom = Blockly.Xml.workspaceToDom(workspace);
			const xmlText = Blockly.Xml.domToText(xmlDom);

			dispatch({
				type: 'UPDATE_SPRITE',
				id: currentSpriteId,
				changes: { blocklyXml: xmlText }
			});
		};

		workspace.addChangeListener(handleWorkspaceChange);
		flyoutWorkspace?.addChangeListener(handleWorkspaceChange);

		const observer = new ResizeObserver(() => Blockly.svgResize(workspace));
		observer.observe(blocklyDiv);

		return () => {
			toolboxObserver?.disconnect();
			observer.disconnect();
			workspace.removeChangeListener(handleWorkspaceChange);
			flyoutWorkspace?.removeChangeListener(handleWorkspaceChange);
			workspace.dispose();
		};
	}, []);

	useEffect(() => {
		const workspace = workspaceRef.current;
		if (!workspace) return;

		if (selectedSpriteId === loadedSpriteIdRef.current && state.loadKey === lastLoadKeyRef.current) return;

		isSwappingRef.current = true;
		workspace.clear();

		const activeSprite = state.sprites.find(s => s.id === selectedSpriteId);
		if (activeSprite && activeSprite.blocklyXml) {
			try {
				const dom = Blockly.utils.xml.textToDom(activeSprite.blocklyXml);
				Blockly.Xml.domToWorkspace(dom, workspace);
			} catch (e) {
				console.error(e);
			}
		}
		loadedSpriteIdRef.current = selectedSpriteId;
		lastLoadKeyRef.current = state.loadKey;
		isSwappingRef.current = false;
	}, [selectedSpriteId, state.loadKey]);

	useEffect(() => {
		const workspace = workspaceRef.current;
		if (!workspace) return;

		const sourceType = selectedSprite
			? getSourceTypeForSprite(selectedSprite.type)
			: 'all';
		workspace.updateToolbox(buildToolboxForSource(sourceType));
	}, [selectedSprite?.type, selectedSpriteId]);

	return (
		<div className="blockly-area panel">
			<div ref={blocklyDivRef} className="blockly-container" />
			{!selectedSpriteId && (
				<div style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(17, 17, 19, 0.85)',
					backdropFilter: 'blur(4px)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 50,
					color: 'var(--text-secondary)',
					fontSize: '13px',
					fontWeight: 500,
					pointerEvents: 'all',
					textAlign: 'center',
					userSelect: 'none',
					paddingLeft: `${toolboxWidth}px`,
					boxSizing: 'border-box'
				}}>
					Select a source to view and edit its blocks
				</div>
			)}
		</div>
	);
}
