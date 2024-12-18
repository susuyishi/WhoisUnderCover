import { createRouter, createWebHistory } from "vue-router";
import JoinRoom from "../views/JoinRoom.vue";
import GameRoom from "../views/GameRoom.vue";
import Cookies from "js-cookie";
import WebSocketClient from "../utils/websocket.js";
const wsClient = new WebSocketClient("ws://localhost:3000");

const routes = [
    {
        path: "/",
        name: "JoinRoom",
        component: JoinRoom,
    },
    {
        path: "/room/:roomId",
        name: "GameRoom",
        component: GameRoom,
        props: true, // 将路由参数作为 props 传递给组件
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(async (to, from, next) => {
    if (to.name === "JoinRoom" && from.name === "GameRoom") {
        if (Cookies.get("userid") !== undefined && Cookies.get("userid") !== "undefined") {
            const rid = Cookies.get("roomid");
            const uid = Cookies.get("userid");
            if (!wsClient.isConnected) {
                await wsClient.connect();
            }
            wsClient.send({
                type: "exit_room",
                roomId: rid,
                userId: uid
            })
            Cookies.set("userid", undefined);
            Cookies.set("roomid", undefined);
        }
        next();
    } else {
        next();
    }
});

export default router;
