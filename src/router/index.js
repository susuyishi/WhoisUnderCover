import { createRouter, createWebHistory } from "vue-router";
import JoinRoom from "../views/JoinRoom.vue";
import GameRoom from "../views/GameRoom.vue";
import exitRoom from "../utils/exitRoom.js";


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
        exitRoom();
        next();
    } else {
        next();
    }
});

export default router;
