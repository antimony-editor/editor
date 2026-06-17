class CameraExtension {
  get id() { return "camera"; }
  
  registerCategory() {
    return {
      name: "Camera",
      color: "#3d5afe"
    };
  }
  
  registerBlocks() {
    return [
      {
        id: "create_camera",
        text: "create camera [NAME]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "cam1" }
        }
      },
      {
        id: "set_camera_pos",
        text: "set camera [NAME] to x: [X] y: [Y]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          X: { kind: "value", type: "Number", default: 0 },
          Y: { kind: "value", type: "Number", default: 0 }
        }
      },
      {
        id: "set_camera_x",
        text: "set camera [NAME] x to [X]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          X: { kind: "value", type: "Number", default: 0 }
        }
      },
      {
        id: "set_camera_y",
        text: "set camera [NAME] y to [Y]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          Y: { kind: "value", type: "Number", default: 0 }
        }
      },
      {
        id: "change_camera_pos",
        text: "change camera [NAME] by x: [X] y: [Y]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          X: { kind: "value", type: "Number", default: 10 },
          Y: { kind: "value", type: "Number", default: 10 }
        }
      },
      {
        id: "change_camera_x",
        text: "change camera [NAME] x by [X]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          X: { kind: "value", type: "Number", default: 10 }
        }
      },
      {
        id: "change_camera_y",
        text: "change camera [NAME] y by [Y]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          Y: { kind: "value", type: "Number", default: 10 }
        }
      },
      {
        id: "set_camera_zoom",
        text: "set camera [NAME] zoom to [ZOOM]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          ZOOM: { kind: "value", type: "Number", default: 1 }
        }
      },
      {
        id: "change_camera_zoom",
        text: "change camera [NAME] zoom by [ZOOM]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          ZOOM: { kind: "value", type: "Number", default: 0.1 }
        }
      },
      {
        id: "set_camera_rotation",
        text: "set camera [NAME] rotation to [ROT]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          ROT: { kind: "value", type: "Number", default: 0 }
        }
      },
      {
        id: "change_camera_rotation",
        text: "change camera [NAME] rotation by [ROT]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          ROT: { kind: "value", type: "Number", default: 10 }
        }
      },
      {
        id: "switch_camera",
        text: "switch to camera [NAME]",
        type: "statement",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" }
        }
      },
      {
        id: "get_camera_prop",
        text: "camera [NAME] [PROP]",
        type: "output",
        fields: {
          NAME: { kind: "value", type: "String", default: "default" },
          PROP: {
            kind: "menu",
            items: ["x", "y", "zoom", "rotation"],
            default: "x"
          }
        }
      }
    ];
  }
  
  registerCode() {
    return {
      create_camera: (args) => {
        window.RUNTIME.switchCamera(args.NAME);
      },
      set_camera_pos: (args) => {
        window.RUNTIME.setCamera(args.NAME, { x: Number(args.X), y: Number(args.Y) });
      },
      set_camera_x: (args) => {
        window.RUNTIME.setCamera(args.NAME, { x: Number(args.X) });
      },
      set_camera_y: (args) => {
        window.RUNTIME.setCamera(args.NAME, { y: Number(args.Y) });
      },
      change_camera_pos: (args) => {
        const cam = window.RUNTIME.getCamera(args.NAME);
        window.RUNTIME.setCamera(args.NAME, { x: cam.x + Number(args.X), y: cam.y + Number(args.Y) });
      },
      change_camera_x: (args) => {
        const cam = window.RUNTIME.getCamera(args.NAME);
        window.RUNTIME.setCamera(args.NAME, { x: cam.x + Number(args.X) });
      },
      change_camera_y: (args) => {
        const cam = window.RUNTIME.getCamera(args.NAME);
        window.RUNTIME.setCamera(args.NAME, { y: cam.y + Number(args.Y) });
      },
      set_camera_zoom: (args) => {
        window.RUNTIME.setCamera(args.NAME, { zoom: Number(args.ZOOM) });
      },
      change_camera_zoom: (args) => {
        const cam = window.RUNTIME.getCamera(args.NAME);
        window.RUNTIME.setCamera(args.NAME, { zoom: cam.zoom + Number(args.ZOOM) });
      },
      set_camera_rotation: (args) => {
        window.RUNTIME.setCamera(args.NAME, { rotation: Number(args.ROT) });
      },
      change_camera_rotation: (args) => {
        const cam = window.RUNTIME.getCamera(args.NAME);
        window.RUNTIME.setCamera(args.NAME, { rotation: cam.rotation + Number(args.ROT) });
      },
      switch_camera: (args) => {
        window.RUNTIME.switchCamera(args.NAME);
      },
      get_camera_prop: (args) => {
        const cam = window.RUNTIME.getCamera(args.NAME);
        return cam[args.PROP] ?? 0;
      }
    };
  }
}
