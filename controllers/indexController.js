const db = require("../db/queries");

async function getAnimals(req, res) {
  const animalsData = await db.getAnimalsData();
  res.render("index", { title: "National Animals", countries: animalsData });
}

async function getAnimalForm(req, res) {
  res.render("animalForm", { title: "Add Your National Animal" });
}

async function createAnimal(req, res) {
  const { country, animal, type } = req.body;
  await db.insertAnimal(country, animal, type);
  res.redirect("/");
}

module.exports = {
  getAnimals,
  getAnimalForm,
  createAnimal,
};
