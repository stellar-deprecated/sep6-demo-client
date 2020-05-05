const get = require("src/util/get");

module.exports = {
  instruction:
    "Let the user see the accounts list, and jump back to the deposit url",
  autoStart: true,
  execute: async function(
    state,
    { request, response, instruction, setDevicePage },
  ) {
    let lastStatus = "pending_user_transfer_start";
    let showingDepositView = true;
    const poll = async () => {
      const transfer_server = state.transfer_server;
      request("GET /transaction", { id: state.transaction_id });
      const transactionResponse = await fetch(
        `${transfer_server}/transaction?id=${state.transaction_id}`,
        {
          headers: {
            Authorization: `Bearer ${state.token}`,
          },
        },
      );
      const transactionResult = await transactionResponse.json();
      response("GET /transaction", transactionResult);

      if (lastStatus !== transactionResult.transaction.status) {
        lastStatus = transactionResult.transaction.status;
        instruction(`Status updated to ${lastStatus}`);
        if (transactionResult.transaction.more_info_url) {
          const urlBuilder = new URL(
            transactionResult.transaction.more_info_url,
          );
          urlBuilder.searchParams.set("jwt", state.token);
          state.deposit_url = urlBuilder.toString();
          if (showingDepositView) {
            showDepositView();
          }
        }
      }
      if (transactionResult.transaction.status !== "completed") {
        instruction(
          `Still ${transactionResult.transaction.status}, try again in 5s`,
        );
        setTimeout(poll, 5000);
      }
    };

    function showDepositView() {
      showingDepositView = true;
      state.popup = window.open(
        state.deposit_url,
        "popup",
        "width=320,height=480",
      );
      const timer = setInterval(() => {
        if (state.popup.closed) {
          clearInterval(timer);
          showTransactionsView();
        }
      }, 100);
      setDevicePage("pages/loader-with-popup-message.html");
    }

    function showTransactionsView() {
      showingDepositView = false;
      setDevicePage("pages/transactions.html?pending=true");
    }

    return new Promise((resolve, reject) => {
      poll();
    });
  },
};
