const express = require('express');
require('dotenv').config();
const userRouter = express.Router();
// const users = require('../users');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
const controller = require('./controller');
const { postStudents } = require('./controller');
const { authenticateToken } = require('./auth');
const { generateToken } = require('./controller'); // или authController
const { saveJsonOnSend } = require('./controller');

userRouter.get("/",(req, res) => {
  res.send("using api router")
});


userRouter.get("/students",controller.getStudents);

//userRouter.post("/students",authenticateToken,controller.postStudents);
userRouter.post("/save",authenticateToken,saveJsonOnSend);

userRouter.get('/token', generateToken);


module.exports = userRouter;