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
    const kyc_server = state.kyc_server;
    state.stellar_memo = crypto.randomBytes(32).toString("base64");
    state.stellar_memo_type = "hash";
    const params = Object.assign(
      {
        asset_code: ASSET_CODE,
        account: pk,
        memo_type: state.stellar_memo_type,
        memo: state.stellar_memo,
      },
      state.withdraw_values,
    );
    request("GET /withdraw", params);
    let resp = await fetch(
      `${transfer_server}/withdraw?${new URLSearchParams(params).toString()}`,
      {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      },
    );
    let result = await resp.json();
    response("GET /withdraw", result);
    if (resp.status === 403) {
      expect(
        result.type === "non_interactive_customer_info_needed",
        "SEP-6 403 response does not have type 'non_interactive_customer_info_needed'",
      );
      instruction(
        "The anchor requires KYC information. Sending a request to /customer",
      );
      let put_params = { account: pk };
      result.fields.forEach((f) => {
        put_params[f] = window.prompt(`Enter '${f}':`) || null;
      });
      request("PUT /customer", put_params);
      form_data = new FormData();
      Object.keys(put_params).forEach((key) => {
        form_data.append(key, put_params[key]);
      });
      resp = await fetch(`${kyc_server}/customer`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
        body: form_data,
      });
      result = await resp.text();
      if (result) {
        response("PUT /customer", result);
      }
      expect(resp.status === 202, "SEP-6 /customer returned non-202 status");
      instruction("Trying request to /withdraw again");
      request("GET /withdraw", params);
      resp = await fetch(
        `${transfer_server}/withdraw?` + new URLSearchParams(params).toString(),
        {
          headers: {
            Authorization: `Bearer ${state.token}`,
          },
        },
      );
      result = await resp.json();
      response("GET /withdraw", result);
      expect(resp.status === 200, "Anchor returned non-200 status");
    } else {
      expect(
        result.account_id,
        "GET /withdraw must return 'account_id' from successful request",
      );
    }
  },
};
