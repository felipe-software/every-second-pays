// Writes the module's built-in notification resources (the `nm_` layouts and animations every
// scene can use) with the same compiler the config plugin runs for an app's own animations.
//
//   node modules/noti/scripts/generate-base-resources.cjs <res dir>
//
// The module's build runs this (see android/build.gradle) into its build directory.
const path = require('node:path');
const { resources, writeResources } = require('../plugin/compiler');

const [directory] = process.argv.slice(2);
if (!directory) {
    console.error('Usage: generate-base-resources.cjs <res dir>');
    process.exit(1);
}
writeResources(path.resolve(directory), resources({}, true));
