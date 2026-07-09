import { useRef } from "react";
import {
  Monitor,
  Gauge,
  Palette,
  Grid3x3,
  Paintbrush,
  Download,
  Upload,
  X,
} from "lucide-react";
import { RESOLUTION_PRESETS, type ProjectSettings } from "../lib/settings";
import {
  DARK_THEME,
  LIGHT_THEME,
  useTheme,
  getThemeColors,
  buildAmtTheme,
  downloadAmtFile,
  parseThemeFile,
  type ThemeColorKey,
} from "../lib/themes";
import { Resolution, ResolutionEdit } from "./Resolution";

interface SettingsModalProps {
  settings: ProjectSettings;
  onChange: (settings: ProjectSettings) => void;
  isClosing?: boolean;
  onClose: () => void;
}

export default function SettingsModal({
  settings,
  onChange,
  isClosing = false,
  onClose,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const name = prompt(
      "Theme name:",
      theme.preset === "custom"
        ? "Custom Theme"
        : `${theme.preset === "dark" ? "Dark" : "Light"} Theme`,
    );
    if (!name) return;
    const colors = getThemeColors(theme.preset, theme.custom);
    const amt = buildAmtTheme(colors, name);
    downloadAmtFile(amt);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const amt = await parseThemeFile(file);
      setTheme({ preset: "custom", custom: { ...amt.colors } });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import theme");
    }
    if (importInputRef.current) importInputRef.current.value = "";
  }

  const matchedPreset = RESOLUTION_PRESETS.find(
    (preset) =>
      preset.width === settings.width && preset.height === settings.height,
  );
  const presetValue = matchedPreset
    ? `${matchedPreset.width}x${matchedPreset.height}`
    : "custom";

  const update = (changes: Partial<ProjectSettings>) => {
    onChange({ ...settings, ...changes });
  };

  return (
    <div
      className={`modal-overlay ${isClosing ? "is-closing" : ""}`}
      onClick={onClose}
    >
      <div
        className="modal-content settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Video Settings</h2>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body settings-modal-body">
          <section className="settings-section">
            <div className="settings-section-title">
              <Monitor size={16} />
              <span>Resolution</span>
            </div>
            <div className="settings-row">
              <div className="welcome-presets-grid-scrollable">
                {RESOLUTION_PRESETS.map((preset) => (
                  <Resolution
                    width={preset.width}
                    height={preset.height}
                    label={preset.label}
                    callback={() => {
                      update({ width: preset.width, height: preset.height });
                    }}
                    selected={
                      settings.width === preset.width &&
                      settings.height === preset.height
                    }
                  />
                ))}
                <ResolutionEdit
                  width={settings.width}
                  height={settings.height}
                  callback={(w, h) => {
                    update({ width: w, height: h });
                  }}
                  selected={
                    !RESOLUTION_PRESETS.some(
                      (p) =>
                        p.width === settings.width &&
                        p.height === settings.height,
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <Gauge size={16} />
              <span>Playback</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">FPS</span>
              <input
                className="settings-input"
                type="number"
                min={1}
                max={240}
                value={settings.fps}
                onChange={(e) =>
                  update({ fps: parseInt(e.target.value, 10) || settings.fps })
                }
              />
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <Palette size={16} />
              <span>Stage</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Background</span>
              <div className="settings-color-field">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => update({ backgroundColor: e.target.value })}
                />
                <input
                  className="settings-input"
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => update({ backgroundColor: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <Grid3x3 size={16} />
              <span>Grid</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Show grid</span>
              <button
                className={`settings-toggle ${settings.showGrid ? "on" : "off"}`}
                onClick={() => update({ showGrid: !settings.showGrid })}
              />
            </div>
            <div className="settings-row">
              <span className="settings-label">Grid size</span>
              <input
                className="settings-input"
                type="number"
                min={5}
                max={200}
                value={settings.gridSize}
                onChange={(e) =>
                  update({
                    gridSize: parseInt(e.target.value, 10) || settings.gridSize,
                  })
                }
              />
            </div>
            <div className="settings-row">
              <span className="settings-label">Snap to grid</span>
              <button
                className={`settings-toggle ${settings.snapToGrid ? "on" : "off"}`}
                onClick={() => update({ snapToGrid: !settings.snapToGrid })}
              />
            </div>
            <div className="settings-row">
              <span className="settings-label">Show rule of thirds</span>
              <button
                className={`settings-toggle ${settings.showROT ? "on" : "off"}`}
                onClick={() => update({ showROT: !settings.showROT })}
              />
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <Paintbrush size={16} />
              <span>Theme</span>

              <div className="settings-row settings-row-actions">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".att"
                  style={{ display: "none" }}
                  onChange={handleImport}
                />
                <button
                  className="settings-btn"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Upload size={14} />
                  Import
                </button>
                <button className="settings-btn" onClick={handleExport}>
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Preset</span>
              <select
                className="settings-select"
                value={theme.preset}
                onChange={(e) => {
                  const preset = e.target.value as "dark" | "light" | "custom";
                  if (preset === "custom") {
                    const base =
                      theme.preset === "light" ? LIGHT_THEME : DARK_THEME;
                    setTheme({ preset, custom: { ...base } });
                  } else {
                    setTheme({ preset, custom: {} });
                  }
                }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {theme.preset === "custom" && (
              <>
                {(
                  [
                    ["Main background", "bgApp"],
                    ["Panel background", "bgPrimary"],
                    ["Card background", "bgSecondary"],
                    ["Elevated surface", "bgTertiary"],
                    ["Accent color", "accent"],
                    ["Text color", "textPrimary"],
                    ["Secondary text", "textSecondary"],
                    ["Border color", "borderDefault"],
                  ] as [string, ThemeColorKey][]
                ).map(([label, key]) => (
                  <div className="settings-row" key={key}>
                    <span className="settings-label">{label}</span>
                    <div className="settings-color-field">
                      <input
                        type="color"
                        value={theme.custom[key] || DARK_THEME[key]}
                        onChange={(e) => {
                          const custom = {
                            ...theme.custom,
                            [key]: e.target.value,
                          };
                          setTheme({ ...theme, custom });
                        }}
                      />
                      <input
                        className="settings-input"
                        type="text"
                        value={theme.custom[key] || DARK_THEME[key]}
                        onChange={(e) => {
                          const custom = {
                            ...theme.custom,
                            [key]: e.target.value,
                          };
                          setTheme({ ...theme, custom });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
