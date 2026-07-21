import { Image, Music, Plus, Trash2, Upload, Volume2 } from "lucide-react";
import {
  useSprites,
  isTextData,
  isMediaData,
  generateMediaImageId,
  generateMediaSoundId,
  type TextSpriteData,
  type MediaSpriteData,
} from "../../lib/sprites";
import { useEffect, useRef, useState } from "react";
import {
  getAvailableFonts,
  COMMON_FONTS,
  WEB_SAFE_FONTS,
  GOOGLE_FONTS,
  loadGoogleFont,
  buildFontStack,
  detectAvailableFonts,
  requestFontAccess,
  getFontPermissionState,
} from "../../lib/fonts";
import CollapsableSection from "./CollapsableSection";

export default function PropertiesPanel() {
  const { state, dispatch } = useSprites();
  const sprite = state.sprites.find((s) => s.id === state.selectedSpriteId);

  const committedName = useRef(sprite?.name ?? "");
  const [fonts, setFonts] = useState<string[]>([]);
  const [fontPermission, setFontPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  const [requestingFonts, setRequestingFonts] = useState(false);
  const [activeAssetType, setActiveAssetType] = useState<"images" | "sounds">(
    "images",
  );

  useEffect(() => {
    if (!sprite) return;
    committedName.current = sprite.name;
  }, [sprite?.id]);

  useEffect(() => {
    if (!sprite) return;
    if (sprite.type === "text") {
      setActiveAssetType("sounds");
    }
  }, [sprite?.id, sprite?.type]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await getFontPermissionState();
        if (!mounted) return;
        setFontPermission(state);

        const safe = WEB_SAFE_FONTS;
        const google = GOOGLE_FONTS;
        const system = ["system-ui", "sans-serif", "serif", "monospace"];

        if (state === "granted") {
          const found = await detectAvailableFonts(COMMON_FONTS);
          if (!mounted) return;
          setFonts(
            Array.from(new Set([...safe, ...found, ...google, ...system])),
          );
          return;
        }
        const fallback = getAvailableFonts(COMMON_FONTS);
        if (!mounted) return;
        setFonts(
          Array.from(new Set([...safe, ...fallback, ...google, ...system])),
        );
      } catch {
        if (!mounted) return;
        setFonts(
          Array.from(
            new Set([
              ...WEB_SAFE_FONTS,
              "Inter",
              "Arial",
              "Georgia",
              "monospace",
              ...GOOGLE_FONTS,
            ]),
          ),
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!sprite) return null;

  const handleUnlockFonts = async () => {
    setRequestingFonts(true);
    try {
      const list = await requestFontAccess();
      if (list && list.length) {
        setFonts(
          Array.from(
            new Set([
              ...WEB_SAFE_FONTS,
              ...list,
              ...GOOGLE_FONTS,
              "system-ui",
              "sans-serif",
              "serif",
              "monospace",
            ]),
          ),
        );
        setFontPermission("granted");
      } else {
        setFontPermission("denied");
      }
    } catch {
      setFontPermission("denied");
    } finally {
      setRequestingFonts(false);
    }
  };

  const update = (changes: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_SPRITE", id: sprite.id, changes });
  };

  const updateData = (dataChanges: Record<string, unknown>) => {
    update({ data: { ...sprite.data, ...dataChanges } });
  };

  const updateMediaData = (
    data: MediaSpriteData,
    extraChanges: Record<string, unknown> = {},
  ) => {
    update({ ...extraChanges, data });
  };

  const numField = (
    label: string,
    value: number,
    key: string,
    isData = false,
  ) => (
    <div className="properties-row">
      <span className="properties-label">{label}</span>
      <input
        className="properties-input"
        type="number"
        step="0.01"
        value={Number(value.toFixed(2))}
        onChange={(e) => {
          const v = parseFloat(e.target.value) || 0;
          if (isData) updateData({ [key]: v });
          else update({ [key]: v });
        }}
      />
    </div>
  );

  return (
    <div className="properties-panel">
      <div className="panel-body">
        <CollapsableSection title="Source">
          <div className="properties-row">
            <span className="properties-label">Name</span>
            <input
              className="properties-input"
              type="text"
              value={sprite.name}
              onChange={(e) => update({ name: e.target.value })}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) update({ name: committedName.current });
                else committedName.current = v;
              }}
            />
          </div>
        </CollapsableSection>

        <CollapsableSection title="Transform">
          {numField("X", sprite.x, "x")}
          {numField("Y", sprite.y, "y")}
          {numField("Width", sprite.width, "width")}
          {numField("Height", sprite.height, "height")}
          {numField("Rotation", sprite.rotation, "rotation")}
        </CollapsableSection>

        <CollapsableSection title="Appearance">
          <div className="properties-row">
            <span className="properties-label">Opacity</span>
            <input
              className="properties-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sprite.opacity}
              onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
            />
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                width: "32px",
                textAlign: "right",
              }}
            >
              {Math.round(sprite.opacity * 100)}%
            </span>
          </div>
          <div className="properties-row">
            <span className="properties-label">Visible</span>
            <button
              className={`properties-toggle ${sprite.visible ? "on" : "off"}`}
              onClick={() => update({ visible: !sprite.visible })}
            />
          </div>
          <div className="properties-row">
            <span className="properties-label">Locked</span>
            <button
              className={`properties-toggle ${sprite.locked ? "on" : "off"}`}
              onClick={() => update({ locked: !sprite.locked })}
            />
          </div>
        </CollapsableSection>

        {isTextData(sprite.data) &&
          (() => {
            const d = sprite.data as TextSpriteData;
            return (
              <CollapsableSection title="Text">
                <div className="properties-row">
                  <textarea
                    className="properties-textarea"
                    value={d.content}
                    onChange={(e) => updateData({ content: e.target.value })}
                  />
                </div>
                <div
                  className="properties-row"
                  style={{ alignItems: "center" }}
                >
                  <span className="properties-label">Font</span>
                  <select
                    className="properties-select"
                    value={d.fontFamily}
                    onChange={(e) => {
                      const f = e.target.value;
                      loadGoogleFont(f);
                      updateData({ fontFamily: f });
                    }}
                    style={{
                      minWidth: 160,
                      fontFamily: buildFontStack(d.fontFamily),
                    }}
                  >
                    {!fonts.includes(d.fontFamily) && d.fontFamily ? (
                      <option
                        value={d.fontFamily}
                        style={{ fontFamily: buildFontStack(d.fontFamily) }}
                      >
                        {d.fontFamily}
                      </option>
                    ) : null}
                    {fonts.map((f) => (
                      <option
                        key={f}
                        value={f}
                        style={{ fontFamily: buildFontStack(f) }}
                      >
                        {f}
                      </option>
                    ))}
                  </select>
                  {fontPermission !== "granted" && (
                    <button
                      className="properties-btn"
                      onClick={handleUnlockFonts}
                      disabled={requestingFonts}
                      title="Request permission to access local fonts"
                    >
                      {requestingFonts ? "Unlocking..." : "Use Device Fonts"}
                    </button>
                  )}
                </div>
                {numField("Size", d.fontSize, "fontSize", true)}
                <div className="properties-row">
                  <span className="properties-label">Weight</span>
                  <select
                    className="properties-select"
                    value={d.fontWeight}
                    onChange={(e) =>
                      updateData({ fontWeight: parseInt(e.target.value) })
                    }
                  >
                    <option value={300}>Light</option>
                    <option value={400}>Regular</option>
                    <option value={500}>Medium</option>
                    <option value={600}>Semibold</option>
                    <option value={700}>Bold</option>
                  </select>
                </div>
                <div className="properties-row">
                  <span className="properties-label">Color</span>
                  <div className="properties-color-swatch">
                    <input
                      type="color"
                      value={d.color}
                      onChange={(e) => updateData({ color: e.target.value })}
                    />
                  </div>
                  <input
                    className="properties-input"
                    type="text"
                    value={d.color}
                    onChange={(e) => updateData({ color: e.target.value })}
                  />
                </div>
                <div className="properties-row">
                  <span className="properties-label">Align</span>
                  <select
                    className="properties-select"
                    value={d.align}
                    onChange={(e) => updateData({ align: e.target.value })}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </CollapsableSection>
            );
          })()}
      </div>
    </div>
  );
}
