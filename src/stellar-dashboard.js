const axios = require("axios");

const importNodes = async () => {
    const url = "https://raw.githubusercontent.com/stellar/dashboard/master/common/nodes.js";
    const response = await axios.get(url);

    return eval(response.data);
};

module.exports = {
    'importNodes': importNodes
};