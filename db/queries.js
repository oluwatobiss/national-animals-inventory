const { Pool } = require("pg");
const pool = new Pool();

const createTables = `
CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR ( 255 )
);
CREATE TABLE IF NOT EXISTS country_animal (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  country_id INTEGER,
  animal_id INTEGER
);
CREATE TABLE IF NOT EXISTS animals (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR ( 255 )
);
CREATE TABLE IF NOT EXISTS animal_animal_types (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  animal_id INTEGER,
  animal_types_id INTEGER
);
CREATE TABLE IF NOT EXISTS animal_types (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type VARCHAR ( 255 )
);
`;

const selectAnimalsData = `
SELECT countries.name as country, animals.name as national_animal, animal_types.type FROM countries 
JOIN country_animal ON countries.id=country_animal.country_id
JOIN animals ON animals.id=country_animal.animal_id
JOIN animal_animal_types ON animals.id=animal_animal_types.animal_id
JOIN animal_types ON animal_animal_types.animal_types_id=animal_types.id
`;

async function getAnimalsData() {
  await pool.query(createTables);
  const { rows } = await pool.query(selectAnimalsData);
  return rows;
}

async function insertAnimal(name, country, type) {
  await pool.query("INSERT INTO countries (name) VALUES ($1)", [country]);
  await pool.query("INSERT INTO animals (name) VALUES ($1)", [name]);
  await pool.query("INSERT INTO animal_types (type) VALUES ($1)", [type]);
}

module.exports = {
  getAnimalsData,
  insertAnimal,
};
