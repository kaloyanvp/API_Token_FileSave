const Pool = require('pg').Pool;
const db = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    connectTimeout: 60000,
};
const pool = new Pool(db);


module.exports = pool;