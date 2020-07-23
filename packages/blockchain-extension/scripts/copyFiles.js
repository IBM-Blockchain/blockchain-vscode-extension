const fs = require('fs-extra');
const path = require('path');

const src = path.join(__dirname, '..', 'fallback-build-info.json');
const dest = path.join(__dirname, '..', 'build', 'fallback-build-info.json');

fs.copySync(src, dest);