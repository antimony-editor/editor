import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["text"] = {
  init: function () {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput(""), "TEXT");
    this.setOutput(true, "String");
    this.setStyle("text_blocks");
  },
};

javascriptGenerator.forBlock["text"] = function (block: Blockly.Block) {
  const code = JSON.stringify(block.getFieldValue("TEXT"));
  return [code, Order.ATOMIC];
};

Blockly.Blocks["text_setText"] = {
  init: function () {
    this.appendValueInput("TEXT").setCheck("String").appendField("set text to");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setStyle("text_blocks");
    this.setTooltip("Change the text content");
  },
};

javascriptGenerator.forBlock["text_setText"] = function (block: Blockly.Block) {
  const text =
    javascriptGenerator.valueToCode(block, "TEXT", Order.ATOMIC) || "''";
  return `context.sprite.text = ${text};\n`;
};
