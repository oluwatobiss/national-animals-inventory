const { Router } = require("express");
const controller = require("../controllers/indexController");
const router = Router();

router.get("/", controller.getAnimals);
router.get("/new-animal", controller.getAnimalForm);
router.post("/new-animal", controller.createAnimal);
router.get("/update/:country_id-:animal_id-:type_id", controller.getUpdateForm);
router.post("/update/:country_id-:animal_id-:type_id", controller.updateAnimal);
router.get("/delete/:country_id-:animal_id-:type_id", controller.deleteAnimal);

module.exports = router;
