class SetsExtension {
  id = "sets";

  registerCategory() {
    return {
      name: "Sets",
      color: "#4ed385",
    };
  }

  registerBlocks() {
    const setDefaultValues = "abcdefghijklmnopqrstuvwxyz1234567890dubistgutgenug";
    return [
      {
        id: "create_with",
        type: "output",
        outputType: "Set",
        outputShape: 3,
        expandable: true,
        initialItemCount: 2,
        minItemCount: 0,
        maxItemCount: Infinity,
        emptyLabel: "empty set",
        firstInputLabel: "create set with",
        shadow: function (index) {
          return {
            type: "text",
            fields: { TEXT: setDefaultValues[index] || "" }
          };
        },
        tooltip: "Create a new set with initial values.",
      },
      {
        id: "has",
        text: "set [set] has [value]",
        type: "output",
        outputType: "Boolean",
        fields: {
          set: { type: "Set" },
          value: { type: null, default: "abc" },
        },
        tooltip: "Check if a set contains a value.",
      },
      {
        id: "add",
        text: "add [value] to set [set]",
        type: "statement",
        fields: {
          set: { type: "Set" },
          value: { type: null, default: "abc" },
        },
        tooltip: "Add a value to a set.",
      },
      {
        id: "delete",
        text: "delete [value] from set [set]",
        type: "statement",
        fields: {
          set: { type: "Set" },
          value: { type: null, default: "abc" },
        },
        tooltip: "Delete a value from a set.",
      },
      {
        id: "size",
        text: "size of set [set]",
        type: "output",
        outputType: "Number",
        fields: {
          set: { type: "Set" },
        },
        tooltip: "Get the number of unique values in a set.",
      },
      {
        id: "clear",
        text: "clear set [set]",
        type: "statement",
        fields: {
          set: { type: "Set" },
        },
        tooltip: "Remove all values from a set.",
      },
    ];
  }

  registerCode() {
    return {
      create_with: function (args) {
        const items = [];
        for (let i = 0; i < Number(args.itemCount); i++) {
          const key = "ADD" + i;
          if (args[key]) {
            items.push(args[key]);
          }
        }
        return new Set(items);
      },
      has: function (args) {
        const set = args.set;
        return set ? set.has(args.value) : false;
      },
      add: function (args) {
        const set = args.set;
        if (set) set.add(args.value);
      },
      delete: function (args) {
        const set = args.set;
        if (set) set.delete(args.value);
      },
      size: function (args) {
        const set = args.set;
        return set ? set.size : 0;
      },
      clear: function (args) {
        const set = args.set;
        if (set) set.clear();
      },
    };
  }
}
