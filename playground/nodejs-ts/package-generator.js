import fs from "fs";
import path from "path";

const __dirname = path.resolve();

const outDir = path.resolve(__dirname, "node_modules/agenticjs");

const packageJson = {
  name: "agenticjs",
  type: "module",
  main: "index.js",
  types: "index.d.ts",
  module: "index.mjs",
  exports: {
    ".": [
      {
        import: "./index.mjs",
        require: "./index.js",
        default: "./index.js",
      },
      "./index.js",
    ],
    "./package.json": "./package.json",
  },
};

fs.writeFileSync(
  path.resolve(outDir, "package.json"),
  JSON.stringify(packageJson, null, 2),
  "utf8"
);

console.log("package.json file has been created successfully!");
