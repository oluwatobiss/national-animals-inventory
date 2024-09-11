const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DB_URI });

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
  function showError(err) {
    console.log("===Error inserting data===");
    console.error(err.detail);
  }
  try {
    await pool.query("INSERT INTO countries (name) VALUES ($1)", [country]);
  } catch (err) {
    showError(err);
    countryExists = err.detail.includes("already exists");
  }
  try {
    await pool.query("INSERT INTO animals (name) VALUES ($1)", [animal]);
  } catch (err) {
    showError(err);
    animalExists = err.detail.includes("already exists");
  }
  try {
    await pool.query("INSERT INTO animal_types (type) VALUES ($1)", [type]);
  } catch (err) {
    showError(err);
    typeExists = err.detail.includes("already exists");
  }

  // Prevent duplicate data relationship entry
  const countryId = await pool.query(
    `SELECT id FROM countries WHERE countries.name='${country}'`
  );
  const animalId = await pool.query(
    `SELECT id FROM animals WHERE animals.name='${animal}'`
  );
  const animalTypeId = await pool.query(
    `SELECT id FROM animal_types WHERE animal_types.type='${type}'`
  );

  const countryAnimalRow = await pool.query(
    `SELECT * FROM country_animal 
      WHERE country_id=${countryId.rows[0].id} AND animal_id=${animalId.rows[0].id}`
  );
  const animalAnimalTypeRow = await pool.query(
    `SELECT * FROM animal_animal_type
      WHERE animal_id=${animalId.rows[0].id} AND animal_type_id=${animalTypeId.rows[0].id}`
  );

  // If rowCount is truthy (> 0), it means the countryAnimalRow exists, so run:
  if (countryAnimalRow.rowCount) {
    console.log(countryExists);
    console.log(animalExists);
  }

  // If rowCount is falsy (0), it means the countryAnimalRow does not exist, so run:
  if (!countryAnimalRow.rowCount) {
    await pool.query(
      `INSERT INTO country_animal (country_id, animal_id) 
        VALUES (${countryId.rows[0].id}, ${animalId.rows[0].id})`
    );
  }

  // If rowCount is falsy (0), it means the animalAnimalTypeRow does not exist, so run:
  if (!animalAnimalTypeRow.rowCount) {
    await pool.query(
      `INSERT INTO animal_animal_type (animal_id, animal_type_id) 
        VALUES (${animalId.rows[0].id}, ${animalTypeId.rows[0].id})`
    );
  }
}

module.exports = {
  getAnimalsData,
  insertAnimal,
};
