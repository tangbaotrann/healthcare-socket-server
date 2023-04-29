// lib
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
// const { default: parserUTF8Config } = require("../utils/parserUTF8Config");
const parserUTF8Config = require("../utils/parserUTF8Config");

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
      process.env.SOCKET_SERVER_BASE_URL_FROM_FRONT_END,
      process.env.SOCKET_SERVER_BASE_URL_ANY,
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/** --- HANDLE SOCKET SERVER TO CLIENT  --- */
// arrays user
let users = [];

// add user
const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    userId &&
    users.push({ userId, socketId });
};

// remove user
const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

// Handle logic here
io.on("connection", (socket) => {
  console.log("---> A user connected... " + `${socket.id}`);

  // When user disconnected
  socket.on("disconnect", () => {
    try {
      console.log("---> A user disconnected.", socket.id);
      removeUser(socket.id);

      // (get users when online)
      io.emit("get_users", users);
    } catch (err) {
      console.log(err);
    }
  });

  // user join room (room: conversation id)
  socket.on("join_room", (room) => {
    // console.log("[ROOM]", room);
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

  // add user (status)
  socket.on("add_user", (userId) => {
    // console.log("---> A user connected... " + `${socket.id} -> ${userId}`);
    try {
      addUser(userId, socket.id);

      io.emit("get_users", users);
    } catch (err) {
      console.log(err);
    }
  });

  // send message
  socket.on("send_message", ({ message }) => {
    console.log("[MESSAGE] -> ", message);
    try {
      const { receiverId, conversation } = message;
      // console.log("receiverId", receiverId);
      // console.log("[conversation send message]", conversation);

      const _user = getUser(receiverId);
      // console.log("[_user] -> ", _user);
      // console.log("[users] -> ", users);

      // if (_user !== undefined) {
      io.to(conversation).emit("receiver_message", { message });
      // }

      if (_user.socketId) {
        io.emit("message_notification", "Bạn vừa nhận được tin nhắn mới.");
      }
    } catch (err) {
      console.log({ err });
    }
  });

  // rule: RULE_NOTIFICATION_REGISTER_SCHEDULE
  socket.on("notification_confirm_register_schedule", ({ data }) => {
    try {
      console.log("[NOTIFICATION REGISTER SCHEDULE] ->", data);
      const { notification, schedule_detail_id } = data;

      console.log("notification -->", notification);
      console.log("schedule_detail_id -->", schedule_detail_id);

      const userArrival = getUser(notification.to);

      if (userArrival !== undefined) {
        io.to(userArrival.socketId).emit(
          "notification_confirm_register_schedule_success",
          {
            notification,
            schedule_detail_id,
          }
        );
      }
    } catch (err) {
      console.log({ err });
    }
  });

  // register schedule from patient
  socket.on("notification_register_schedule_from_patient", ({ data }) => {
    // console.log("notification ->", data);
    const { notification, schedule_detail } = data;

    console.log("notification ->", notification);
    console.log("schedule_detail ->", schedule_detail);

    try {
      const userArrival = getUser(notification.to); // schedule_detail.doctor._id

      // emit
      if (userArrival !== undefined) {
        io.to(userArrival.socketId).emit(
          "notification_register_schedule_from_patient_success",
          {
            schedule_detail,
            notification,
          }
        );
      }
    } catch (err) {
      console.log({ err });
    }
  });

  // call id room to user
  socket.on(
    "call_id_room_to_user",
    ({ conversation, infoDoctor, _scheduleMedicalMeeting, patient_id }) => {
      console.log("[conversation ID]", conversation);
      console.log("[infoDoctor]", infoDoctor);
      // console.log("[_scheduleMedicalMeeting]", _scheduleMedicalMeeting);
      console.log("[patient_id]", patient_id);

      try {
        const checkUser = conversation?.member
          ? conversation.member._id
          : patient_id;

        const userWantToCall = getUser(checkUser);
        console.log("checkUser", checkUser);
        console.log("userWantToCall", userWantToCall);

        if (userWantToCall && _scheduleMedicalMeeting !== undefined) {
          io.to(userWantToCall.socketId).emit("call_id_room_to_user_success", {
            room_id: conversation?._id ? conversation._id : conversation,
            info_doctor: infoDoctor,
            schedule_details_id: _scheduleMedicalMeeting._id,
            info_patient: parserUTF8Config(conversation.member.username),
          });
        } else if (userWantToCall) {
          io.to(userWantToCall.socketId).emit("call_id_room_to_user_success", {
            room_id: conversation?._id ? conversation._id : conversation,
            info_doctor: infoDoctor,
            info_patient: parserUTF8Config(conversation.member.username),
          });
        }
      } catch (err) {
        console.log({ err });
      }
    }
  );

  // call_now_to_user
  socket.on("call_now_to_user", ({ nowCall }) => {
    console.log("[nowCall] =>", nowCall);

    const _user = getUser(nowCall.patient._id);
    console.log("[_user] =>", _user);

    if (_user) {
      io.to(_user.socketId).emit("call_now_to_user_success", {
        nowCall,
      });
    }
  });

  // user leaved room call
  socket.on("user_leave_room_call", ({ username, roomId }) => {
    // console.log("[USER LEAVED] ->" + username + "-" + roomId);

    io.to(roomId).emit("user_leave_room_call_success", { username, roomId });
  });
});

// test run on web
app.get("/", function (req, res) {
  res.status(200).send("Socket server running...");
});

// start socket server
server.listen(PORT, () => console.log(`Socket server running... ${PORT}!`));
