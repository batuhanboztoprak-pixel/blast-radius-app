// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Vendored d3 code and generated data modules are not ours to lint.
    ignores: ['dist/*', 'src/vendor/**', 'src/data/**'],
  },
  {
    // Build/check scripts run in Node, not the app.
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', __filename: 'readonly', process: 'readonly', require: 'readonly', module: 'readonly', console: 'readonly' },
    },
  },
]);
