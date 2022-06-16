const express = require("express");
const router = express.Router();

router.get("/", function (req, res, next) {
  res.render("user", { userId: req.auth });
});

module.exports = router;
