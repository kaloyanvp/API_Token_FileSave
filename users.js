const db = require('./db');
const helper = require('./helpers/helpers');
const config = require('./configs/config');

async function getAll(){
  const rows = await db.query(
    `SELECT * FROM users`
  );

  return { rows }
}

async function getUserById(id) {
    const rows = await db.query(
    `SELECT * FROM users WHERE id = ?`, [id]
  );

  return { rows }
}

async function create(user){
  const result = await db.query(
    `INSERT INTO users (firstname, lastname, username, email, password, clear_password, role, access, createdAt, updatedAt) 
    VALUES ('${user.firstname}', '${user.lastname}', '${user.username}', '${user.email}', '${user.password}', '${user.clear_password}', '${user.role}', ${user.access}, '${user.createdAt}', '${user.updatedAt}')`);

  let message = 'Error in creating person';

  if (result.affectedRows) {
    message = ['User created successfully', result.insertId];
  }

  return {message};
}

// This is working and is OK
async function update(id, user){
  const result = await db.query(
    `UPDATE users 
    SET firstname = ?, lastname = ?, username = ?, email = ?, password = ?, clear_password = ?, role = ?, access = ?, createdAt = ?, updatedAt = ? WHERE id=?`,
    [user.firstname, user.lastname, user.username, user.email, user.password, user.clear_password, user.role, user.access, user.createdAt, user.updatedAt, id]
  );

  let message = 'Error in updating person';

  if (result.affectedRows) {
    message = 'User updated successfully';
  }

  return {message};
}

async function remove(id){
  const result = await db.query(
    `DELETE FROM users WHERE id=${id}`
  );

  let message = 'Error in deleting person';

  if (result.affectedRows) {
    message = 'Person deleted successfully';
  }

  return {message};
}


module.exports = {
  getAll,
  getUserById,
  create,
  update,
  remove
}