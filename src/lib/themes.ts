export const THEME_COLOR_KEYS = [
  "bgApp",
  "bgPrimary",
  "bgSecondary",
  "bgTertiary",
  "bgSurface",
  "borderSubtle",
  "borderDefault",
  "borderStrong",
  "accent",
  "accentHover",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "textDim",
  "danger",
  "success",
  "warning"
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];
export type ThemeColors = Record<ThemeColorKey, string>;

export type ThemePreset = "dark" | "light" | "custom";

export const DARK_THEME: ThemeColors = {
  bgApp: "#08080a",
  bgPrimary: "#111113",
  bgSecondary: "#1c1c20",
  bgTertiary: "#28282e",
  bgSurface: "#38383f",
  borderSubtle: "#1c1c20",
  borderDefault: "#2e2e35",
  borderStrong: "#46464f",
  accent: "#3e7ef5",
  accentHover: "#6f9dff",
  textPrimary: "#f0f0f2",
  textSecondary: "#8888a0",
  textMuted: "#606068",
  textDim: "#3a3a42",
  danger: "#e03e3e",
  success: "#22c55e",
  warning: "#e8940a"
};

// oooww my eyes
export const LIGHT_THEME: ThemeColors = {
  bgApp: "#f3f4f6",
  bgPrimary: "#ffffff",
  bgSecondary: "#f9fafb",
  bgTertiary: "#e5e7eb",
  bgSurface: "#d1d5db",
  borderSubtle: "#e5e7eb",
  borderDefault: "#d1d5db",
  borderStrong: "#9ca3af",
  accent: "#3b82f6",
  accentHover: "#2563eb",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  textDim: "#d1d5db",
  danger: "#dc2626",
  success: "#16a34a",
  warning: "#d97706"
};

const CSS_VAR_MAP: Record<ThemeColorKey, string> = {
  bgApp: "--bg-app",
  bgPrimary: "--bg-primary",
  bgSecondary: "--bg-secondary",
  bgTertiary: "--bg-tertiary",
  bgSurface: "--bg-surface",
  borderSubtle: "--border-subtle",
  borderDefault: "--border-default",
  borderStrong: "--border-strong",
  accent: "--accent",
  accentHover: "--accent-hover",
  textPrimary: "--text-primary",
  textSecondary: "--text-secondary",
  textMuted: "--text-muted",
  textDim: "--text-dim",
  danger: "--danger",
  success: "--success",
  warning: "--warning"
};

export function getThemeColors(
  preset: ThemePreset,
  custom: Partial<ThemeColors>
): ThemeColors {
  const base = preset === "light" ? LIGHT_THEME : DARK_THEME;
  if (preset === "custom") {
    const merged = { ...base };
    for (const key of THEME_COLOR_KEYS) {
      if (custom[key]) {
        merged[key] = custom[key]!;
      }
    }
    return merged;
  }
  return base;
}

export function applyTheme(colors: ThemeColors): void {
  const root = document.documentElement;
  for (const key of THEME_COLOR_KEYS) {
    root.style.setProperty(CSS_VAR_MAP[key], colors[key]);
  }
}
