const express = require('express');
require('dotenv').config();
const uploadRouter = express.Router();
const controller = require('./controller');
const { authenticateToken } = require('./auth');
const { getOrCreateToken } = require('./controller'); // или authController
const { postJsonData } = require('./controller');

uploadRouter.get("/",(req, res) => {
  res.send("using api router")
});

uploadRouter.post("/save", authenticateToken,postJsonData);

uploadRouter.get('/token', getOrCreateToken);

module.exports = uploadRouter;