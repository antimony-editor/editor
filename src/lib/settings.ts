import { createContext, useContext } from "react";
import type { ThemeColorKey, ThemePreset } from "./themes";

export type { ThemePreset };

export interface ThemeConfig {
  preset: ThemePreset;
  custom: Partial<Record<ThemeColorKey, string>>;
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  showROT: boolean;
  theme: ThemeConfig;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  width: 1280,
  height: 720,
  fps: 60,
  backgroundColor: "#1a1a1a",
  showGrid: true,
  showROT: true,
  snapToGrid: false,
  gridSize: 80,
  theme: { preset: "dark", custom: {} }
};

export const RESOLUTION_PRESETS = [
  { label: "480 × 270", width: 480, height: 270 },
  { label: "640 × 360", width: 640, height: 360 },
  { label: "854 × 480", width: 854, height: 480 },
  { label: "1280 × 720", width: 1280, height: 720 },
  { label: "1920 × 1080", width: 1920, height: 1080 }
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
    showROT: value?.showROT ?? DEFAULT_PROJECT_SETTINGS.showROT,
    theme: value?.theme ?? DEFAULT_PROJECT_SETTINGS.theme
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
