type PendingRun = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};
// yes i just stole this form rarry.. because i am Evil
async function requestPermission(extId: string, action: string) {
  if (
    window.confirm(
      `Extension "${extId}" is requesting permission to use the "${action}" API. Do you allow this?`,
    )
  ) {
    return true;
  }

  throw new Error("Permission denied 😂🎉");
}

export class ExtensionBridge {
  extId: string;
  worker: Worker;
  private pendingRuns = new Map<number, PendingRun>();
  private runCounter = 0;

  constructor(extId: string, code: string, onReady: (extInfo: any) => void) {
    this.extId = extId;
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (event) => this.handleMessage(event, onReady);
    this.worker.postMessage({ type: "init", payload: { extId, code } });
  }

  private async handleMessage(
    event: MessageEvent,
    onReady: (extInfo: any) => void,
  ) {
    const { type, id, action, payload, extInfo, result, error } = event.data;

    if (type === "ready") {
      onReady(extInfo);
      return;
    }

    if (type === "blockResult") {
      const pending = this.pendingRuns.get(id);
      if (!pending) return;
      if (error) pending.reject(new Error(error));
      else pending.resolve(result);
      this.pendingRuns.delete(id);
      return;
    }

    if (type === "error") {
      console.error(`Extension ${this.extId} worker error:`, error);
      return;
    }

    if (type === "syscall") {
      try {
        await requestPermission(this.extId, action);

        let apiResult: unknown;
        switch (action) {
          case "fetch": {
            const response = await fetch(payload.url, payload.options);
            apiResult = await response.text();
            break;
          }
          case "storage.get":
            apiResult = localStorage.getItem(`${this.extId}:${payload.key}`);
            break;
          case "storage.set":
            localStorage.setItem(`${this.extId}:${payload.key}`, payload.value);
            apiResult = true;
            break;
          case "log":
            console.log(`[${this.extId}]`, ...payload.args);
            apiResult = true;
            break;
          default:
            throw new Error(`Unknown syscall: ${action}`);
        }

        this.worker.postMessage({ type: "response", id, result: apiResult });
      } catch (err) {
        this.worker.postMessage({
          type: "response",
          id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  runBlock(opcode: string, args: Record<string, unknown>) {
    return new Promise((resolve, reject) => {
      const runId = ++this.runCounter;
      this.pendingRuns.set(runId, { resolve, reject });
      this.worker.postMessage({
        type: "runBlock",
        id: runId,
        action: opcode,
        payload: { args },
      });
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
