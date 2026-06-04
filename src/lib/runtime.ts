type EventHandler = (...args: unknown[]) => void;

declare global {
    interface Window {
        RUNTIME?: Runtime;
    }
}

class Runtime {
    private handlers: Map<string, EventHandler[]> = new Map();
    private compiler: (() => string) | null = null;

    on(event: string, handler: EventHandler) {
        const list = this.handlers.get(event) ?? [];
        list.push(handler);
        this.handlers.set(event, list);
        return () => this.off(event, handler);
    }

    off(event: string, handler?: EventHandler) {
        if (!handler) {
            this.handlers.delete(event);
            return;
        }
        const list = this.handlers.get(event) ?? [];
        this.handlers.set(event, list.filter(h => h !== handler));
    }

    clearHandlers() {
        this.handlers.clear();
    }

    onStart(handler: EventHandler) {
        return this.on('start', handler);
    }

    emit(event: string, ...args: unknown[]) {
        const list = this.handlers.get(event) ?? [];
        for (const h of [...list]) {
            try {
                h(...args);
            } catch (e) {
                console.error(`Runtime handler error for ${event}:`, e);
            }
        }
    }

    setCompiler(compiler: (() => string) | null) {
        this.compiler = compiler;
    }

    compile() {
        return this.compiler?.() ?? '';
    }

    start() {
        const compiled = this.compile();
        this.clearHandlers();

        if (compiled.trim()) {
            new Function(compiled)();
        }

        this.emit('start', { time: 0 });
    }
}

const runtime = new Runtime();

// exposure. tung gugt
window.RUNTIME = window.RUNTIME ?? runtime;

export default runtime;
