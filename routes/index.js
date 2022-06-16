const express = require("express");
const router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { userId: req.session.tokens.idToken.sub });
});

module.exports = router;
