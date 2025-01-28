"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (message, data) => {
        console.log(`[INFO] ${message}`, data ? data : '');
    },
    error: (message, error) => {
        console.error(`[ERROR] ${message}`, error ? error : '');
    }
};
