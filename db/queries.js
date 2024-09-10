const { Pool } = require("pg");
const pool = new Pool();

const createTables = `
CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR ( 255 ) UNIQUE
);
CREATE TABLE IF NOT EXISTS country_animal (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  country_id INTEGER,
  animal_id INTEGER
);
CREATE TABLE IF NOT EXISTS animals (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR ( 255 ) UNIQUE
);
CREATE TABLE IF NOT EXISTS animal_animal_type (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id INTEGER,
  animal_type_id INTEGER
);
CREATE TABLE IF NOT EXISTS animal_types (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type VARCHAR ( 255 ) UNIQUE
);
`;

const selectAnimalsData = `
SELECT countries.name as country, animals.name as national_animal, animal_types.type FROM countries 
JOIN country_animal ON countries.id=country_animal.country_id
JOIN animals ON animals.id=country_animal.animal_id
JOIN animal_animal_type ON animals.id=animal_animal_type.animal_id
JOIN animal_types ON animal_animal_type.animal_type_id=animal_types.id
`;

async function getAnimalsData() {
  await pool.query(createTables);
  const { rows } = await pool.query(selectAnimalsData);
  return rows;
}

async function insertAnimal(country, animal, type) {
  let countryExists = false;
  let animalExists = false;
  let typeExists = false;
  // Prevent duplicate data entry
  try {
    countryExists = await pool.query(
      "INSERT INTO countries (name) VALUES ($1)",
      [country]
    );
  } catch (err) {
    console.error(err.detail);
    countryExists = err.detail.includes("already exists");
  }
  try {
    animalExists = await pool.query("INSERT INTO animals (name) VALUES ($1)", [
      animal,
    ]);
  } catch (err) {
    console.error(err.detail);
    animalExists = err.detail.includes("already exists");
  }
  try {
    typeExists = await pool.query(
      "INSERT INTO animal_types (type) VALUES ($1)",
      [type]
    );
  } catch (err) {
    console.error(err.detail);
    typeExists = err.detail.includes("already exists");
  }

  // Prevent duplicate data relationship entry
  const countryId = await pool.query(
    "SELECT id FROM countries WHERE countries.name=$1",
    [country]
  );
  const animalId = await pool.query(
    "SELECT id FROM animals WHERE animals.name=$1",
    [animal]
  );
  const animalTypeId = await pool.query(
    "SELECT id FROM animal_types WHERE animal_types.type=$1",
    [type]
  );

  const countryAnimalRowExists = await pool.query(
    `SELECT * FROM country_animal WHERE country_id=${countryId} AND animal_id=${animalId}`
  );
  const animalAnimalTypeRowExists = await pool.query(
    `SELECT * FROM country_animal WHERE animal_id=${animalId} AND animal_type_id=${animalTypeId}`
  );

  if (countryAnimalRowExists) {
    console.log(countryExists);
    console.log(animalExists);
  }

  if (!countryAnimalRowExists) {
    await pool.query(
      `INSERT INTO country_animal (country_id, animal_id) VALUES (${countryId}, ${animalId})`
    );
  }

  if (!animalAnimalTypeRowExists) {
    await pool.query(
      `INSERT INTO animal_animal_type (animal_id, animal_type_id) VALUES (${animalId}, ${animalTypeId})`
    );
  }
}

module.exports = {
  getAnimalsData,
  insertAnimal,
};
