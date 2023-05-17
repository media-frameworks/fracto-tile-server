const express = require("express");
const cors = require('cors');
const server = require('./admin/server.json')

const app = express();
const PORT = server.port

app.use(express.json());
app.use(express.urlencoded({extended: false}))

app.use(cors({
   origin: "*"
}));

app.listen(PORT, () => console.log(`Server listening at port ${PORT}`));
