const StellarSDK = require("stellar-sdk");
const Config = require("src/config");
const get = require("src/util/get");
const crypto = require("crypto");

module.exports = {
  instruction: "Create a withdrawal with the /withdraw endpoint",
  action: "GET /withdraw (SEP-0006)",
  execute: async function(state, { request, response, instruction, expect }) {
    const ASSET_CODE = Config.get("ASSET_CODE");
    const USER_SK = Config.get("USER_SK");
    const pk = StellarSDK.Keypair.fromSecret(USER_SK).publicKey();
    const transfer_server = state.transfer_server;
    state.stellar_memo = crypto.randomBytes(32).toString("base64");
    state.stellar_memo_type = "hash";
    const params = {
      asset_code: ASSET_CODE,
      account: pk,
      type: "bank_account",
      dest: "fake account number",
      dest_extra: "fake routing number",
      memo_type: state.stellar_memo_type,
      memo: state.stellar_memo,
    };
    request("GET /withdraw", params);
    const resp = await fetch(
      `${transfer_server}/withdraw?${new URLSearchParams(params).toString()}`,
      {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      },
    );
    const result = await resp.json();
    console.log("got json");
    response("GET /withdraw", result);
    expect(
      result.account_id,
      "GET /withdraw must return 'account_id' from successful request",
    );
  },
};
