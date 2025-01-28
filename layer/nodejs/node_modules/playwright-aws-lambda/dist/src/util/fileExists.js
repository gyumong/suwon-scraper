"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
async function fileExists(path) {
    try {
        await fs_1.promises.access(path);
        return true;
    }
    catch (err) {
        return false;
    }
}
exports.default = fileExists;
