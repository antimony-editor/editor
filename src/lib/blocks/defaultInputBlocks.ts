import * as Blockly from "blockly/core";

export type DefaultInputBlockSpec = {
  blockType: string;
  inputName: string;
  defaultBlockType: string;
};

type RenderableBlock = Blockly.Block & {
  initSvg?: () => void;
  render?: () => void;
};

export function ensureDefaultInputBlocks(
  workspace: Blockly.WorkspaceSvg | Blockly.Workspace,
  specs: DefaultInputBlockSpec[],
) {
  for (const block of workspace.getAllBlocks(false)) {
    const spec = specs.find((entry) => entry.blockType === block.type);
    if (!spec) continue;

    const input = block.getInput(spec.inputName);
    if (!input || input.connection?.targetBlock()) continue;

    const defaultBlock = workspace.newBlock(spec.defaultBlockType);
    const renderedBlock = defaultBlock as RenderableBlock;

    renderedBlock.initSvg?.();
    renderedBlock.render?.();
    defaultBlock.moveBy(0, 0);

    const outputConnection = defaultBlock.outputConnection;
    if (outputConnection && input.connection) {
      outputConnection.connect(input.connection);
    }
  }
}
