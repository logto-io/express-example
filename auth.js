const { decodeIdToken } = require("@logto/js");
const { refreshTokens } = require("./logto");

const auth = () => async (req, res, next) => {
  if (
    req.path === "/callback" ||
    req.path === "/sign-in" ||
    req.path === "/sign-out"
  ) {
    // Skip for auth check
    next();
    return;
  }

  if (!req.session.tokens) {
    res.redirect("/sign-in");
    return;
  }

  if (req.session.tokens.expiresAt >= Date.now()) {
    // Access token expired, refresh for new tokens
    try {
      const response = await refreshTokens(req.session.tokens.refreshToken);
      req.session.tokens = {
        ...response,
        exipresAt: response.expiresIn + Date.now(),
        idToken: decodeIdToken(response.idToken),
      };
    } catch (e) {
      console.error(e);
      res.redirect("/sign-in");
      return;
    }
  }

  next();
};

module.exports = auth;
