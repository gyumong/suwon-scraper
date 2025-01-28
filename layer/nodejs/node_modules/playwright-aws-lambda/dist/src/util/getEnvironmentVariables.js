"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWS_FONT_DIR = exports.AWS_TMP_DIR = void 0;
const fs_1 = require("fs");
const path = require("path");
const isLambdaRuntimeEnvironment_1 = require("./isLambdaRuntimeEnvironment");
exports.AWS_TMP_DIR = '/tmp/aws';
exports.AWS_FONT_DIR = '/tmp/fonts';
const AWS_LIB_DIR = `${exports.AWS_TMP_DIR}/lib`;
async function getEnvironmentVariables() {
    if (!isLambdaRuntimeEnvironment_1.default()) {
        return {};
    }
    const env = {};
    // If Chromium will be initialized without an FONTCONFIG_PATH or empty it crashes. To prevent
    // that we only set the custom font directory if the custom directory was created (by loadFont function)
    // alternatively set it to a non-existing directory.
    if (!process.env.FONTCONFIG_PATH && fs_1.existsSync(exports.AWS_FONT_DIR)) {
        env.FONTCONFIG_PATH = exports.AWS_FONT_DIR;
        await fs_1.promises.writeFile(path.join(exports.AWS_FONT_DIR, 'fonts.conf'), `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${exports.AWS_FONT_DIR}</dir>
  <cachedir>/tmp/fonts-cache/</cachedir>
  <config></config>
</fontconfig>`);
    }
    else {
        env.FONTCONFIG_PATH = exports.AWS_TMP_DIR;
    }
    if (!process.env.LD_LIBRARY_PATH) {
        env.LD_LIBRARY_PATH = AWS_LIB_DIR;
    }
    else if (!process.env.LD_LIBRARY_PATH.startsWith(AWS_LIB_DIR)) {
        env.LD_LIBRARY_PATH = [
            ...new Set([AWS_LIB_DIR, ...process.env.LD_LIBRARY_PATH.split(':')]),
        ].join(':');
    }
    return env;
}
exports.default = getEnvironmentVariables;
