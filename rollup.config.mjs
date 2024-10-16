import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import typescript from "@rollup/plugin-typescript"; // Add TypeScript plugin

const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.TEST_ENV === "mocked-llm-apis";

function generateConfig(format) {
  const isDTS = format === "dts";
  const isESM = format === "es";
  const isCJS = format === "cjs";
  const ext = isESM ? "mjs" : isCJS ? "cjs" : "js";
  const external = [
    "react",
    "react-dom",
    "uuid",
    "pino",
    "pino-pretty",
    "zod-to-json-schema",
    "langchain",
    "@langchain/core",
    "@langchain/community",
    "@langchain/openai",
    "@langchain/anthropic",
    "@langchain/google-genai",
    "@langchain/groq",
    "openai",
    "groq-sdk",
    "@anthropic-ai/sdk",
  ];

  if (isDTS) {
    return {
      input: "./types/index.d.ts",
      output: [
        {
          file: "dist/bundle.d.ts",
          format: "es",
        },
      ],
      plugins: [dts()],
    };
  }

  return {
    input: "src/index.ts", // Change to TypeScript entry point if using TypeScript
    output: {
      dir: "dist",
      format: format,
      entryFileNames: `bundle.${ext}`,
      inlineDynamicImports: true,
      sourcemap: isDevelopment,
      name: format === "umd" ? "KaibanJS" : undefined,
      globals: format === "umd" ? {
        react: 'React',
        'react-dom': 'ReactDOM',
        uuid: 'uuid',
        langchain: 'langchain',
        '@langchain/core': 'langchainCore',
        '@langchain/community': 'langchainCommunity',
        '@langchain/openai': 'langchainOpenAI',
        '@langchain/anthropic': 'langchainAnthropic',
        '@langchain/google-genai': 'langchainGoogleGenAI',
        '@langchain/groq': 'langchainGroq',
        'openai': 'OpenAI',
        'groq-sdk': 'GroqSDK',
        '@anthropic-ai/sdk': 'AnthropicAI',
        'zod-to-json-schema': 'zodToJsonSchema'
      } : undefined,
    },
    external: external,
    onwarn: (warning, warn) => {
      if (
        warning.code === "CIRCULAR_DEPENDENCY" ||
        (warning.code === "THIS_IS_UNDEFINED" && /node_modules/.test(warning.loc?.file || ""))
      ) {
        return;
      }
      warn(warning);
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
        mainFields: ["browser", "module", "main"],
        extensions: ['.js', '.jsx', '.ts', '.tsx'], // Include .ts and .tsx
      }),
      commonjs({
        include: /node_modules/,
        requireReturnsDefault: "auto",
      }),
      typescript({ tsconfig: './tsconfig.json' }), // Add TypeScript plugin
      ...(isTest
        ? [
            replace({
              "shims.fetch": `(...args) => { return global.fetch(...args); };`,
              preventAssignment: true,
            }),
          ]
        : []),
      babel({
        babelHelpers: "bundled",
        exclude: "node_modules/**",
        extensions: ['.js', '.jsx', '.ts', '.tsx'], // Include .ts and .tsx
      }),
      ...(!isDevelopment
        ? [
            terser({
              mangle: {
                keep_fnames: true,
                keep_classnames: true,
                reserved: ["resolve", "reject"],
              },
              compress: {
                keep_fnames: true,
                keep_classnames: true,
              },
            }),
          ]
        : []),
    ],
  };
}

export default [
  generateConfig("cjs"),
  generateConfig("es"),
  generateConfig("umd"),
  generateConfig("dts"),
];
