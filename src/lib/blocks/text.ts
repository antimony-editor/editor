import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";
import { defineExpandableBlock, ExpandableBlock } from "./expandable";

const listDefaultValues = "abcdefghijklmnopqrstuvwxyz1234567890mangomustard67";

defineExpandableBlock({
  type: "text_create_with",
  style: "text_blocks",
  output: "String",
  initialItemCount: 2,
  minItemCount: 1,
  maxItemCount: Infinity,
  firstInputLabel: "join",
  tooltip: "Join text with any number of items.",
  slots: [
    {
      prefix: "ADD",
      shadow: index => ({
        type: "text",
        fields: { TEXT: listDefaultValues[index] ?? "" }
      })
    }
  ]
});

javascriptGenerator.forBlock["lists_create_with"] = function (block: Blockly.Block) {
  const expandableBlock = block as ExpandableBlock;
  const items: string[] = [];

  for (let i = 0; i < expandableBlock.itemCount_; i++) {
    const value = javascriptGenerator.valueToCode(block, `ADD${i}`, Order.NONE) || "null";
    items.push(value);
  }

  return [`[${items.join(", ")}]`, Order.ATOMIC];
};

Blockly.Blocks["text"] = {
  init: function () {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput(""), "TEXT");
    this.setOutput(true, "String");
    this.setStyle("text_blocks");
  }
};

javascriptGenerator.forBlock["text"] = function (block: Blockly.Block) {
  const code = JSON.stringify(block.getFieldValue("TEXT"));
  return [code, Order.ATOMIC];
};

Blockly.Blocks["text_setText"] = {
  init: function () {
    this.setMediaTypes("text");
    this.appendValueInput("TEXT").setCheck("String").appendField("set text to");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("text_blocks");
    this.setTooltip("Change the text content");
  }
};

javascriptGenerator.forBlock["text_setText"] = function (block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, "TEXT", Order.ATOMIC) || "''";
  return `context.sprite.text = ${text};\n`;
};

Blockly.Blocks["text_getText"] = {
  init: function () {
    this.setMediaTypes("text");
    this.appendDummyInput().appendField("get text");
    this.setOutput(true, "String");
    this.setStyle("text_blocks");
    this.setTooltip("Get the text content");
  }
};

javascriptGenerator.forBlock["text_getText"] = () => [`context.sprite.text`, Order.NONE];
