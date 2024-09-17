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
SELECT countries.id AS country_id, 
  countries.name AS country, 
  animals.id AS animal_id, 
  animals.name AS national_animal, 
  animal_types.id AS animal_type_id, 
  animal_types.type 
FROM countries 
JOIN country_animal ON countries.id=country_animal.country_id
JOIN animals ON animals.id=country_animal.animal_id
JOIN animal_animal_type ON animals.id=animal_animal_type.animal_id
JOIN animal_types ON animal_animal_type.animal_type_id=animal_types.id
`;

function getAnimalAnimalTypeRow(animalId, animalTypeId) {
  return pool.query(
    `SELECT * FROM animal_animal_type
      WHERE animal_id=${animalId} AND animal_type_id=${animalTypeId}`
  );
}

async function getAnimalsData(animalType) {
  let animalData = null;
  await pool.query(createTables);
  animalType
    ? (animalData = await pool.query(
        `${selectAnimalsData} WHERE animal_types.type='${animalType}'`
      ))
    : (animalData = await pool.query(selectAnimalsData));
  return animalData.rows;
}

async function getAnimalData(ids) {
  const { rows } = await pool.query(`
    ${selectAnimalsData}
    WHERE countries.id=${ids.country_id} AND animals.id=${ids.animal_id}
  `);
  return rows;
}

async function addCountryIfNotInDB(country) {
  try {
    await pool.query("INSERT INTO countries (name) VALUES ($1)", [country]);
  } catch (err) {
    // let countryExists = err.detail.includes("already exists");
  }
}

async function addAnimalIfNotInDB(animal) {
  try {
    await pool.query("INSERT INTO animals (name) VALUES ($1)", [animal]);
  } catch (err) {
    // let animalExists = err.detail.includes("already exists");
  }
}

async function addAnimalTypeIfNotInDB(type) {
  try {
    await pool.query("INSERT INTO animal_types (type) VALUES ($1)", [type]);
  } catch (err) {
    // let typeExists = err.detail.includes("already exists");
  }
}

async function addRelationshipIfNotInDB(country, animal, type) {
  const countryId = await pool.query(
    `SELECT id FROM countries WHERE name='${country}'`
  );
  const animalId = await pool.query(
    `SELECT id FROM animals WHERE name='${animal}'`
  );
  const animalTypeId = await pool.query(
    `SELECT id FROM animal_types WHERE type='${type}'`
  );
  // Check if relationship exist in the db
  const countryAnimalRow = await pool.query(
    `SELECT * FROM country_animal 
      WHERE country_id=${countryId.rows[0].id} AND animal_id=${animalId.rows[0].id}`
  );
  const animalAnimalTypeRow = await getAnimalAnimalTypeRow(
    animalId.rows[0].id,
    animalTypeId.rows[0].id
  );
  // If rowCount is falsy (0), it means the country_animal relationship does not exist in the db, so add it:
  if (!countryAnimalRow.rowCount) {
    await pool.query(
      `INSERT INTO country_animal (country_id, animal_id) 
        VALUES (${countryId.rows[0].id}, ${animalId.rows[0].id})`
    );
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
  await addCountryIfNotInDB(country);
  await addAnimalIfNotInDB(animal);
  await addAnimalTypeIfNotInDB(type);
  await addRelationshipIfNotInDB(country, animal, type);
}

async function updateAnimalData(ids, country, animal, type) {
  addAnimalTypeIfNotInDB(type);
  const newAnimalTypeId = await pool.query(
    `SELECT id FROM animal_types WHERE type='${type}'`
  );
  await pool.query(
    `UPDATE countries SET name='${country}' WHERE id=${ids.country_id}`
  );
  await pool.query(
    `UPDATE animals SET name='${animal}'WHERE id=${ids.animal_id}`
  );
  // Check if relationship exist in the db
  const animalAnimalTypeRow = await getAnimalAnimalTypeRow(
    ids.animal_id,
    newAnimalTypeId.rows[0].id
  );
  // If rowCount is falsy (0), it means the animal_animal_type relationship does not exist in the db, so update it:
  if (!animalAnimalTypeRow.rowCount) {
    await pool.query(`
      UPDATE animal_animal_type SET animal_type_id=${newAnimalTypeId.rows[0].id}
        WHERE animal_id=${ids.animal_id}
    `);
  }
}

async function deleteAnimalData(ids) {
  // const clickedCardInfo = await pool.query(`
  //   WITH temp_table AS (`${selectAnimalsData} WHERE countries.id=${ids.country_id}`)
  //   SELECT country, national_animal, type FROM temp_table
  //   WHERE country_id=${ids.country_id}
  //   AND animal_id=${ids.animal_id}
  //   AND animal_type_id=${ids.animal_type_id}
  // `);
  const totalCountryCards = await pool.query(`
    WITH temp_table AS (${selectAnimalsData})
    SELECT COUNT(country) FROM temp_table
    WHERE country_id=${ids.country_id}
  `);
  const totalAnimalCards = await pool.query(`
    WITH temp_table AS (${selectAnimalsData})
    SELECT COUNT(national_animal) FROM temp_table
    WHERE animal_id=${ids.animal_id}
  `);
  await pool.query(`
    DELETE FROM country_animal
      WHERE country_id=${ids.country_id} AND animal_id=${ids.animal_id}
  `);
  // Delete the animal and its type relationship from db if the clicked card is the only one using it
  if (totalAnimalCards.rows[0].count === "1") {
    await pool.query(`
      DELETE FROM animal_animal_type
        WHERE animal_id=${ids.animal_id} AND animal_type_id=${ids.animal_type_id}
    `);
    await pool.query(`DELETE FROM animals WHERE id=${ids.animal_id}`);
  }
  // Delete the country from db if the clicked card is the only one using it
  if (totalCountryCards.rows[0].count === "1") {
    await pool.query(`DELETE FROM countries WHERE id=${ids.country_id}`);
  }
}

module.exports = {
  getAnimalsData,
  getAnimalData,
  insertAnimalData,
  updateAnimalData,
  deleteAnimalData,
};
