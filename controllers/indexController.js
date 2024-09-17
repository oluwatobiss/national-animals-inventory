const { body, validationResult } = require("express-validator");
const db = require("../db/queries");

const alphaErr = "must contain letters only.";
const lengthErr = "must be between 2 to 30 characters.";

const formValidator = [
  body("country")
    .trim()
    .isAlpha("en-US", { ignore: " " })
    .withMessage(`Country ${alphaErr}`)
    .isLength({ min: 2, max: 30 })
    .withMessage(`Country ${lengthErr}`),
  body("animal")
    .trim()
    .isAlpha("en-US", { ignore: [" ", "-"] })
    .withMessage(`Animal ${alphaErr}`)
    .isLength({ min: 2, max: 30 })
    .withMessage(`Animal ${lengthErr}`),
];

async function getAnimals(req, res) {
  const animalType = req.query.animal_type;
  const animalsData = await db.getAnimalsData(animalType);
  res.render("index", {
    title: "National Animals",
    countries: animalsData,
    type: animalType,
    clickedTypeBtn: animalType,
  });
}

async function getAnimalForm(req, res) {
  res.render("newAnimalForm", {
    title: "Add a National Animal",
    errInputs: {
      country: "",
      animal: "",
      type: "",
    },
  });
}

const createAnimal = [
  formValidator,
  async (req, res) => {
    const { country, animal, type } = req.body;
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).render("newAnimalForm", {
        title: "Add a National Animal",
        errors: result.array(),
        errInputs: {
          country,
          animal,
          type,
        },
      });
    }
    await db.insertAnimalData(country, animal, type);
    res.redirect("/");
  },
];

async function getUpdateForm(req, res) {
  const row = await db.getAnimalData(req.params);
  res.render("updateAnimalForm", {
    title: "Update National Animal",
    row,
  });
}

const updateAnimal = [
  formValidator,
  async (req, res) => {
    const { country_id, animal_id, animal_type_id } = req.params;
    const { country, animal, type } = req.body;
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).render("updateAnimalForm", {
        title: "Update National Animal",
        errors: result.array(),
        row: [
          {
            country_id,
            animal_id,
            animal_type_id,
            country,
            national_animal: animal,
            type,
          },
        ],
      });
    }
    await db.updateAnimalData(req.params, country, animal, type);
    res.redirect("/");
  },
];

async function deleteAnimal(req, res) {
  await db.deleteAnimalData(req.params);
  res.redirect("/");
}

module.exports = {
  getAnimals,
  getAnimalForm,
  getUpdateForm,
  createAnimal,
  updateAnimal,
  deleteAnimal,
};
