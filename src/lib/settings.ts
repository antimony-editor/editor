import { createContext, useContext } from "react";

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  showROT: boolean;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  width: 1920,
  height: 1080,
  fps: 60,
  backgroundColor: "#1a1a1a",
  showGrid: true,
  showROT: true,
  snapToGrid: false,
  gridSize: 80
};

export const RESOLUTION_PRESETS = [
  { label: "1080p Widescreen", width: 1920, height: 1080 },
  { label: "1080p Portrait", width: 1080, height: 1920 },
  { label: "1080p Square", width: 1080, height: 1080 },
  { label: "720p Widescreen", width: 1280, height: 720 },
  { label: "720p Portrait", width: 720, height: 1280 },
  { label: "720p Square", width: 720, height: 720 }
] as const;

export function normalizeProjectSettings(
  value: Partial<ProjectSettings> | undefined
): ProjectSettings {
  return {
    width: clampNumber(value?.width, 64, 3840, DEFAULT_PROJECT_SETTINGS.width),
    height: clampNumber(value?.height, 64, 2160, DEFAULT_PROJECT_SETTINGS.height),
    fps: clampNumber(value?.fps, 1, 240, DEFAULT_PROJECT_SETTINGS.fps),
    backgroundColor: value?.backgroundColor ?? DEFAULT_PROJECT_SETTINGS.backgroundColor,
    showGrid: value?.showGrid ?? DEFAULT_PROJECT_SETTINGS.showGrid,
    snapToGrid: value?.snapToGrid ?? DEFAULT_PROJECT_SETTINGS.snapToGrid,
    gridSize: clampNumber(value?.gridSize, 5, 200, DEFAULT_PROJECT_SETTINGS.gridSize),
    showROT: value?.showROT ?? DEFAULT_PROJECT_SETTINGS.showROT
  };
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export interface ProjectSettingsContextValue {
  settings: ProjectSettings;
  setSettings: (settings: ProjectSettings) => void;
  updateSettings: (changes: Partial<ProjectSettings>) => void;
}

export const ProjectSettingsContext = createContext<ProjectSettingsContextValue | null>(
  null
);

export function useProjectSettings(): ProjectSettingsContextValue {
  const ctx = useContext(ProjectSettingsContext);
  if (!ctx)
    throw new Error("useProjectSettings must be used within ProjectSettingsContext");
  return ctx;
}
