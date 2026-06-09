import * as Blockly from 'blockly';

export const MOTION_CATEGORY_NAME = 'Motion';

export function formatSpriteCoord(value: number): string {
	return String(Math.round(value * 100) / 100);
}

function setShadowNumberInput(block: Blockly.Block, inputName: string, value: number) {
	const shadow = block.getInput(inputName)?.connection?.targetBlock();
	if (!shadow?.isShadow() || shadow.type !== 'math_number') return;
	shadow.setFieldValue(formatSpriteCoord(value), 'NUM');
}

export function updateMotionGoToFlyoutDefaults(
	flyoutWorkspace: Blockly.Workspace,
	x: number,
	y: number,
) {
	for (const block of flyoutWorkspace.getTopBlocks(false)) {
		if (block.type !== 'motion_goTo') continue;
		setShadowNumberInput(block, 'X', x);
		setShadowNumberInput(block, 'Y', y);
	}
}
