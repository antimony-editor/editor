import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
// i made this like stinky but it works
const DEFINE_TYPE = "procedures_defnoreturn";
const CALL_STATEMENT = "procedures_callnoreturn";
const CALL_REPORTER = "procedures_callreturn";
const RETURN_TYPE = "procedures_return";

Blockly.Blocks[RETURN_TYPE] = {
  init: function () {
    this.appendValueInput("VALUE").appendField("return");
    this.setPreviousStatement(true, null);
    this.setStyle("procedure_blocks");
    this.setTooltip(
      "Return a value (if used with a function it'll turn the block into a reporter)",
    );
  },
};

javascriptGenerator.forBlock[RETURN_TYPE] = function (block: Blockly.Block) {
  const value =
    javascriptGenerator.valueToCode(block, "VALUE", Order.NONE) || "undefined";
  return `return ${value};\n`;
};

function definitionReturns(def: Blockly.Block): boolean {
  return def
    .getDescendants(false)
    .some((descendant) => descendant.type === RETURN_TYPE);
}

export function functionsFlyout(
  workspace: Blockly.WorkspaceSvg,
): Blockly.utils.toolbox.FlyoutItemInfo[] {
  const items: Blockly.utils.toolbox.FlyoutItemInfo[] = [
    { kind: "block", type: DEFINE_TYPE },
    {
      kind: "block",
      type: RETURN_TYPE,
      inputs: {
        VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      },
    },
  ];

  const [proceduresNoReturn] = Blockly.Procedures.allProcedures(workspace);
  for (const [name, params] of proceduresNoReturn) {
    const def = Blockly.Procedures.getDefinition(name, workspace);
    const reporter = def ? definitionReturns(def) : false;
    items.push({
      kind: "block",
      type: reporter ? CALL_REPORTER : CALL_STATEMENT,
      extraState: { name, params },
    });
  }

  return items;
}

function copyMutation(from: Blockly.Block, to: Blockly.Block): void {
  if (from.saveExtraState && to.loadExtraState) {
    const state = from.saveExtraState();
    if (state != null) to.loadExtraState(state);
  } else if (from.mutationToDom && to.domToMutation) {
    const dom = from.mutationToDom();
    if (dom) to.domToMutation(dom);
  }
}

function replaceCaller(caller: Blockly.BlockSvg, newType: string): void {
  const workspace = caller.workspace;
  const position = caller.getRelativeToSurfaceXY();

  const replacement = workspace.newBlock(newType) as Blockly.BlockSvg;
  copyMutation(caller, replacement);
  replacement.initSvg();

  for (const input of caller.inputList) {
    const connection = input.connection;
    if (!connection || connection.type !== Blockly.ConnectionType.INPUT_VALUE)
      continue;
    const target = connection.targetConnection;
    const newConnection = replacement.getInput(input.name)?.connection;
    if (target && newConnection) newConnection.connect(target);
  }

  const prevTarget = caller.previousConnection?.targetConnection ?? null;
  const nextTarget = caller.nextConnection?.targetConnection ?? null;

  replacement.render();
  replacement.moveBy(position.x, position.y);

  if (newType === CALL_STATEMENT) {
    if (prevTarget && replacement.previousConnection)
      prevTarget.connect(replacement.previousConnection);
    if (nextTarget && replacement.nextConnection)
      replacement.nextConnection.connect(nextTarget);
  }

  caller.dispose(false);
}

let syncing = false;

export function syncProcedureReturns(workspace: Blockly.WorkspaceSvg): void {
  if (syncing) return;
  syncing = true;
  Blockly.Events.disable();
  try {
    for (const def of workspace.getBlocksByType(DEFINE_TYPE, false)) {
      const name = def.getFieldValue("NAME");
      if (!name) continue;
      const wanted = definitionReturns(def) ? CALL_REPORTER : CALL_STATEMENT;
      for (const caller of Blockly.Procedures.getCallers(
        name,
        workspace,
      ) as Blockly.BlockSvg[]) {
        if (caller.type !== wanted) replaceCaller(caller, wanted);
      }
    }
  } finally {
    Blockly.Events.enable();
    syncing = false;
  }
}

export {};
