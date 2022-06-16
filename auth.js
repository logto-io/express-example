const { decodeIdToken } = require("@logto/js");
const { refreshTokens } = require("./logto");

const withAuth =
  ({ requireAuth } = { requireAuth: true }) =>
  async (req, res, next) => {
    if (requireAuth && !req.session.tokens) {
      res.redirect("/sign-in");
      return;
    }

    if (req.session.tokens) {
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

      req.auth = req.session.tokens.idToken.sub;
    }

    next();
  };

module.exports = withAuth;
