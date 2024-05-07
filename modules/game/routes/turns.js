const router = require("express").Router();

const { getTurnsGeometry, getTurnsByIds } = require("../controllers/Turn");

router.get("/geometry", getTurnsGeometry);
router.get("/ids", getTurnsByIds);

module.exports = router;