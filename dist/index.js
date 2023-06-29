"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.system = exports.mariadb = exports.drush = exports.hosts = exports.nginx = exports.php = void 0;
const php = __importStar(require("./services/php"));
exports.php = php;
const nginx = __importStar(require("./services/nginx"));
exports.nginx = nginx;
const hosts = __importStar(require("./services/hosts"));
exports.hosts = hosts;
const drush = __importStar(require("./services/drush"));
exports.drush = drush;
const mariadb = __importStar(require("./services/mariadb"));
exports.mariadb = mariadb;
const system = __importStar(require("./services/system"));
exports.system = system;
