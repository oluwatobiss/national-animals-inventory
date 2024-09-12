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
SELECT countries.id AS country_id, countries.name AS country, 
animals.id AS animals_id, animals.name AS national_animal, 
animal_types.id AS animal_types_id, animal_types.type 
FROM countries 
JOIN country_animal ON countries.id=country_animal.country_id
JOIN animals ON animals.id=country_animal.animal_id
JOIN animal_animal_type ON animals.id=animal_animal_type.animal_id
JOIN animal_types ON animal_animal_type.animal_type_id=animal_types.id
`;

let countryExists = false;
let animalExists = false;
let typeExists = false;

function selectAnimalData(id) {
  return `
  ${selectAnimalsData}
  WHERE countries.id=${id}
  `;
}

function showError(err) {
  console.log("===Error inserting data===");
  console.error(err.detail);
}

function getId(value) {
  const idQueries = {
    countryId: pool.query(`SELECT id FROM countries WHERE name='${value}'`),
    animalId: pool.query(`SELECT id FROM animals WHERE name='${value}'`),
    animalTypeId: pool.query(
      `SELECT id FROM animal_types WHERE type='${value}'`
    ),
  };
  return idQueries;
}

function getAnimalAnimalTypeRow(animalId, animalTypeId) {
  return pool.query(
    `SELECT * FROM animal_animal_type
      WHERE animal_id=${animalId} AND animal_type_id=${animalTypeId}`
  );
}

async function getAnimalsData() {
  await pool.query(createTables);
  const { rows } = await pool.query(selectAnimalsData);
  return rows;
}

async function getAnimalData(id) {
  const { rows } = await pool.query(selectAnimalData(id));
  return rows;
}

async function addCountryNAnimalIfNotInDB(country, animal) {
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
}

async function addAnimalTypeIfNotInDB(type) {
  try {
    await pool.query("INSERT INTO animal_types (type) VALUES ($1)", [type]);
  } catch (err) {
    showError(err);
    typeExists = err.detail.includes("already exists");
  }
}

async function addRelationshipIfNotInDB(country, animal, type) {
  const countryId = await getId(country).countryId;
  const animalId = await getId(animal).animalId;
  const animalTypeId = await getId(type).animalTypeId;

  // Check if relationship exist in the db
  const countryAnimalRow = await pool.query(
    `SELECT * FROM country_animal 
      WHERE country_id=${countryId.rows[0].id} AND animal_id=${animalId.rows[0].id}`
  );
  const animalAnimalTypeRow = await getAnimalAnimalTypeRow(
    animalId.rows[0].id,
    animalTypeId.rows[0].id
  );

  // If rowCount is truthy (> 0), it means the country_animal relationship exists in the db, so run:
  if (countryAnimalRow.rowCount) {
    console.log(countryExists);
    console.log(animalExists);
  }

  // If rowCount is falsy (0), it means the country_animal relationship does not exist in the db, so add it:
  if (!countryAnimalRow.rowCount) {
    await pool.query(
      `INSERT INTO country_animal (country_id, animal_id) 
        VALUES (${countryId.rows[0].id}, ${animalId.rows[0].id})`
    );
  }

  // If rowCount is truthy (> 0), it means the animal_animal_type relationship exists in the db, so run:
  if (animalAnimalTypeRow.rowCount) {
    console.log(animalExists);
    console.log(typeExists);
  }

  // If rowCount is falsy (0), it means the animal_animal_type relationship does not exist in the db, so add it:
  if (!animalAnimalTypeRow.rowCount) {
    await pool.query(
      `INSERT INTO animal_animal_type (animal_id, animal_type_id) 
        VALUES (${animalId.rows[0].id}, ${animalTypeId.rows[0].id})`
    );
  }
}

async function insertAnimalData(country, animal, type) {
  addCountryNAnimalIfNotInDB(country, animal);
  addAnimalTypeIfNotInDB(type);
  addRelationshipIfNotInDB(country, animal, type);
}

async function updateAnimalData(country_id, country, animal, type) {
  addAnimalTypeIfNotInDB(type);
  await pool.query(`
    UPDATE countries SET name='${country}' WHERE id=${country_id}
  `);
  await pool.query(`
    WITH temp_table AS (${selectAnimalData(country_id)})
    UPDATE animals SET name='${animal}'
      WHERE id=(SELECT temp_table.animals_id FROM temp_table)
  `);

  // Check if relationship exist in the db
  const animalId = await getId(animal).animalId;
  const animalTypeId = await getId(type).animalTypeId;
  const animalAnimalTypeRow = await getAnimalAnimalTypeRow(
    animalId.rows[0].id,
    animalTypeId.rows[0].id
  );

  // If rowCount is truthy (> 0), it means the animal_animal_type relationship exists in the db, so run:
  if (animalAnimalTypeRow.rowCount) {
    console.log("Animal Exists!");
    console.log(typeExists);
  }

  // If rowCount is falsy (0), it means the animal_animal_type relationship does not exist in the db, so update it:
  if (!animalAnimalTypeRow.rowCount) {
    await pool.query(`
      UPDATE animal_animal_type SET animal_type_id=${animalTypeId.rows[0].id}
        WHERE animal_id=${animalId.rows[0].id}
    `);
  }
}

module.exports = {
  getAnimalsData,
  getAnimalData,
  insertAnimalData,
  updateAnimalData,
};
