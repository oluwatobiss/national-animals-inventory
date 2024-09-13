const db = require("../db/queries");

async function getAnimals(req, res) {
  const animalsData = await db.getAnimalsData();
  // console.log(animalsData);
  res.render("index", { title: "National Animals", countries: animalsData });
}

async function getAnimalForm(req, res) {
  res.render("newAnimalForm", { title: "Add Your National Animal" });
}

async function getUpdateForm(req, res) {
  console.log("=== Params ===");
  console.log(req.params);
  const row = await db.getAnimalData(req.params);
  res.render("updateAnimalForm", {
    title: "Update National Animal",
    row,
  });
}

async function createAnimal(req, res) {
  const { country, animal, type } = req.body;
  await db.insertAnimalData(country, animal, type);
  res.redirect("/");
}

async function updateAnimal(req, res) {
  console.log("=== Params ===");
  console.log(req.params);
  const { country, animal, type } = req.body;
  await db.updateAnimalData(req.params, country, animal, type);
  res.redirect("/");
}

async function deleteAnimal(req, res) {
  console.log("=== Params ===");
  console.log(req.params);
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
