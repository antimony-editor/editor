<script lang="ts">
  import { onMount } from "svelte";
  import * as Blockly from "blockly/core";
  import "blockly/blocks";
  import { javascriptGenerator, Order } from "blockly/javascript";
  import * as En from "blockly/msg/en";

  import { initAllBlocks, workspaceConfig } from "$lib/config";

  let blocklyDiv: HTMLDivElement;
  let workspace: Blockly.WorkspaceSvg;

  onMount(() => {
    initAllBlocks();

    Blockly.setLocale(En as any);

    workspace = Blockly.inject(blocklyDiv, workspaceConfig);

    const onResize = () => {
      Blockly.svgResize(workspace);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      workspace.dispose();
    };
  });
</script>

<div class="grid-top">
  <div bind:this={blocklyDiv} class="blockly-container"></div>
  <div class="stage">the best thing ever goes here</div>
</div>

<style>
  @import "../styles/editor.css";
</style>
