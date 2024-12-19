import Cookies from "js-cookie";
import WebSocketClient from "./websocket.js";
const wsClient = new WebSocketClient("ws://localhost:3000");

export default async function exitRoom() {
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
}
