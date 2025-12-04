const { Pool } = require("pg");

const tokenDb = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_TOKENDATABASE,
    port: process.env.DB_PORT
});

module.exports = tokenDb;
