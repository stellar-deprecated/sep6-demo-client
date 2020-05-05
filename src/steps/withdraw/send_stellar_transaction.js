const StellarSdk = require("stellar-sdk");
const Config = require("src/config");
const get = require("src/util/get");

module.exports = {
  instruction:
    "Now that the anchor is expecting payment to a stellar address, we need to make that payment",
  action: "Send the stellar payment",
  execute: async function(state, { request, expect }) {
    const USER_SK = Config.get("USER_SK");
    const HORIZON_URL = Config.get("HORIZON_URL");
    const ASSET_CODE = Config.get("ASSET_CODE");
    const pk = StellarSdk.Keypair.fromSecret(USER_SK).publicKey();
    request("Sending the payment using the following anchor account info", {
      address: state.anchors_stellar_address,
      memo: state.stellar_memo,
      memo_type: state.stellar_memo_type,
    });
    const server = new StellarSdk.Server(HORIZON_URL);
    let account;
    try {
      account = await server.loadAccount(pk);
    } catch (e) {
      expect(
        false,
        "Account could not be found.  Has this account been created yet: " + pk,
      );
      return;
    }

    const feeStats = await get(`${HORIZON_URL}/fee_stats`);
    let memo;
    try {
      if (state.stellar_memo_type === "hash") {
        let memoHex = Buffer.from(state.stellar_memo, "base64").toString("hex");
        memo = StellarSdk.Memo.hash(memoHex);
      } else {
        const memoType = {
          text: StellarSdk.Memo.text,
          id: StellarSdk.Memo.id,
        }[state.stellar_memo_type];
        memo = memoType(state.stellar_memo);
      }
    } catch (e) {
      expect(
        false,
        `${e.message} The memo '${state.stellar_memo}' could not be encoded to type ${state.stellar_memo_type}`,
      );
    }

    const asset = new StellarSdk.Asset(ASSET_CODE, state.asset_issuer);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: feeStats.max_fee.p70 * 2,
      networkPassphrase: state.network,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: state.anchors_stellar_address,
          asset: asset,
          amount: "100",
        }),
      )
      .addMemo(memo)
      .setTimeout(30)
      .build();
    transaction.sign(StellarSdk.Keypair.fromSecret(USER_SK));
    try {
      await server.submitTransaction(transaction);
    } catch (e) {
      const data = e.response.data;
      const status = data.status;
      const txStatus = data.extras.result_codes.transaction;
      const codes = data.extras.result_codes.operations;
      const codesList = codes ? codes.join(", ") : "";
      expect(
        false,
        `Sending transaction failed with error code ${status}: ${txStatus}, ${codesList}`,
      );
    }
  },
};
