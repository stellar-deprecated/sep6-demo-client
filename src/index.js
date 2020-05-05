import "./style.scss";
import * as uiActions from "./ui/ui-actions";

const Config = require("./config");
const StellarSdk = require("stellar-sdk");

/**
 * State maintained between steps
 * @typedef {Object} State
 * @property {StellarSdk.Network} network - Stellar network to operate on
 *
 * From stellar.toml
 * @property {string} auth_server - URL hosting the SEP10 auth server
 * @property {string} transfer_server - URL hosting the SEP6 transfer server
 * @property {string} kyc_server - URL hosting the SEP12 KYC server
 *
 * @property {Window} popup - The popup window for the interactive webapp
 *
 * SEP10
 * @property {string} challenge_transaction - XDR Representation of Stellar challenge transaction signed by server only
 * @property {Object} signed_challenge_tx - Stellar transaction challenge signed by both server and client
 * @property {string} token - JWT token representing authentication with stellar address from SEP10
 *
 * Deposit/withdraw
 * @property {string} transaction_id - Anchor identifier for transaction
 *
 * Withdraw
 * @property {string} begin_time - UTC ISO 8601 time that the SEP-6 transaction was kicked off
 * @property {string} anchors_stellar_address - Address that the anchor will be expecting payment on for the in-flight transaction
 * @property {string} stellar_memo_type - Memo type for the stellar transaction to specify the anchor's transaction
 * @property {string} stellar_memo - Memo required for the specified stellar transaction
 * @property {string} external_transaction_id - The reference identifier needed to retrieve or confirm the withdrawal
 * @property {string} withdraw_amount - Amount of token to withdraw
 * @property {object} withdraw_fields - Fields required for /withdraw request by type
 * @property {object} withdraw_values - Values entered for fields in withdraw_fields
 *
 * Deposit
 * @property {string} asset_issuer - The public key of the asset issuer that we expect a deposit from
 * @property {string} deposit_memo - The memo we asked the anchor to send our funds with
 * @property {string} deposit_type - The memo type we asked the anchor to send our funds with
 * @property {string} deposit_url - The more_info_url used to bring up info on the deposit
 * @property {object} deposit_fields - Fields required for /deposit request
 * @property {object} deposit_values - Values entered for fields in deposit_fields
 */

/**
 * @type State
 */
const state = {
  begin_time: new Date().toISOString(),
};

Config.listen(() => {
  const disclaimer = document.getElementById("pubnet-disclaimer");
  if (Config.get("PUBNET")) {
    disclaimer.classList.add("visible");
    state.network = StellarSdk.Networks.PUBLIC;
  } else {
    disclaimer.classList.remove("visible");
    state.network = StellarSdk.Networks.TESTNET;
  }
  try {
    const sk = Config.get("USER_SK");
    const pair = StellarSdk.Keypair.fromSecret(sk);
    console.log("Wallet address: ", pair.publicKey());
  } catch (e) {
    console.log("No wallet address yet");
    // do nothing if secret key isn't here yet
  }
});

Config.installUI(document.querySelector("#config-panel"));
if (!Config.isValid()) {
  uiActions.showConfig();
}

const withdrawSteps = [
  require("./steps/check_toml"),
  require("./steps/withdraw/check_info"),
  require("./steps/SEP10/start"),
  require("./steps/SEP10/sign"),
  require("./steps/SEP10/send"),
  require("./steps/withdraw/collect_withdraw_fields"),
  require("./steps/withdraw/get_withdraw"),
  require("./steps/withdraw/check_transactions_endpoint"),
  require("./steps/withdraw/confirm_payment"),
  require("./steps/withdraw/send_stellar_transaction"),
  require("./steps/withdraw/poll_for_success"),
];

const depositSteps = [
  require("./steps/check_toml"),
  require("./steps/deposit/add_trustline"),
  require("./steps/deposit/check_info"),
  require("./steps/SEP10/start"),
  require("./steps/SEP10/sign"),
  require("./steps/SEP10/send"),
  require("./steps/deposit/collect_deposit_fields"),
  require("./steps/deposit/get_deposit"),
  require("./steps/withdraw/check_transactions_endpoint"),
  require("./steps/deposit/show_close_button"),
];

let steps = null;

uiActions.instruction(
  "Withdraw and deposit are available for trusted assets in the wallet",
);
uiActions.setLoading(true, "Waiting for user...");
uiActions.waitForPageMessage("pages/wallet.html").then((message) => {
  uiActions.setLoading(false);
  if (message === "start-withdraw") {
    steps = withdrawSteps;
    next();
  } else if (message === "start-deposit") {
    steps = depositSteps;
    next();
  }
});

let currentStep = null;
const runStep = (step) => {
  if (!step) {
    uiActions.finish();
    return;
  }
  uiActions.instruction(step.instruction);
  currentStep = step;
  if (Config.get("AUTO_ADVANCE") || step.autoStart) next();
};

const nextActiveStep = () => {
  if (steps.length == 0) return null;
  while (steps[0].shouldSkip && steps[0].shouldSkip(state)) {
    steps.splice(0, 1);
  }
  return steps[0];
};

const next = async () => {
  if (currentStep && currentStep.execute) {
    uiActions.setLoading(true);
    try {
      await currentStep.execute(state, uiActions);
      steps.splice(0, 1);
    } catch (e) {
      uiActions.error(e);
      uiActions.setLoading(false);
      throw e;
    }
    const nextStep = nextActiveStep();
    const nextAction = nextStep && nextStep.action;
    uiActions.setLoading(false, nextAction);
  }
  runStep(nextActiveStep());
};

uiActions.onNext(next);
