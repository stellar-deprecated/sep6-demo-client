const Config = require("src/config");
const get = require("src/util/get");
const prop = require("lodash.get");

module.exports = {
  instruction: "Check /info endpoint for required /deposit parameters",
  action: "GET /info (SEP-0006)",
  execute: async function(state, { request, response, instruction, expect }) {
    const transfer_server = state.transfer_server;
    request("GET /info");
    const result = await get(`${transfer_server}/info`);
    response("GET /info", result);
    expect(
      prop(result, ["deposit", Config.get("ASSET_CODE"), "enabled"]),
      `${Config.get("ASSET_CODE")} is not enabled for deposit`,
    );
    expect(
      prop(result, ["withdraw", Config.get("ASSET_CODE"), "types"]),
      `${Config.get("ASSET_CODE")} has no 'types' object in /info`,
    );
    instruction(
      "Deposit is enabled, and requires authentication so we should go through SEP-0010",
    );
    state.deposit_fields = result.deposit[Config.get("ASSET_CODE")].fields;
  },
};
