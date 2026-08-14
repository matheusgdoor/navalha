const path = require('path');

const project = path.resolve(__dirname, '..');
process.chdir(project);
process.env.NEXT_TEST_WASM = '1';
process.env.NEXT_TEST_WASM_DIR = path.join(project, 'node_modules', '@next', 'swc-wasm-nodejs');
process.argv = ['node', 'next', 'dev', '-p', process.env.PORT || '3000'];

require(path.join(project, 'node_modules', 'next', 'dist', 'bin', 'next'));
