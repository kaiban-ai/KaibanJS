import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function generateConfig(format) {
  const isESM = format === "es";
  const isCJS = format === "cjs";
  const ext = isESM ? "mjs" : isCJS ? "cjs" : "js";

  return {
    input: "src/index.ts",
    output: {
      dir: "dist",
      format: format,
      entryFileNames: `bundle.${ext}`,
      inlineDynamicImports: true,
      sourcemap: process.env.NODE_ENV === "development",
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
    external,
    plugins: [
      alias({
        entries: [
          { find: '@', replacement: path.resolve(__dirname, 'src') },
          { find: '@types', replacement: path.resolve(__dirname, 'types') }
        ]
      }),
      resolve({
        browser: true,
        preferBuiltins: false,
        mainFields: ["browser", "module", "main"],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }),
      commonjs({
        include: /node_modules/,
        requireReturnsDefault: "auto",
      }),
      typescript({ 
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist/types',
        rootDir: './src'
      }),
      ...(process.env.TEST_ENV === "mocked-llm-apis"
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
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }),
      ...(!process.env.NODE_ENV === "development"
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

// Separate configuration for .d.ts generation
const dtsConfig = {
  input: "src/index.ts",
  output: [{ file: "dist/bundle.d.ts", format: "es" }],
  plugins: [typescript({ tsconfig: './tsconfig.json' })],
  external
};

export default [
  generateConfig("cjs"),
  generateConfig("es"),
  generateConfig("umd"),
  dtsConfig
];