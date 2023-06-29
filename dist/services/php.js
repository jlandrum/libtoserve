"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersion = void 0;
const child_process_1 = require("child_process");
const util_1 = require("../util");
function getVersion() {
    const exec = (0, child_process_1.spawnSync)('php', ['-v'], { stdio: 'pipe', ...util_1.execParams });
    if (exec.status != 0) {
        throw new Error('php does not appear to be installed.');
    }
    const version = exec.stdout.toString().split(' ')[1].trim();
    return version;
}
exports.getVersion = getVersion;
