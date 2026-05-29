import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";

Blockly.Blocks["text"] = {
  init: function () {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput(""), "TEXT");
    this.setOutput(true, "String");
    this.setStyle("text_blocks");
  },
};

javascriptGenerator.forBlock["text"] = function (block: Blockly.Block) {
  const code = JSON.stringify(block.getFieldValue("TEXT"));
  return [code, (javascriptGenerator as any).ORDER_ATOMIC];
};
