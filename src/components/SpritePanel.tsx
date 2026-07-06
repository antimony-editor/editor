import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Type, Image, Video, HelpCircle, X, Copy } from "lucide-react";
import {
  useSprites,
  createTextSprite,
  createMediaSprite,
  createVideoSprite,
} from "../lib/sprites";

function RenameInput({
  name,
  onCommit,
  onCancel,
}: {
  name: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onCommit(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={ref}
      className="sprite-rename-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function SpritePanel() {
  const { state, dispatch } = useSprites();
  const [showMenu, setShowMenu] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!showMenu) {
      setButtonRect(null);
      return;
    }
    if (addBtnRef.current) {
      setButtonRect(addBtnRef.current.getBoundingClientRect());
    }
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        addBtnRef.current &&
        !addBtnRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleAdd = (type: "text" | "media" | "video") => {
    const count = state.sprites.filter((s) => s.type === type).length + 1;
    let sprite;
    if (type === "text") {
      sprite = createTextSprite(`Text ${count}`);
    } else if (type === "media") {
      sprite = createMediaSprite(`Image ${count}`);
    } else {
      sprite = createVideoSprite(`Video ${count}`);
    }
    dispatch({ type: "ADD_SPRITE", sprite });
    setShowMenu(false);
  };

  const handleRename = (id: string, name: string) => {
    dispatch({ type: "UPDATE_SPRITE", id, changes: { name } });
    setRenamingId(null);
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "text":
        return <Type size={16} />;
      case "media":
        return <Image size={16} />;
      case "video":
        return <Video size={16} />;
      default:
        return <HelpCircle size={16} />;
    }
  };

  return (
    <div className="sprite-panel">
      <div className="panel-body">
        <div className="sprite-list">
          {state.sprites.map((sprite) => (
            <div
              key={sprite.id}
              className={`sprite-card ${state.selectedSpriteId === sprite.id ? "selected" : ""}`}
              onClick={() => dispatch({ type: "SELECT_SPRITE", id: sprite.id })}
            >
              <div
                className="sprite-card-icon"
                style={{ color: "var(--accent)" }}
              >
                {iconForType(sprite.type)}
              </div>
              <div className="sprite-card-info">
                {renamingId === sprite.id ? (
                  <RenameInput
                    name={sprite.name}
                    onCommit={(v) => handleRename(sprite.id, v)}
                    onCancel={() => setRenamingId(null)}
                  />
                ) : (
                  <div
                    className="sprite-card-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(sprite.id);
                    }}
                    title="Double-click to rename"
                  >
                    {sprite.name}
                  </div>
                )}
                <div className="sprite-card-type">
                  {sprite.type === "media" ? "image" : sprite.type}
                </div>
              </div>
              <div className="sprite-card-actions">
                <button
                  className="sprite-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "DUPLICATE_SPRITE", id: sprite.id });
                  }}
                  title="Duplicate"
                >
                  <Copy size={14} />
                </button>
                <button
                  className="sprite-action-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "REMOVE_SPRITE", id: sprite.id });
                  }}
                  title="Delete"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="add-sprite-area">
        {showMenu && buttonRect && createPortal(
          <div
            ref={menuRef}
            className="add-sprite-menu"
            style={{
              position: "fixed",
              left: buttonRect.left,
              bottom: window.innerHeight - buttonRect.top + 4,
              width: buttonRect.width,
              zIndex: 1000,
            }}
          >
            <button
              className="add-sprite-option"
              onClick={() => handleAdd("text")}
            >
              <span style={{ color: "var(--accent)", display: "flex" }}>
                <Type size={14} />
              </span>{" "}
              Text
            </button>
            <button
              className="add-sprite-option"
              onClick={() => handleAdd("media")}
            >
              <span style={{ color: "var(--accent)", display: "flex" }}>
                <Image size={14} />
              </span>{" "}
              Image
            </button>
            <button
              className="add-sprite-option"
              onClick={() => handleAdd("video")}
            >
              <span style={{ color: "var(--accent)", display: "flex" }}>
                <Video size={14} />
              </span>{" "}
              Video
            </button>
          </div>,
          document.body
        )}
        <button
          ref={addBtnRef}
          className="add-sprite-btn"
          onClick={() => setShowMenu(!showMenu)}
        >
          + Add Source
        </button>
      </div>
    </div>
  );
}
