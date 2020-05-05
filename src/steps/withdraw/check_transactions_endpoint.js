const StellarSDK = require("stellar-sdk");
const Config = require("src/config");
const get = require("src/util/get");

module.exports = {
  instruction:
    "Check to ensure this new transaction shows up in the transactions list",
  action: "GET /transactions (SEP-0006)",
  execute: async function(state, { request, response, instruction, expect }) {
    const ASSET_CODE = Config.get("ASSET_CODE");
    const USER_SK = Config.get("USER_SK");
    const pk = StellarSDK.Keypair.fromSecret(USER_SK).publicKey();
    const transfer_server = state.transfer_server;
    const url = `${transfer_server}/transactions?asset_code=${ASSET_CODE}&no_older_than=${state.begin_time}&account=${pk}`;
    request("GET " + url);
    let transactionResult;
    try {
      const transactionResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });
      expect(
        transactionResponse.status === 200,
        `/transactions responded with status code ${transactionResponse.status}`,
      );
      transactionsResult = await transactionResponse.json();
      response("GET /transactions", transactionsResult);
      expect(
        !transactionsResult.error,
        `Transactions list had error: ${transactionsResult.error}`,
      );
      expect(
        transactionsResult.transactions &&
          transactionsResult.transactions.length > 0,
        "There are no transactions returned, there should be at least the one we just created",
      );
      expect(
        transactionsResult.transactions &&
          transactionsResult.transactions.length < 2,
        "There should be 1 and only 1 transaction available since this transaction started.  Perhaps the `no_older_than` flag isn't being respected.",
      );
      // save the state that was previously saved in show_interactive_webapp.js
      let transaction = transactionsResult.transactions[0];
      state.transaction_id = transaction.id;
      if (transaction.kind === "withdrawal") {
        state.anchors_stellar_address = transaction.withdraw_anchor_account;
        state.stellar_memo = transaction.withdraw_memo;
        state.stellar_memo_type = transaction.withdraw_memo_type;
      }
    } catch (e) {
      expect(false, "Something went wrong fetching /transactions");
    }
  },
};
