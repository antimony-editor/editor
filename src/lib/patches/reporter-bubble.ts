import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import type { Dispatch } from "react";
import type { Sprite, SpriteAction } from "../sprites";
import type { SpriteContext } from "../runtime";
import "../../styles/editor.css";

type ReporterBlock = Blockly.BlockSvg;

type ReporterWorkspace = Blockly.WorkspaceSvg & {
    getSelected?(): ReporterBlock | null;
};

type ClickEventLike = Blockly.Events.Abstract & {
    targetType?: string;
    blockId?: string;
};

type RuntimeLike = {
    setCurrentSprite?: (id: string | null) => void;
    getStageSize?: () => { width: number; height: number };
    sprites?: Map<string, SpriteContext>;
};

export interface ReporterBubbleOptions {
    getSprites?: () => Sprite[];
    getSelectedSpriteId?: () => string | null;
    dispatch?: Dispatch<SpriteAction>;
}

const MAX_ARRAY_ITEMS = 7;
const BUBBLE_GAP = 8;
const HIDE_ANIMATION_MS = 140;
const EXECUTION_TIMEOUT_MS = 2000;

const TIMED_OUT = Symbol("timed-out");

const AsyncFunction = Object.getPrototypeOf(async function () { })
    .constructor as new (...args: string[]) => (...fnArgs: unknown[]) => Promise<unknown>;

const TOP_LEVEL_SPRITE_KEYS = new Set([
    "name",
    "x",
    "y",
    "width",
    "height",
    "rotation",
    "rotationOriginX",
    "rotationOriginY",
    "opacity",
    "visible",
    "locked",
    "zIndex",
    "tweenMode",
    "tweenModes",
    "blocklyXml",
    "data",
]);

const DATA_ALIASES: Record<string, string> = {
    text: "content",
};

function formatBubbleValue(value: unknown): string {
    try {
        return typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : String(value ?? "");
    } catch {
        return String(value);
    }
}

function classifyValue(value: unknown): string {
    if (typeof value === "number") return "reporter-bubble-number";
    if (typeof value === "boolean") return "reporter-bubble-boolean";
    if (typeof value !== "string") return "reporter-bubble-expression";

    const text = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(text)) return "reporter-bubble-number";
    if (/^(true|false)$/.test(text)) return "reporter-bubble-boolean";
    if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) return "reporter-bubble-colour";
    return "reporter-bubble-string";
}

function appendValue(container: HTMLElement, value: unknown, layer = 1): void {
    if (Array.isArray(value)) {
        if (layer >= 2) {
            const text = document.createElement("span");
            text.textContent = `Array(${value.length})`;
            text.style.fontStyle = "italic";
            container.appendChild(text);
            return;
        }

        const items = value.slice(0, MAX_ARRAY_ITEMS);
        items.forEach((item, index) => {
            appendValue(container, item, layer + 1);
            if (index < items.length - 1) {
                container.appendChild(document.createTextNode(", "));
            }
        });

        if (value.length > MAX_ARRAY_ITEMS) {
            if (items.length > 0) container.appendChild(document.createTextNode(", "));
            container.appendChild(
                document.createTextNode(`+${value.length - MAX_ARRAY_ITEMS} more`),
            );
        }

        return;
    }

    if (value instanceof Error) value = value.toString();

    const text = document.createElement("span");
    text.textContent = formatBubbleValue(value);
    container.appendChild(text);
}

function generateBlockCode(block: ReporterBlock): { code: string; definitions: string } {
    javascriptGenerator.init(block.workspace);

    const generated = javascriptGenerator.blockToCode(block) as
        | string
        | [string, number]
        | Array<unknown>;

    const code = Array.isArray(generated)
        ? String(generated[0] ?? "")
        : String(generated ?? "");


    const definitionMap = (
        javascriptGenerator as unknown as { definitions_?: Record<string, string> }
    ).definitions_;
    const definitions = definitionMap ? Object.values(definitionMap).join("\n") : "";

    try {
        javascriptGenerator.finish("");
    } catch {
        // ignore
    }

    return { code, definitions };
}

function makeEditorSpriteContext(
    spriteId: string,
    options: ReporterBubbleOptions,
): SpriteContext {
    const getLatest = () => options.getSprites?.().find((s) => s.id === spriteId);

    const spriteProxy = new Proxy({} as Record<string, unknown>, {
        get(_target, prop) {
            if (typeof prop !== "string") return undefined;
            const latest = getLatest();
            if (!latest) return undefined;
            if (prop in latest) {
                return (latest as unknown as Record<string, unknown>)[prop];
            }
            const data = latest.data as unknown as Record<string, unknown>;
            if (!data) return undefined;
            if (prop in data) return data[prop];
            const alias = DATA_ALIASES[prop];
            return alias && alias in data ? data[alias] : undefined;
        },
        set(_target, prop, value) {
            if (typeof prop !== "string") return true;
            const dispatch = options.dispatch;
            const latest = getLatest();
            if (!dispatch || !latest) return true;

            if (TOP_LEVEL_SPRITE_KEYS.has(prop)) {
                dispatch({
                    type: "UPDATE_SPRITE",
                    id: spriteId,
                    changes: { [prop]: value } as Partial<Omit<Sprite, "id" | "type">>,
                });
                return true;
            }

            const data = latest.data as unknown as Record<string, unknown>;
            if (!data) return true;
            const dataKey = prop in data ? prop : DATA_ALIASES[prop];
            if (dataKey && dataKey in data) {
                dispatch({
                    type: "UPDATE_SPRITE",
                    id: spriteId,
                    changes: {
                        data: { ...data, [dataKey]: value },
                    } as unknown as Partial<Omit<Sprite, "id" | "type">>,
                });
            }
            return true;
        },
        has(_target, prop) {
            if (typeof prop !== "string") return false;
            const latest = getLatest();
            if (!latest) return false;
            if (prop in latest) return true;
            const data = latest.data as unknown as Record<string, unknown>;
            if (!data) return false;
            if (prop in data) return true;
            const alias = DATA_ALIASES[prop];
            return !!alias && alias in data;
        },
    });

    return {
        sprite: spriteProxy as SpriteContext["sprite"],
        spriteId,
        dispatch: options.dispatch,
        getSprites: options.getSprites,
        getStageSize: () =>
            (window.RUNTIME as unknown as RuntimeLike | undefined)?.getStageSize?.() ?? {
                width: 480,
                height: 360,
            },
    };
}

async function extractBlockValue(
    block: ReporterBlock,
    options: ReporterBubbleOptions,
): Promise<{ value: unknown; error: boolean; skip?: boolean }> {
    try {
        const { code, definitions } = generateBlockCode(block);

        if (!code.trim()) {
            return { value: "(no value)", error: false };
        }

        const runtime = window.RUNTIME as unknown as RuntimeLike | undefined;
        if (!runtime) {
            return { value: "Runtime not available", error: true };
        }

        const registry = runtime.sprites;
        const spriteContextMap: Record<string, SpriteContext> =
            registry instanceof Map ? Object.fromEntries(registry) : {};

        for (const stateSprite of options.getSprites?.() ?? []) {
            if (!spriteContextMap[stateSprite.id]) {
                spriteContextMap[stateSprite.id] = makeEditorSpriteContext(
                    stateSprite.id,
                    options,
                );
            }
        }

        const preferredId =
            options.getSelectedSpriteId?.() ??
            (window as unknown as { __currentSpriteId?: string }).__currentSpriteId;

        const spriteId =
            preferredId && spriteContextMap[preferredId]
                ? preferredId
                : Object.keys(spriteContextMap)[0];

        const context = spriteId ? spriteContextMap[spriteId] : undefined;
        if (!spriteId || !context) {
            return { value: "No sprite context available", error: true };
        }

        runtime.setCurrentSprite?.(spriteId);

        const sprites = Object.entries(spriteContextMap);

        let fn: (...fnArgs: unknown[]) => Promise<unknown>;
        let isExpression = true;
        try {
            fn = new AsyncFunction(
                "sprites",
                "spriteContextMap",
                "context",
                `const runtimeRef = window.RUNTIME;\n${definitions}\nreturn (${code}\n);`,
            );
        } catch {
            isExpression = false;
            fn = new AsyncFunction(
                "sprites",
                "spriteContextMap",
                "context",
                `const runtimeRef = window.RUNTIME;\n${definitions}\n${code}`,
            );
        }

        const execution = Promise.resolve(fn(sprites, spriteContextMap, context));
        execution.catch(() => undefined);

        const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
            window.setTimeout(() => resolve(TIMED_OUT), EXECUTION_TIMEOUT_MS);
        });

        const result = await Promise.race([execution, timeout]);

        if (result === TIMED_OUT) {
            return { value: "(still running\u2026)", error: false };
        }

        if (!isExpression) {
            return { value: undefined, error: false, skip: true };
        }

        return { value: result, error: false };
    } catch (error) {
        return { value: error, error: true };
    }
}

export default function initReporterBubble(
    blocklyWorkspace: Blockly.WorkspaceSvg,
    containerElement: HTMLElement,
    options: ReporterBubbleOptions = {},
) {
    const layerElement = document.createElement("div");
    layerElement.className = "reporter-bubble-layer";
    containerElement.appendChild(layerElement);

    let bubbleElement: HTMLDivElement | null = null;
    let bubbleBlock: ReporterBlock | null = null;
    let openToken = 0;

    const getSelected = () => {
        return (blocklyWorkspace as ReporterWorkspace).getSelected?.() || null;
    };

    function removeBubbleNow(): void {
        if (!bubbleElement) return;
        bubbleElement.remove();
        bubbleElement = null;
        bubbleBlock = null;
    }

    function hideBubble(): void {
        const el = bubbleElement;
        if (!el) return;
        bubbleElement = null;
        bubbleBlock = null;
        openToken++; // stop pending things
        el.classList.remove("reporter-bubble-visible");
        window.setTimeout(() => el.remove(), HIDE_ANIMATION_MS);
    }

    function positionBubble(): void {
        if (!bubbleElement || !bubbleBlock) return;

        const svgRoot = bubbleBlock.getSvgRoot();
        if (!svgRoot) return;

        const blockRect = svgRoot.getBoundingClientRect();
        const layerRect = layerElement.getBoundingClientRect();

        const centerX = blockRect.left + blockRect.width / 2 - layerRect.left;
        const top = blockRect.bottom - layerRect.top + BUBBLE_GAP;

        bubbleElement.style.left = `${centerX - bubbleElement.offsetWidth / 2}px`;
        bubbleElement.style.top = `${top}px`;
    }

    function showBubble(block: ReporterBlock, value: unknown, error = false): void {
        removeBubbleNow();

        const svgRoot = block.getSvgRoot();
        if (!svgRoot) return;

        const bubble = document.createElement("div");
        bubble.className = "reporter-bubble";

        const box = document.createElement("div");
        box.className = "reporter-bubble-box";

        const content = document.createElement("div");
        content.className = "reporter-bubble-content";

        const valueElement = document.createElement("span");
        valueElement.className = `reporter-bubble-value ${error ? "reporter-bubble-error" : classifyValue(value)
            }`;
        appendValue(valueElement, value);
        content.appendChild(valueElement);

        const controls = document.createElement("div");
        controls.className = "reporter-bubble-controls";

        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "reporter-bubble-copy";
        copy.title = "Copy result";
        copy.textContent = "Copy";
        copy.addEventListener("click", (event) => {
            event.stopPropagation();
            navigator.clipboard.writeText(formatBubbleValue(value)).catch(() => undefined);
        });

        controls.appendChild(copy);
        box.appendChild(content);
        box.appendChild(controls);
        bubble.appendChild(box);
        layerElement.appendChild(bubble);

        bubbleElement = bubble;
        bubbleBlock = block;

        positionBubble();

        requestAnimationFrame(() => bubble.classList.add("reporter-bubble-visible"));
    }

    async function openForBlock(block: ReporterBlock | null): Promise<void> {
        if (!block || block.isShadow() || block.isInsertionMarker?.()) return;

        const token = ++openToken;
        const result = await extractBlockValue(block, options);

        if (token !== openToken) return;
        if (result.skip) return;

        showBubble(block, result.value, result.error);
    }

    function tryOpenFromClickEvent(event: ClickEventLike): void {
        if (
            event.type !== Blockly.Events.CLICK ||
            event.targetType !== "block" ||
            !event.blockId
        ) {
            return;
        }

        const block = blocklyWorkspace.getBlockById(event.blockId) as ReporterBlock | null;
        void openForBlock(block);
    }

    function onWorkspaceChange(event: Blockly.Events.Abstract): void {
        tryOpenFromClickEvent(event as ClickEventLike);
    }

    function onPointerDown(event: PointerEvent): void {
        if (!bubbleElement) return;

        const target = event.target;
        if (!(target instanceof Node)) return;

        if (!bubbleElement.contains(target)) {
            hideBubble();
        }
    }

    function onWindowResize(): void {
        positionBubble();
    }

    blocklyWorkspace.addChangeListener(onWorkspaceChange);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", onWindowResize);

    return {
        destroy() {
            blocklyWorkspace.removeChangeListener(onWorkspaceChange);
            document.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("resize", onWindowResize);
            openToken++;
            removeBubbleNow();
            layerElement.remove();
        },
        refresh() {
            const selected = getSelected();
            if (selected) void openForBlock(selected);
        },
    };
}