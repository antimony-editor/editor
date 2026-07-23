// modify this to add new extensions to the menu
// built in extensions should be trusted

export type ExtensionItem = {
  // must match the `id` the extension class reports
  id: string;
  name: string;
  img?: string;
  desc: string;
  creator: string;
  jsFile: string;
};

export const extensions: ExtensionItem[] = [
  {
    id: "camera",
    name: "Camera",
    desc: "2D Camera system for scrolling and zooming.",
    creator: "Antimony Team",
    jsFile: "camera.js",
    img: "camera.svg",
  },
  {
    id: "sets",
    name: "Sets",
    desc: "Set data structure blocks for storing unique values.",
    creator: "Antimony Team",
    jsFile: "sets.js",
    img: "sets.svg",
  },
];

export function getBuiltinExtension(id: string): ExtensionItem | undefined {
  return extensions.find((ext) => ext.id === id);
}

export async function fetchBuiltinExtensionCode(ext: ExtensionItem) {
  const res = await fetch(`extensions/js/${ext.jsFile}`);
  if (!res.ok) throw new Error(`Failed to fetch ${ext.jsFile} (${res.status})`);
  return res.text();
}
