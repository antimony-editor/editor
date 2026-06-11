import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

const forLoopVarBlock = {
    init: function (this: Blockly.Block) {
        this.appendDummyInput().appendField("i");
        this.setOutput(true, "Number");
        this.setStyle("loop_blocks");
        this.setTooltip("The current value of i in the for loop.");
    },
};

Blockly.Blocks["controls_forLoop_var"] = forLoopVarBlock;
Blockly.Blocks["loops_i"] = forLoopVarBlock;

javascriptGenerator.forBlock["controls_forLoop_var"] = function () {
    return ["i", Order.ATOMIC];
};

javascriptGenerator.forBlock["loops_i"] = javascriptGenerator.forBlock["controls_forLoop_var"];

Blockly.Blocks["controls_forLoop"] = {
    init() {
        this.appendValueInput("VAR").appendField("for each");
        this.appendValueInput("START").setCheck("Number").appendField("in range");
        this.appendValueInput("END").setCheck("Number").appendField("to");
        this.appendStatementInput("DO").setCheck("default").appendField("do");
        this.setInputsInline(true);
        this.setPreviousStatement(true, "default");
        this.setNextStatement(true, "default");
        this.setStyle("loop_blocks");
        this.setTooltip("Runs the code for each value of i from start to end (inclusive).");
    },
};

Blockly.Blocks["controls_forever"] = {
    init(this: Blockly.Block) {
        this.appendDummyInput().appendField("forever");
        this.appendStatementInput("DO");
        this.setPreviousStatement(true, null);
        this.setNextStatement(false);
        this.setStyle("loop_blocks");
        this.setTooltip("Loops forever.");
    },
};

javascriptGenerator.forBlock["controls_forever"] = function (block: Blockly.Block) {
    const body = javascriptGenerator.statementToCode(block, "DO");
    return `
        await (async () => { while (true) { 
            if (window.RUNTIME.isStopped()) break;
            ${body}
            await window.RUNTIME.delay(1);
        }})();
    `; // it blows up without the delay haha
};

javascriptGenerator.forBlock["controls_forLoop"] = function (block: Blockly.Block) {
    const variableName = javascriptGenerator.valueToCode(block, "VAR", Order.NONE) || "i";
    const start = javascriptGenerator.valueToCode(block, "START", Order.NONE) || "0";
    const end = javascriptGenerator.valueToCode(block, "END", Order.NONE) || "0";
    const body = javascriptGenerator.statementToCode(block, "DO");

    return `for (let ${variableName} = ${start}; ${variableName} <= ${end}; ${variableName}++) {
${body}}
`;
};
