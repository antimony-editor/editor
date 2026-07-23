import { Dispatch, SetStateAction, useRef, useState } from "react";
import { ChevronLeft, Upload, Globe } from "lucide-react";

import {
  ExtensionItem,
  extensions,
  fetchBuiltinExtensionCode,
} from "../lib/extensions/builtinExtensions";

import { registerExtension } from "../lib/extensions/manager";

export default function ExtensionMenu({
  showMenu,
}: {
  showMenu: Dispatch<SetStateAction<boolean>>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");

  async function installJS(js: string, trusted = false) {
    try {
      await registerExtension(js, trusted);
      showMenu(false);
    } catch (e) {
      console.error("Failed to load extension:", e);
      alert(String(e));
    }
  }

  async function loadLocalExtension(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const js = await file.text();

    await installJS(js);

    e.target.value = "";
  }

  async function loadURL() {
    if (!url.trim()) return;

    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch (${res.status})`);
      }

      const js = await res.text();

      await installJS(js);
    } catch (e) {
      console.error(e);
      alert(String(e));
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "var(--bg-primary)",
        zIndex: 10000,
      }}
    >
      <div className="header-bar" style={{ padding: "10px" }}>
        <ChevronLeft
          style={{
            cursor: "pointer",
            position: "absolute",
            left: "10px",
          }}
          onClick={() => showMenu(false)}
        />

        <div className="header-project-name">Extensions</div>
      </div>

      <input
        ref={fileInput}
        hidden
        type="file"
        accept=".js"
        onChange={loadLocalExtension}
      />

      <div
        style={{
          padding: "10px",
          gap: "10px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div
          className="extension-item"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={64} style={{ marginBottom: 10 }} />

          <h2>Load Local Extension</h2>

          <div>Install a .js extension from your computer.</div>

          <div
            style={{
              color: "var(--text-secondary)",
            }}
          >
            Trusted Extension
          </div>
        </div>

        <div
          className="extension-item"
          style={{
            minWidth: 250,
            cursor: "default",
          }}
        >
          <Globe size={64} style={{ marginBottom: 10 }} />

          <h2>Load From URL</h2>

          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: "100%",
              marginTop: 8,
              marginBottom: 8,
            }}
          />

          <button className="file-menu-item" onClick={loadURL}>
            Install
          </button>
        </div>

        <hr style={{ width: "100%", borderColor: "var(--bg-app)", opacity: 0.5 }}></hr>

        {/* can someone else make the ui less ugly*/}

        {extensions.map((ext) => renderExtension(ext, installJS))}
      </div>
    </div>
  );
}

function renderExtension(
  ext: ExtensionItem,
  installJS: (js: string, trusted?: boolean) => Promise<void>,
) {
  const thumb = ext.img ?? "ext-nothumb.png";

  return (
    <div
      className="extension-item"
      key={ext.name}
      onClick={async () => {
        try {
          await installJS(await fetchBuiltinExtensionCode(ext), true);
        } catch (e) {
          console.error("Failed to load extension:", e);
        }
      }}
    >
      <img
        src={"extensions/thumbs/" + thumb}
        alt={ext.name}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      />

      <h2>{ext.name}</h2>

      <div>{ext.desc}</div>

      <div
        style={{
          color: "var(--text-secondary)",
        }}
      >
        Created by {ext.creator}
      </div>
    </div>
  );
}
