"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const importNodes = () => __awaiter(this, void 0, void 0, function* () {
    const url = "https://raw.githubusercontent.com/stellar/dashboard/master/common/nodes.js";
    const response = yield axios_1.default.get(url);
    return eval(response.data);
});
module.exports = {
    'importNodes': importNodes
};
//# sourceMappingURL=stellar-dashboard.js.map