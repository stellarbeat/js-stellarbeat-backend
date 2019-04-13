"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const axios_1 = require("axios");
const importNodes = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const url = "https://raw.githubusercontent.com/stellar/dashboard/master/common/nodes.js";
    const response = yield axios_1.default.get(url);
    return eval(response.data);
});
module.exports = {
    'importNodes': importNodes
};
//# sourceMappingURL=stellar-dashboard.js.map