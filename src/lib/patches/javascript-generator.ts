import { javascriptGenerator } from "blockly/javascript";

javascriptGenerator.INFINITE_LOOP_TRAP = `if (window.RUNTIME.isStopped()) return;
await window.RUNTIME.delay(1);`;

["window", "RUNTIME", "Math", "context", "procedures", "skibidiToilet"].forEach(i => {
  javascriptGenerator.addReservedWords(i);
});
