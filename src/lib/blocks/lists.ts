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

export {};
