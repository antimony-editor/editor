import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";

import "blockly/blocks";
import "@blockly/toolbox-search";

// todo: this is evil
import initReporterBubble from "../lib/patches/reporter-bubble";
(() => {
  try {
    const proc = [
      "procedures_defnoreturn",
      "procedures_defreturn",
      "procedures_callnoreturn",
      "procedures_callreturn"
    ];
    const blk = Blockly as unknown as { Blocks?: Record<string, unknown> };
    const gen = javascriptGenerator as unknown as {
      forBlock?: Record<string, unknown>;
    };
    for (const t of proc) {
      if (blk.Blocks && blk.Blocks[t]) delete blk.Blocks[t];
      if (gen.forBlock && gen.forBlock[t]) delete gen.forBlock[t];
    }
  } catch {}
})();
import * as En from "blockly/msg/en";
import {
  initAllBlocks,
  workspaceConfig,
  buildToolboxForSource,
  buildBlocklyTheme
} from "../lib/config";
import { getThemeColors, useTheme } from "../lib/themes";
import { getSourceTypeForSprite } from "../lib/blockVisibility";
import {
  MOTION_CATEGORY_NAME,
  updateMotionGoToFlyoutDefaults
} from "../lib/flyoutDefaults";
import "../lib/blocks/duplicateOnDrag";
import { subscribeExtensionChanges } from "../lib/extensions/manager";
import { useSprites } from "../lib/sprites";
import { Plus } from "lucide-react";

function darkenColor(hex: string, percent: number): string {
  const cleanHex = hex.replace(/^\s*#|\s*$/g, "");
  let r = 0,
    g = 0,
    b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    return hex;
  }

  r = Math.max(0, Math.floor(r * (1 - percent)));
  g = Math.max(0, Math.floor(g * (1 - percent)));
  b = Math.max(0, Math.floor(b * (1 - percent)));

  const rHex = r.toString(16).padStart(2, "0");
  const gHex = g.toString(16).padStart(2, "0");
  const bHex = b.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

function syncShadowColours(workspace: Blockly.WorkspaceSvg | Blockly.Workspace) {
  for (const block of workspace.getAllBlocks(false)) {
    if (!block.isShadow()) continue;
    const parent = block.getParent();
    if (!parent) continue;
    block.setColour(darkenColor(parent.getColour(), 0.15));
  }
}

function getFlyoutWorkspace(workspace: Blockly.WorkspaceSvg) {
  return workspace.getFlyout()?.getWorkspace() ?? null;
}

function applyMotionGoToFlyoutDefaults(
  workspace: Blockly.WorkspaceSvg,
  sprite: { x: number; y: number } | undefined
) {
  if (!sprite) return;
  requestAnimationFrame(() => {
    const flyoutWorkspace = getFlyoutWorkspace(workspace);
    if (!flyoutWorkspace) return;
    updateMotionGoToFlyoutDefaults(flyoutWorkspace, sprite.x, sprite.y);
    syncShadowColours(flyoutWorkspace);
  });
}

export default function BlocklyEditor({
  showMenu
}: {
  showMenu: Dispatch<SetStateAction<boolean>>;
}) {
  const blocklyDivRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const { state, dispatch } = useSprites();
  const stateRef = useRef(state);
  stateRef.current = state;
  const selectedSpriteId = state.selectedSpriteId;
  const selectedSprite = state.sprites.find(s => s.id === selectedSpriteId);
  const currentXml = selectedSprite?.blocklyXml;

  const loadedSpriteIdRef = useRef<string | null>(null);
  const lastLoadKeyRef = useRef<number>(state.loadKey);
  const selectedSpriteRef = useRef(selectedSprite);
  selectedSpriteRef.current = selectedSprite;
  const isSwappingRef = useRef(false);
  const [toolboxWidth, setToolboxWidth] = useState(0);

  useEffect(() => {
    if (workspaceRef.current) {
      const workspace = workspaceRef.current;
      (workspace as any).sprites = state.sprites;
      (workspace as any).spriteId = selectedSpriteId;

      const flyoutWorkspace = getFlyoutWorkspace(workspace);
      if (flyoutWorkspace) {
        (flyoutWorkspace as any).sprites = state.sprites;
        (flyoutWorkspace as any).spriteId = selectedSpriteId;
      }

      const blocks = workspace.getAllBlocks(false);
      for (const block of blocks) {
        for (const input of block.inputList) {
          for (const field of input.fieldRow) {
            if (field instanceof Blockly.FieldDropdown) {
              try {
                const options = (field as any).getOptions(false);
                const value = field.getValue();

                if (value === "" && options.length > 0 && options[0][1] !== "") {
                  field.setValue(options[0][1]);
                } else if (value !== null && value !== undefined) {
                  field.setValue(value);
                }
              } catch (e) {}
            }
          }
        }
      }
    }
  }, [state.sprites, selectedSpriteId]);

  useEffect(() => {
    const blocklyDiv = blocklyDivRef.current;
    if (!blocklyDiv) return;

    initAllBlocks();
    const locale = En as unknown as { [key: string]: string };
    Blockly.setLocale(locale);

    const workspace = Blockly.inject(blocklyDiv, workspaceConfig);
    workspaceRef.current = workspace;
    (window as any).debugWorkspace = workspace;
    const reporter = initReporterBubble(workspace, blocklyDiv, {
      getSprites: () => stateRef.current.sprites,
      getSelectedSpriteId: () => stateRef.current.selectedSpriteId,
      dispatch,
    });
    (workspace as any).spriteId = selectedSpriteId;
    (workspace as any).sprites = state.sprites;
    if (selectedSprite) {
      workspace.updateToolbox(
        buildToolboxForSource(getSourceTypeForSprite(selectedSprite.type))
      );
    }
    const refreshToolbox = () => {
      const sourceType = selectedSpriteRef.current
        ? getSourceTypeForSprite(selectedSpriteRef.current.type)
        : "all";
      workspace.updateToolbox(buildToolboxForSource(sourceType));
    };
    const unsubscribeExtensions = subscribeExtensionChanges(refreshToolbox);
    syncShadowColours(workspace);

    const flyoutWorkspace = getFlyoutWorkspace(workspace);
    if (flyoutWorkspace) syncShadowColours(flyoutWorkspace);

    const toolbox = blocklyDiv.querySelector(".blocklyToolbox");
    let toolboxObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const attachToolboxObserver = (el: Element) => {
      toolboxObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          setToolboxWidth(entry.contentRect.width);
        }
      });
      toolboxObserver.observe(el);
    };

    if (toolbox) {
      attachToolboxObserver(toolbox);
    } else {
      mutationObserver = new MutationObserver(() => {
        const found = blocklyDiv.querySelector(".blocklyToolbox");
        if (found) {
          mutationObserver?.disconnect();
          mutationObserver = null;
          attachToolboxObserver(found);
        }
      });
      mutationObserver.observe(blocklyDiv, { childList: true, subtree: true });
    }

    if (selectedSprite && selectedSprite.blocklyXml) {
      isSwappingRef.current = true;
      try {
        const dom = Blockly.utils.xml.textToDom(selectedSprite.blocklyXml);
        Blockly.Xml.domToWorkspace(dom, workspace);
      } catch (e) {}
      isSwappingRef.current = false;
    }
    loadedSpriteIdRef.current = selectedSpriteId;

    const handleWorkspaceChange = (e: Blockly.Events.Abstract) => {
      syncShadowColours(workspace);
      const fw = getFlyoutWorkspace(workspace);
      if (fw) syncShadowColours(fw);

      if (
        e.type === Blockly.Events.TOOLBOX_ITEM_SELECT &&
        "newItem" in e &&
        e.newItem === MOTION_CATEGORY_NAME
      ) {
        applyMotionGoToFlyoutDefaults(workspace, selectedSpriteRef.current);
      }

      if (isSwappingRef.current) return;
      if (e.isUiEvent) return;
      if ("workspaceId" in e && e.workspaceId !== workspace.id) return;

      const currentSpriteId = loadedSpriteIdRef.current;
      if (!currentSpriteId) return;

      const xmlDom = Blockly.Xml.workspaceToDom(workspace);
      const xmlText = Blockly.Xml.domToText(xmlDom);

      dispatch({
        type: "UPDATE_SPRITE",
        id: currentSpriteId,
        changes: { blocklyXml: xmlText }
      });
    };

    workspace.addChangeListener(handleWorkspaceChange);
    flyoutWorkspace?.addChangeListener(handleWorkspaceChange);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = blocklyDiv.offsetWidth;
    let lastHeight = blocklyDiv.offsetHeight;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      if (width === lastWidth && height === lastHeight) return;

      lastWidth = width;
      lastHeight = height;

      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        Blockly.svgResize(workspace);
      }, 50);
    });

    observer.observe(blocklyDiv);

    return () => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      toolboxObserver?.disconnect();
      observer.disconnect();
      unsubscribeExtensions();
      workspace.removeChangeListener(handleWorkspaceChange);
      flyoutWorkspace?.removeChangeListener(handleWorkspaceChange);
      try { reporter?.destroy?.(); } catch (e) { }
      workspace.dispose();
    };
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    if (
      loadedSpriteIdRef.current === selectedSpriteId &&
      lastLoadKeyRef.current === state.loadKey
    ) {
      return;
    }

    isSwappingRef.current = true;
    (workspace as any).spriteId = selectedSpriteId;
    (workspace as any).sprites = state.sprites;

    workspace.clear();

    if (currentXml) {
      try {
        const dom = Blockly.utils.xml.textToDom(currentXml);
        Blockly.Xml.domToWorkspace(dom, workspace);
      } catch (e) {}
    }

    workspace.render?.();
    Blockly.svgResize(workspace);

    requestAnimationFrame(() => {
      for (const block of workspace.getTopBlocks(false)) {
        block.render();
      }
    });

    loadedSpriteIdRef.current = selectedSpriteId;
    lastLoadKeyRef.current = state.loadKey;
    isSwappingRef.current = false;
  }, [selectedSpriteId, currentXml, state.loadKey]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const sourceType = selectedSprite
      ? getSourceTypeForSprite(selectedSprite.type)
      : "all";
    workspace.updateToolbox(buildToolboxForSource(sourceType));
  }, [selectedSprite?.type, selectedSpriteId]);

  const { theme } = useTheme();
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const colors = getThemeColors(theme.preset, theme.custom);
    const blocklyTheme = buildBlocklyTheme(colors);
    workspace.setTheme(blocklyTheme);
  }, [theme]);

  return (
    <div className="blockly-area panel">
      <div ref={blocklyDivRef} className="blockly-container" />
      {!selectedSpriteId && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(17, 17, 19, 0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            color: "var(--text-secondary)",
            fontSize: "13px",
            fontWeight: 500,
            pointerEvents: "all",
            textAlign: "center",
            userSelect: "none",
            paddingLeft: `${toolboxWidth}px`,
            boxSizing: "border-box"
          }}
        >
          Select a source to view and edit its blocks
        </div>
      )}

      {selectedSpriteId && (
        <div className="add-extension-button" onClick={() => showMenu(true)}>
          <Plus className="icon"/>
          <p className="button-text">Add an extension</p>
        </div>
      )}
    </div>
  );
}
