import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { defineExpandableBlock, type ExpandableBlock } from "./expandable";

const dictDefaultKeys = ["key1", "key2", "key3", "key4", "key5", "key6"];
const dictDefaultValues = ["value1", "value2", "value3", "value4", "value5", "value6"];

defineExpandableBlock({
  type: "dicts_create_with",
  style: "dict_blocks",
  output: "Object",
  outputShape: 3,
  initialItemCount: 2,
  minItemCount: 0,
  maxItemCount: Infinity,
  emptyLabel: "create empty dictionary",
  firstInputLabel: "create dictionary with",
  inputsInline: true,
  tooltip: "Create a dictionary with any number of key-value pairs.",
  slots: [
    {
      prefix: "KEY",
      check: "String",
      shadow: (index) => ({
        type: "text",
        fields: { TEXT: dictDefaultKeys[index] ?? "key" },
      }),
    },
    {
      prefix: "VALUE",
      shadow: (index) => ({
        type: "text",
        fields: { TEXT: dictDefaultValues[index] ?? "value" },
      }),
      appendLabels: [":"],
    },
  ],
});

javascriptGenerator.forBlock["dicts_create_with"] = function (
  block: Blockly.Block,
) {
  const expandableBlock = block as ExpandableBlock;
  const pairs: string[] = [];

  for (let i = 0; i < expandableBlock.itemCount_; i++) {
    const keyCode =
      javascriptGenerator.valueToCode(block, `KEY${i}`, Order.NONE) || "''";
    const valueCode =
      javascriptGenerator.valueToCode(block, `VALUE${i}`, Order.NONE) || "''";
    pairs.push(`${keyCode}: ${valueCode}`);
  }

  return [`{ ${pairs.join(", ")} }`, Order.ATOMIC];
};

Blockly.Blocks["dicts_get_value"] = {
  init: function () {
    this.appendValueInput("DICT")
      .setCheck("Object")
      .appendField("get value from dictionary");
    this.appendValueInput("KEY")
      .setCheck("String")
      .appendField("with key");
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setStyle("dict_blocks");
    this.setTooltip("Get a value from a dictionary by key");
  },
};

javascriptGenerator.forBlock["dicts_get_value"] = function (
  block: Blockly.Block,
) {
  const dictCode =
    javascriptGenerator.valueToCode(block, "DICT", Order.MEMBER) || "{}";
  const keyCode =
    javascriptGenerator.valueToCode(block, "KEY", Order.NONE) || "''";
  return [`${dictCode}[${keyCode}]`, Order.MEMBER];
};

export {};
