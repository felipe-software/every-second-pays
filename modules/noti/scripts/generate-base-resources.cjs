const path = require('node:path');
const { resources, writeResources } = require('../plugin/compiler');

const [directory] = process.argv.slice(2);
if (!directory) {
    console.error('Usage: generate-base-resources.cjs <res dir>');
    process.exit(1);
}
writeResources(path.resolve(directory), resources({}, true));
