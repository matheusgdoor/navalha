const path = require("path");

const project = path.resolve(__dirname, "..");
process.chdir(project);
if (process.platform === "win32") {
  process.env.NEXT_TEST_WASM = "1";
  process.env.NEXT_TEST_WASM_DIR = path.join(
    project,
    "node_modules",
    "@next",
    "swc-wasm-nodejs",
  );
}
process.argv = ["node", "next", "build"];
require(path.join(project, "node_modules", "next", "dist", "bin", "next"));
