// modify this to add new extensions to the menu
// built in extensions should be trusted

export type ExtensionItem = {
  name: string;
  img?: string;
  desc: string;
  creator: string;
  jsFile: string;
};

export const extensions: ExtensionItem[] = [
  {
    name: "Camera",
    desc: "2D Camera system for scrolling and zooming.",
    creator: "Antimony Team",
    jsFile: "camera.js",
    img: "camera.svg",
  },
  {
    name: "Sets",
    desc: "Set data structure blocks for storing unique values.",
    creator: "Antimony Team",
    jsFile: "sets.js",
    img: "sets.svg",
  },
];
