const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");

const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const { getSignInUrl, handleSignIn } = require("./logto");
const withAuth = require("./auth");
const { decodeIdToken } = require("@logto/js");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({ secret: "keyboard cat", cookie: { maxAge: 60000 } }));

app.get("/", withAuth({ requireAuth: false }), (req, res, next) => {
  res.render("index", { auth: Boolean(req.auth) });
});

app.get("/user", withAuth(), (req, res, next) => {
  res.render("user", { userId: req.auth });
});

app.get("/sign-in", async (req, res) => {
  const { redirectUri, codeVerifier, state, signInUri } = await getSignInUrl();
  req.session.signIn = { codeVerifier, state, redirectUri };
  res.redirect(signInUri);
});

app.get("/sign-out", (req, res) => {
  req.session.tokens = null;
  res.send("Sign out successful");
});

app.get("/callback", async (req, res) => {
  if (!req.session.signIn) {
    res.send("Bad request.");
    return;
  }

  const response = await handleSignIn(
    req.session.signIn,
    `${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  req.session.tokens = {
    ...response,
    exipresAt: response.expiresIn + Date.now(),
    idToken: decodeIdToken(response.idToken),
  };
  req.session.signIn = null;

  res.redirect("/");
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
