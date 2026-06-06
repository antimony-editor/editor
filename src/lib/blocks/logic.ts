import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import Checkbox from "../patches/checkbox";

Blockly.Blocks["checkbox"] = {
    init: function () {
        this.appendDummyInput().appendField(new Checkbox("false"), "BOOL");
        this.setOutput(true, "Boolean");
        this.setStyle("logic_blocks");
    },
};

javascriptGenerator.forBlock["checkbox"] = function (block: Blockly.Block) {
    return [block.getFieldValue("BOOL") === "TRUE" ? "true" : "false", Order.ATOMIC];
};

javascriptGenerator.forBlock["controls_whileUntil"] = function (block: Blockly.Block) {
    const condition = javascriptGenerator.valueToCode(
        block,
        "BOOL",
        Order.NONE
    ) || "false";
    
    const statements = javascriptGenerator.statementToCode(block, "DO");
    
    const mode = block.getFieldValue("MODE");
    const isUntil = mode === "UNTIL";
    
    const actualCondition = isUntil ? `!(${condition})` : condition;
    
    return `await (async () => {
  let _whileIterations = 0;
  while (${actualCondition}) {
    if (window.RUNTIME.isStopped()) break;
    ${statements}
    if (++_whileIterations % 100 === 0) await window.RUNTIME.delay(0);
  }
})();\n`;
};
