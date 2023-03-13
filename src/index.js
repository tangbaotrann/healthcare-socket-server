// lib
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// app
const app = express();
const PORT = process.env.PORT || 8900;

// config .env
dotenv.config();

// middleware
app.use(cors());
app.use(bodyParser.json());

// create server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      process.env.SOCKET_SERVER_BASE_URL_FROM_FRONT_END ||
        "http://localhost:3000",
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
  console.log("---> A user connected... " + `${socket.id}`);

  // user join room (room: conversation id)
  socket.on("join_room", (room) => {
    console.log("[ROOM]", room);
    try {
      const { _id } = room;

      socket.join(_id);
      socket.emit("joined_room", _id);

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
    // console.log("[MESSAGE] -> ", message);
    try {
      const { conversation } = message;
      // console.log("[conversation send message]", conversation);

      io.to(conversation).emit("receiver_message", { message });
    } catch (err) {
      console.log({ err });
    }
  });

  // rule: RULE_NOTIFICATION_REGISTER_SCHEDULE
  socket.on("notification_confirm_register_schedule", ({ data }) => {
    try {
      // console.log("[NOTIFICATION REGISTER SCHEDULE] ->", data);
      const { notification } = data;

      io.to(notification.to).emit(
        "notification_confirm_register_schedule_success",
        notification
      );
    } catch (err) {
      console.log({ err });
    }
  });

  // rule: RULE_NOTIFICATION_CANCEL_SCHEDULE
  socket.on("notification_confirm_cancel_schedule", ({ data }) => {
    try {
      // console.log("[NOTIFICATION CANCEL SCHEDULE] ->", data);
      const { notification } = data;

      io.to(notification.to).emit(
        "notification_confirm_cancel_schedule_success",
        notification
      );
    } catch (err) {
      console.log({ err });
    }
  });

  // rule: RULE_DOCTOR_REMIND
  socket.on("notification_doctor_remind", ({ data }) => {
    // console.log("[NOTIFICATION DOCTOR REMIND] ->", data);

    try {
      const { notification } = data;

      io.to(notification.to).emit(
        "notification_doctor_remind_success",
        notification
      );
    } catch (err) {
      console.log({ err });
    }
  });

  // register schedule from patient
  socket.on("notification_register_schedule_from_patient", ({ data }) => {
    // console.log("notification ->", data);
    try {
      // console.log("[NOTIFICATION- REGISTER SCHEDULE FROM PATIENT] -> ", data);
      // console.log(
      //   "[CONVERSATION- REGISTER SCHEDULE FROM PATIENT] -> ",
      //   conversation
      // );

      // emit
      io.to(data.to).emit(
        "notification_register_schedule_from_patient_success",
        data
      );
    } catch (err) {
      console.log({ err });
    }
  });

  // call id room to user
  socket.on("call_id_room_to_user", ({ conversation, infoDoctor }) => {
    console.log("[conversation ID]", conversation);
    console.log("[infoDoctor]", infoDoctor);

    try {
      io.to(conversation.member._id).emit("call_id_room_to_user_success", {
        room_id: conversation._id,
        doctor_username: infoDoctor.person.username,
      });
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
