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

/** --- HANDLE SOCKET SERVER TO CLIENT  --- */
// arrays user
let users = [];

// add user
const statusUser = (userId, socketId) => {
  // check array, nếu có user đó --> true
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

// Handle logic here
io.on("connection", (socket) => {
  // console.log("---> A user connected... " + `${socket.id}`);

  // user join room (room: conversation id)
  socket.on("join_room", (room) => {
    try {
      console.log("[ROM] - " + `${room}`);
      socket.join(room);

      // (get users when online)
      io.emit("get_users", users);
    } catch (err) {
      console.log(err);
    }
  });

  // status user
  socket.on("status_user", (userId) => {
    // console.log("---> A user connected... " + `${socket.id} -> ${userId}`);
    try {
      statusUser(userId, socket.id);

      io.emit("get_users", users);
    } catch (err) {
      console.log(err);
    }
  });

  // send message
  socket.on("send_message", ({ message }) => {
    console.log("[MESSAGE] -> ", message);
    try {
      const { conversation } = message;

      io.to(conversation).emit("receiver_message", message);
    } catch (err) {
      console.log({ err });
    }
  });

  // test socket
  io.emit("from_server", "Hello client!!!");
});

// test run on web
app.get("/", function (req, res) {
  res.status(200).send("Socket server running...");
});

// start socket server
server.listen(PORT, () => console.log(`Socket server running... ${PORT}!`));
