const tokenDb = require("../tokendb");

async function getToken(){
    const rows = await tokenDb.query(
        `SELECT token FROM api_tokens
    `);
    return {rows};
}

async function createToken(data){
    const rows = await tokenDb.query(
        `INSERT INTO api_tokens (token, created_at)
         VALUES ($1, NOW())`,[data]
    );
    return {rows};
}

async function updateToken(data){
    const rows = await tokenDb.query(
        `UPDATE api_tokens 
         SET token = $1 , created_at = NOW()
         WHERE id = 1`,[data]);
    
    return {rows};
}

module.exports = {
    getToken,
    createToken,
    updateToken,
}