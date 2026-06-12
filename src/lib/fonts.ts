export const COMMON_FONTS = [
  "Inter",
  "Arial",
  "Helvetica",
  "Segoe UI",
  "Tahoma",
  "Trebuchet MS",
  "Verdana",
  "Roboto",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Consolas",
  "Monaco",
  "Palatino",
  "Impact",
];

type LocalFontRecord = {
  family?: string;
  postscriptName?: string;
  fullName?: string;
};
type LocalFontsPermissionStatus = "granted" | "denied" | "prompt" | "unknown";
/* eslint-disable @typescript-eslint/no-unused-vars */
type FontsQueryEnvironment = {
  queryLocalFonts?: () => Promise<unknown>;
  fonts?: { query?: () => Promise<unknown> };
  permissions?: {
    request?: (
      ...args: unknown[]
    ) => Promise<{ state: LocalFontsPermissionStatus }>;
    query?: (
      ...args: unknown[]
    ) => Promise<{ state: LocalFontsPermissionStatus }>;
  };
};
/* eslint-enable @typescript-eslint/no-unused-vars */

function checkWithFontAPI(font: string): boolean {
  if (typeof document === "undefined") return false;

  try {
    const doc = document as unknown as {
      fonts?: { check?: (...args: unknown[]) => boolean };
    };
    return (
      !!doc.fonts && !!doc.fonts.check && doc.fonts.check(`12px "${font}"`)
    );
  } catch {
    return false;
  }
}

function checkWithCanvas(font: string): boolean {
  if (typeof document === "undefined") return false;
  const testString = "AxmTYklsjo190QW";
  const defaultFonts = ["monospace", "serif", "sans-serif"];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.font = "72px monospace";
  const baselineWidth = ctx.measureText(testString).width;

  for (const base of defaultFonts) {
    ctx.font = `72px ${font}, ${base}`;
    const width = ctx.measureText(testString).width;
    if (width !== baselineWidth) return true;
  }
  return false;
}

export function getAvailableFonts(
  candidates: string[] = COMMON_FONTS,
): string[] {
  const found: string[] = [];
  for (const font of candidates) {
    if (checkWithFontAPI(font) || checkWithCanvas(font)) found.push(font);
  }
  return found;
}

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
]);

export function buildFontStack(font: string): string {
  if (!font) return "system-ui, sans-serif";
  const lower = font.toLowerCase();
  if (GENERIC_FAMILIES.has(lower)) return font;
  const needsQuote = /[^a-zA-Z0-9-]/.test(font);
  const family = needsQuote ? `"${font}"` : font;
  return `${family}, system-ui, sans-serif`;
}

function mapFontRecords(list: unknown[]): string[] {
  return list
    .map((item) => {
      const font = item as LocalFontRecord;
      return font.family || font.postscriptName || font.fullName;
    })
    .filter(Boolean) as string[];
}

async function queryLocalFontsAPI(): Promise<string[] | null> {
  try {
    const env =
      typeof window !== "undefined"
        ? (window as unknown as FontsQueryEnvironment)
        : typeof navigator !== "undefined"
          ? (navigator as unknown as FontsQueryEnvironment)
          : null;
    if (!env) return null;

    if (typeof env.queryLocalFonts === "function") {
      const list = await env.queryLocalFonts();
      if (Array.isArray(list) && list.length) return mapFontRecords(list);
    }

    if (typeof navigator !== "undefined") {
      const navEnv = navigator as unknown as FontsQueryEnvironment;
      if (typeof navEnv.queryLocalFonts === "function") {
        const list = await navEnv.queryLocalFonts();
        if (Array.isArray(list) && list.length) return mapFontRecords(list);
      }
    }

    if (env.fonts && typeof env.fonts.query === "function") {
      const list = await env.fonts.query();
      if (Array.isArray(list) && list.length) return mapFontRecords(list);
    }

    return null;
  } catch {
    return null;
  }
}

export async function detectAvailableFonts(
  candidates: string[] = COMMON_FONTS,
): Promise<string[]> {
  try {
    const apiList = await queryLocalFontsAPI();
    if (apiList && apiList.length > 0) {
      return Array.from(new Set(apiList));
    }
  } catch {
    // ignore
  }

  return getAvailableFonts(candidates);
}

export async function requestFontAccess(): Promise<string[] | null> {
  return queryLocalFontsAPI();
}

export async function getFontPermissionState(): Promise<LocalFontsPermissionStatus> {
  try {
    const nav =
      typeof navigator !== "undefined"
        ? (navigator as unknown as FontsQueryEnvironment)
        : null;
    if (!nav || !nav.permissions || typeof nav.permissions.query !== "function")
      return "unknown";

    try {
      const res = await nav.permissions.query({ name: "local-fonts" });
      if (res && res.state) return res.state;
    } catch {
      // ignore
    }

    try {
      const res = await nav.permissions.query({ name: "font-access" });
      if (res && res.state) return res.state;
    } catch {
      // ignore
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}
