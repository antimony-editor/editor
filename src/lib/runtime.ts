import type { Sprite, SpriteAction } from './sprites';
import type { Dispatch } from 'react';

type EventHandler = (_: unknown) => void | Promise<void>; // eslint-disable-line @typescript-eslint/no-unused-vars

class StopError extends Error {
    constructor() {
        super('Stopped');
        this.name = 'StopError';
    }
}

export interface SpriteContext {
    sprite: {
        x: number;
        y: number;
        rotation: number;
        width: number;
        height: number;
        opacity: number;
        visible: boolean;
        zIndex: number;
        color?: string;
    };
    spriteId?: string;
    dispatch?: Dispatch<SpriteAction>;
    getSprites?: () => Sprite[];
    [key: string]: unknown;
}

declare global {
    interface Window {
        RUNTIME?: Runtime;
        __currentSpriteId?: string;
    }
}

class Runtime {
    private spriteHandlers: Map<string, Map<string, EventHandler[]>> = new Map();
    private compiler: (() => string) | null = null;
    private sprites: Map<string, SpriteContext> = new Map();
    private currentSpriteId: string | null = null;
    private stopped = false;
    private activeTimeouts = new Set<ReturnType<typeof setTimeout>>();
    private pendingDelays = new Set<(error: StopError) => void>();

    registerSprite(spriteId: string, context: SpriteContext) {
        this.sprites.set(spriteId, context);
        if (!this.spriteHandlers.has(spriteId)) {
            this.spriteHandlers.set(spriteId, new Map());
        }
    }

    unregisterSprite(spriteId: string) {
        this.sprites.delete(spriteId);
        this.spriteHandlers.delete(spriteId);
    }

    setCurrentSprite(spriteId: string | null) {
        this.currentSpriteId = spriteId;
        if (typeof window !== 'undefined') {
            window.__currentSpriteId = spriteId ?? undefined;
        }
    }

    on(event: string, handler: EventHandler) {
        const spriteId = this.currentSpriteId;
        if (!spriteId) {
            console.warn('Attempted to register handler without current sprite');
            return () => {};
        }

        const spriteEvents = this.spriteHandlers.get(spriteId) ?? new Map();
        const list = spriteEvents.get(event) ?? [];
        list.push(handler);
        spriteEvents.set(event, list);
        this.spriteHandlers.set(spriteId, spriteEvents);

        return () => this.off(event, handler);
    }

    off(event: string, handler?: EventHandler) {
        const spriteId = this.currentSpriteId;
        if (!spriteId) return;

        const spriteEvents = this.spriteHandlers.get(spriteId);
        if (!spriteEvents) return;

        if (!handler) {
            spriteEvents.delete(event);
            return;
        }

        const list = spriteEvents.get(event) ?? [];
        spriteEvents.set(event, list.filter(h => h !== handler));
    }

    clearHandlers() {
        this.spriteHandlers.clear();
    }

    isStopped() {
        return this.stopped;
    }

    delay(ms: number): Promise<void> {
        if (this.stopped) {
            return Promise.reject(new StopError());
        }

        return new Promise((resolve, reject) => {
            const rejectDelay = (error: StopError) => {
                this.pendingDelays.delete(rejectDelay);
                reject(error);
            };
            this.pendingDelays.add(rejectDelay);

            const id = setTimeout(() => {
                this.activeTimeouts.delete(id);
                this.pendingDelays.delete(rejectDelay);
                if (this.stopped) {
                    reject(new StopError());
                } else {
                    resolve();
                }
            }, ms);
            this.activeTimeouts.add(id);
        });
    }

    stop() {
        this.stopped = true;
        for (const id of this.activeTimeouts) {
            clearTimeout(id);
        }
        this.activeTimeouts.clear();
        for (const reject of this.pendingDelays) {
            reject(new StopError());
        }
        this.pendingDelays.clear();
        this.clearHandlers();
    }

    onStart(handler: EventHandler) {
        return this.on('start', handler);
    }

    async emit(event: string, spriteId: string, context: unknown) {
        if (this.stopped) return;

        const spriteEvents = this.spriteHandlers.get(spriteId);
        if (!spriteEvents) return;

        const list = spriteEvents.get(event) ?? [];
        await Promise.all(
            list.map(async (h) => {
                if (this.stopped) return;
                try {
                    await h(context);
                } catch (e) {
                    if (e instanceof StopError) return;
                    console.error(`Runtime handler error for ${event} on sprite ${spriteId}:`, e);
                }
            })
        );
    }

    setCompiler(compiler: (() => string) | null) {
        this.compiler = compiler;
    }

    compile() {
        return this.compiler?.() ?? '';
    }

    async start() {
        this.stopped = false;
        const compiled = this.compile();
        this.clearHandlers();

        try {
            if (compiled.trim()) {
                const spritesArray = Array.from(this.sprites.entries());
                const spriteContextMap = Object.fromEntries(this.sprites);

                const fn = new Function(
                    'sprites',
                    'spriteContextMap',
                    `
                    const runtimeRef = window.RUNTIME;
                    let context = spriteContextMap[window.__currentSpriteId] || Object.values(spriteContextMap)[0] || { sprite: {}, spriteId: undefined };
                    return (async () => {
                        ${compiled}
                    })();
                `
                );
                await fn(spritesArray, spriteContextMap);
            }

            for (const [spriteId, context] of this.sprites.entries()) {
                if (this.stopped) return;
                await this.emit('start', spriteId, context);
            }
        } catch (e) {
            if (e instanceof StopError) return;
            throw e;
        }
    }
}

const runtime = new Runtime();

// exposure. tung gugt
window.RUNTIME = window.RUNTIME ?? runtime;

export default runtime;
