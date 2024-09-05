const { Router } = require("express");
const controller = require("../controllers/indexController");
const router = Router();

router.get("/", controller.getAnimals);
router.get("/new-animal", controller.getAnimalForm);
router.post("/new-animal", controller.createAnimal);

module.exports = router;
