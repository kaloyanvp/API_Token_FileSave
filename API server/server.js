const express = require("express");
require('dotenv').config();
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const port = process.env.PORT;
const api_host = process.env.API_HOST;
const uploadRouter = require('./routes/uploadRouter');
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

app.get("/", (req, res) => {
  res.writeHead(200, 
    {'Content-Type': 'text/plain'});
    var message = 'API works!\n',
        version = 'NodeJS ' + process.versions.node + '\n',
        response = [message, version].join('\n');
    res.end(response);
});

app.use("/upload", uploadRouter);

app.listen(port, () => {
  console.log(`Example app listening at http://${api_host}:${port}`);
});