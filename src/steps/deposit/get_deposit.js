const StellarSDK = require("stellar-sdk");
const Config = require("src/config");
const crypto = require("crypto");

module.exports = {
  instruction: "Creating deposit transaction using /deposit endpoint",
  action: "GET /deposit (SEP-0006)",
  execute: async function(state, { request, response, instruction, expect }) {
    const ASSET_CODE = Config.get("ASSET_CODE");
    const USER_SK = Config.get("USER_SK");
    const pk = StellarSDK.Keypair.fromSecret(USER_SK).publicKey();
    const transfer_server = state.transfer_server;

    state.deposit_memo = crypto.randomBytes(32).toString("base64");
    state.deposit_memo_type = "hash";
    instruction(
      `We've created the deposit memo ${state.deposit_memo} to listen for a successful deposit`,
    );
    const params = {
      asset_code: ASSET_CODE,
      account: pk,
      memo: state.deposit_memo,
      memo_type: state.deposit_memo_type,
      type: "bank_account",
    };
    const email = Config.get("EMAIL_ADDRESS");
    if (email) {
      params.email_address = email;
    }
    request("GET /deposit", params);
    const resp = await fetch(
      `${transfer_server}/deposit?` + new URLSearchParams(params).toString(),
      {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      },
    );
    expect(
      resp.status === 200,
      "SEP-6 anchor returned non-200 status for GET /deposit: " +
        `${resp.status}`,
    );
    const result = await resp.json();
    response("GET /deposit", result);
    expect(
      result.how,
      "SEP-6 GET /deposit response must include 'how' instructions",
    );
  },
};
