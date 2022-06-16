const {
  withReservedScopes,
  fetchOidcConfig,
  discoveryPath,
  createRequester,
  generateSignInUri,
  verifyAndParseCodeFromCallbackUri,
  fetchTokenByAuthorizationCode,
  fetchTokenByRefreshToken,
} = require("@logto/js");
const fetch = require("node-fetch");
const { randomFillSync, createHash } = require("crypto");
const { fromUint8Array } = require("js-base64");

const config = {
  endpoint: "https://logto.dev",
  appId: "foo",
  redirectUri: "http://localhost:3000/callback",
  scopes: withReservedScopes().split(" "),
};

const requester = createRequester(fetch);

const generateRandomString = (length = 64) => {
  return fromUint8Array(randomFillSync(new Uint8Array(length)), true);
};

const generateCodeChallenge = async (codeVerifier) => {
  const encodedCodeVerifier = new TextEncoder().encode(codeVerifier);
  const hash = createHash("sha256");
  hash.update(encodedCodeVerifier);
  const codeChallenge = hash.digest();
  return fromUint8Array(codeChallenge, true);
};

const getOidcConfig = async () => {
  return fetchOidcConfig(
    new URL(discoveryPath, config.endpoint).toString(),
    requester
  );
};

exports.getSignInUrl = async () => {
  const { authorizationEndpoint } = await getOidcConfig();
  const codeVerifier = generateRandomString();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString();

  const { redirectUri, scopes, appId: clientId } = config;

  const signInUri = generateSignInUri({
    authorizationEndpoint,
    clientId,
    redirectUri: redirectUri,
    codeChallenge,
    state,
    scopes,
  });

  return { redirectUri, codeVerifier, state, signInUri };
};

exports.handleSignIn = async (signInSession, callbackUri) => {
  const { redirectUri, state, codeVerifier } = signInSession;
  const code = verifyAndParseCodeFromCallbackUri(
    callbackUri,
    redirectUri,
    state
  );

  const { appId: clientId } = config;
  const { tokenEndpoint } = await getOidcConfig();
  const codeTokenResponse = await fetchTokenByAuthorizationCode(
    {
      clientId,
      tokenEndpoint,
      redirectUri,
      codeVerifier,
      code,
    },
    requester
  );

  return codeTokenResponse;
};

exports.refreshTokens = async (refreshToken) => {
  const { appId: clientId, scopes } = config;
  const { tokenEndpoint } = await getOidcConfig();
  const tokenResponse = await fetchTokenByRefreshToken(
    {
      clientId,
      tokenEndpoint,
      refreshToken,
      scopes,
    },
    requester
  );

  return tokenResponse;
};
