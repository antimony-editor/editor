import * as Blockly from "blockly";

const originalSetNext = Blockly.Block.prototype.setNextStatement;
if (typeof originalSetNext === "function") {
  Blockly.Block.prototype.setNextStatement = function (
    newBoolean: boolean,
    opt_check: any
  ) {
    let check = opt_check;
    if (newBoolean && (check === null || check === undefined)) {
      check = "default";
    }
    return originalSetNext.call(this, newBoolean, check);
  };
}

const originalSetPrev = Blockly.Block.prototype.setPreviousStatement;
if (typeof originalSetPrev === "function") {
  Blockly.Block.prototype.setPreviousStatement = function (
    newBoolean: boolean,
    opt_check: any
  ) {
    let check = opt_check;
    if (newBoolean && (check === null || check === undefined)) {
      check = "default";
    }
    return originalSetPrev.call(this, newBoolean, check);
  };
}

Object.entries(Blockly.Blocks).forEach(([_key, val]) => {
  if (val && typeof val.init === "function") {
    const originalInit = val.init;
    val.init = function () {
      originalInit.call(this);
    };
  }
});
