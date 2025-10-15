const Pool = require('pg').Pool;
const db = require('./configs/config');
const pool = new Pool(db);
module.exports = pool;