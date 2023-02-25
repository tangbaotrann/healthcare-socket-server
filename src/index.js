// lib
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");

// app
const app = express();
const PORT = process.env.PORT || 8900;

// config .env
dotenv.config();

// middleware
app.use(cors());

// create server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      process.env.SOCKET_SERVER_BASE_URL_FROM_FRONT_END,
      process.env.SOCKET_SERVER_BASE_URL_ANY,
    ],
    credentials: true,
  },
});

// Handle logic here
io.on("connection", (socket) => {
  console.log("---> A user connected... " + `${socket.id}`);

  io.emit("from_server", "Hello client!!!");
});

// test run on web
app.get("/", function (req, res) {
  res.status(200).send("Socket server running...");
});

// start socket server
server.listen(PORT, () => console.log(`Socket server running... ${PORT}!`));
