const Config = require("src/config");
const toml = require("toml");

module.exports = {
  instruction:
    "Check the stellar.toml to find the necessary information about the transfer server",
  action: "GET /.well-known/stellar.toml (SEP-0001)",
  execute: async function(state, { request, response, instruction, expect }) {
    let HOME_DOMAIN = Config.get("HOME_DOMAIN");
    let WEB_AUTH_OVERRIDE = Config.get("WEB_AUTH_ENDPOINT");
    let TRANSFER_SERVER_OVERRIDE = Config.get("TRANSFER_SERVER");
    let ASSET_ISSUER_OVERRIDE = Config.get("ASSET_ISSUER");
    const ASSET_CODE = Config.get("ASSET_CODE");
    expect(
      HOME_DOMAIN ||
        (WEB_AUTH_OVERRIDE &&
          TRANSFER_SERVER_OVERRIDE &&
          ASSET_ISSUER_OVERRIDE),
      "Config needs either a HOME_DOMAIN or a WEB_AUTH_ENDPOINT + TRANSFER_SERVER + ASSET_ISSUER",
    );
    if (HOME_DOMAIN) {
      if (HOME_DOMAIN.indexOf("http") != 0) {
        HOME_DOMAIN = "https://" + HOME_DOMAIN;
      }
      HOME_DOMAIN = HOME_DOMAIN.replace(/\/$/, "");
      request(`${HOME_DOMAIN}/.well-known/stellar.toml`);
      const resp = await fetch(`${HOME_DOMAIN}/.well-known/stellar.toml`);
      const text = await resp.text();
      try {
        const information = toml.parse(text);
        response(`${HOME_DOMAIN}/.well-known/stellar.toml`, information);
        expect(
          information.WEB_AUTH_ENDPOINT,
          "Toml file doesn't contain a WEB_AUTH_ENDPOINT",
        );
        expect(
          information.TRANSFER_SERVER_SEP0024,
          "Toml file doesn't contain a TRANSFER_SERVER_SEP0024 field",
        );
        expect(information.CURRENCIES, "Toml file doesn't contain CURRENCIES");
        const asset = information.CURRENCIES.find((c) => c.code === ASSET_CODE);
        expect(
          asset,
          "Toml file doesn't contain a currency entry for " + ASSET_CODE,
        );
        expect(
          asset && asset.issuer && asset.issuer.length == 56,
          "Toml file asset doesn't contain a valid 56 character issuer",
        );

        state.asset_issuer = asset && asset.issuer;
        state.auth_endpoint = information.WEB_AUTH_ENDPOINT;
        state.transfer_server = information.TRANSFER_SERVER;
      } catch (e) {
        response(`${HOME_DOMAIN}/.well-known/stellar.toml`, text);
        expect(false, "stellar.toml is not a valid TOML file");
      }
    }

    if (WEB_AUTH_OVERRIDE) {
      instruction(
        "Overriding TOMLs WEB_AUTH_ENDPOINT via config: " + WEB_AUTH_OVERRIDE,
      );
      state.auth_endpoint = WEB_AUTH_OVERRIDE;
    } else {
      instruction(
        "Received WEB_AUTH_ENDPOINT from TOML: " + state.auth_endpoint,
      );
    }

    if (TRANSFER_SERVER_OVERRIDE) {
      instruction(
        "Overriding TOMLs TRANSFER_SERVER via config: " +
          TRANSFER_SERVER_OVERRIDE,
      );
      state.transfer_server = TRANSFER_SERVER_OVERRIDE;
    } else {
      instruction(
        "Received TRANSFER_SERVER from TOML: " + state.transfer_server,
      );
    }

    if (ASSET_ISSUER_OVERRIDE) {
      instruction(
        "Overriding TOMLs asset issuer via config: " + ASSET_ISSUER_OVERRIDE,
      );
      state.asset_issuer = ASSET_ISSUER_OVERRIDE;
    } else {
      instruction("Received asset issuer from TOML: " + state.asset_issuer);
    }
    if (state.transfer_server)
      state.transfer_server = state.transfer_server.replace(/\/$/, "");
    if (state.auth_endpoint)
      state.auth_endpoint = state.auth_endpoint.replace(/\/$/, "");
    if (Config.get("PUBNET")) {
      expect(
        state.transfer_server &&
          state.transfer_server.indexOf("https://") === 0,
        "Transfer server must be https",
      );
      expect(
        state.auth_endpoint && state.auth_endpoint.indexOf("https://") === 0,
        "WEB_AUTH_ENDPOINT must be https",
      );
    }
  },
};
