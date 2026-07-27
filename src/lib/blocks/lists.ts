import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { defineExpandableBlock, type ExpandableBlock } from "./expandable";

const listDefaultValues = "abcdefghijklmnopqrstuvwxyz1234567890mangomustard67";

defineExpandableBlock({
  type: "lists_create_with",
  style: "list_blocks",
  output: "Array",
  initialItemCount: 2,
  minItemCount: 0,
  maxItemCount: Infinity,
  emptyLabel: "empty list",
  firstInputLabel: "create list with",
  tooltip: "Create a list with any number of items.",
  slots: [
    {
      prefix: "ADD",
      shadow: (index) => ({
        type: "text",
        fields: { TEXT: listDefaultValues[index] ?? "" },
      }),
    },
  ],
});

javascriptGenerator.forBlock["lists_create_with"] = function (
  block: Blockly.Block,
) {
  const expandableBlock = block as ExpandableBlock;
  const items: string[] = [];

  for (let i = 0; i < expandableBlock.itemCount_; i++) {
    items.push(
      javascriptGenerator.valueToCode(block, `ADD${i}`, Order.NONE) || "''",
    );
  }

  return [`[${items.join(", ")}]`, Order.ATOMIC];
};

Blockly.Blocks["lists_parse"] = { // could there be a better name for this?
  init: function () {
    this.appendValueInput("TEXT").setCheck(null).appendField("parse");
    this.appendDummyInput().appendField("as list");
    this.setInputsInline(true);
    this.setOutput(true, "Array");
    this.setStyle("list_blocks");
    this.setTooltip(
      "Parse raw data as a list.",
    );
  },
};

javascriptGenerator.forBlock["lists_parse"] = function (block: Blockly.Block) {
  const text =
    javascriptGenerator.valueToCode(block, "TEXT", Order.NONE) || "''";
  const code = `(() => { try { const _p = JSON.parse(${text}); return Array.isArray(_p) ? _p : [_p]; } catch { return String(${text}).split(",").map((_s) => _s.trim()); } })()`;
// check if the input is a valid json array then use as is
// valid json but not an array then wrap it in a list
// not valid json then split by commas


  return [code, Order.FUNCTION_CALL];
};

export {};
