import { useState, useRef, useEffect } from "react";
import { File, Code, BookOpen, Settings, CatIcon } from "lucide-react";

interface HeaderBarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onSeeJS: () => void;
  onSave: () => void;
  onLoad: () => void;
  onOpenCredits: () => void;
  onOpenSettings: () => void;
  onOpenDevTools: () => void;
}

const localHost = window.location.hostname === "localhost";

export default function HeaderBar({
  projectName,
  onProjectNameChange,
  onSeeJS,
  onSave,
  onLoad,
  onOpenCredits,
  onOpenSettings,
  onOpenDevTools,
}: HeaderBarProps) {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };

    document.addEventListener("pointerup", handleClickOutside);
    return () => document.removeEventListener("pointerup", handleClickOutside);
  }, []);

  return (
    <div className="header-bar">
      <div className="header-logo">
        <img src="logo_dark.svg" alt="Antimony Logo" />
      </div>

      <div className="header-btn-group">
        <button className="see-js-btn" onClick={onSeeJS}>
          <Code size={22} />
        </button>

        <div className="file-menu-container" ref={menuRef}>
          <button
            className="file-tab-btn"
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
          >
            <File size={20} />
          </button>
          {isFileMenuOpen && (
            <div className="file-menu">
              <button
                className="file-menu-item"
                onClick={() => {
                  onSave();
                  setIsFileMenuOpen(false);
                }}
              >
                Save Project
              </button>
              <button
                className="file-menu-item"
                onClick={() => {
                  onLoad();
                  setIsFileMenuOpen(false);
                }}
              >
                Load Project
              </button>
            </div>
          )}
        </div>

        <button
          className="file-tab-btn"
          title="Credits"
          onClick={onOpenCredits}
        >
          <BookOpen size={20} />
        </button>

        <button
          className="file-tab-btn"
          title="Settings"
          onClick={onOpenSettings}
        >
          <Settings size={20} />
        </button>

        {localHost && (
          <button
            className="file-tab-btn"
            title="Developer Tools"
            onClick={onOpenDevTools}
          >
            <CatIcon size={20} />
          </button>
        )}
      </div>

      <div className="header-project-name">
        <input
          type="text"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
        />
      </div>
    </div>
  );
}
