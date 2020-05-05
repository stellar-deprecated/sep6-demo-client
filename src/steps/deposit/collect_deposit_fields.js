const uiactions = require("src/ui/ui-actions");

module.exports = {
  instruction: "The user needs to enter deposit information in the UI",
  action: "Enter deposit information",
  autoStart: true,
  execute: async function(state, { instruction }) {
    uiactions.setLoading(true, "Enter fields for /deposit");
    state.deposit_values = {};
    for (f in state.deposit_fields) {
      let prompt = `Enter '${f}'`;
      if (!state.deposit_fields[f].optional) {
        prompt += " (required)";
      }
      prompt += `\nDescription: ${state.deposit_fields[f].description}`;
      if (state.deposit_fields[f].choices) {
        prompt += `\nChoices: ${state.deposit_fields[f].choices.join(", ")}`;
      }
      state.deposit_values[f] = window.prompt(prompt) || null;
    }
    uiactions.setLoading(false);
  },
};
