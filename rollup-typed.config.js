import commonjs from "@rollup/plugin-commonjs";

const config = (ext = "js") => {
  return {
    input: "src/index.js",
    output: {
      format: "esm",
      file: `dist_typed/index.${ext}`,
    },
    plugins: [commonjs()],
  };
};

export default [config(), config("mjs")];
