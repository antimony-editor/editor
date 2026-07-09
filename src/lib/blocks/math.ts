import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

Blockly.Blocks["math_constants"] = {
  init: function () {
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ["π", "PI"],
        ["τ", "TAU"],
        ["e", "E"],
        ["φ", "PHI"],
        ["√2", "SQRT2"],
        ["√3", "SQRT3"],
      ]),
      "CONSTANT",
    );
    this.setOutput(true, "Number");
    this.setStyle("math_blocks");
    this.setTooltip("A mathematical constant.");
  },
};

javascriptGenerator.forBlock["math_constant"] = function (
  block: Blockly.Block,
) {
  const constant = block.getFieldValue("CONSTANT");

  const values: Record<string, string> = {
    PI: "Math.PI",
    TAU: "2 * Math.PI",
    E: "Math.E",
    PHI: "(1 + Math.sqrt(5)) / 2",
    SQRT2: "Math.SQRT2",
    SQRT3: "Math.sqrt(3)",
  };
  const order =
    constant === "TAU" || constant === "PHI"
      ? Order.MULTIPLICATION
      : Order.ATOMIC;

  return [values[constant], order];
};

export {};
