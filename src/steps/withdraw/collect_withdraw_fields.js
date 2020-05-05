const uiactions = require("src/ui/ui-actions");

module.exports = {
  instruction: "The user needs to enter withdraw information in the UI",
  action: "Enter withdraw information",
  autoStart: true,
  execute: async function(state, { instruction }) {
    uiactions.setLoading(true, "Enter fields for /deposit");
    let type = window.prompt(
      `Enter 'type' of withraw\nChoices: ${Object.keys(state.withdraw_fields)}`,
    );
    state.withdraw_values = { type: type };
    state.withdraw_fields = state.withdraw_fields[type].fields;
    for (f in state.withdraw_fields) {
      let prompt = `Enter '${f}'`;
      if (!state.withdraw_fields[f].optional) {
        prompt += " (required)";
      }
      prompt += `\nDescription: ${state.withdraw_fields[f].description}`;
      if (state.withdraw_fields[f].choices) {
        prompt += `\nChoices: ${state.withdraw_fields[f].choices}`;
      }
      state.withdraw_values[f] = window.prompt(prompt) || null;
    }
    uiactions.setLoading(false);
  },
};
