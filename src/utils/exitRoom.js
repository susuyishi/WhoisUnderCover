import Cookies from "js-cookie";
import SocketIOClient from "./socketio.js";
const socketClient = new SocketIOClient(import.meta.env.VITE_WS_URL + ":3060");

export default async function exitRoom() {
    if (Cookies.get("userid") !== undefined && Cookies.get("userid") !== "undefined") {
        const rid = Cookies.get("roomid");
        const uid = Cookies.get("userid");
        if (!socketClient.isConnected) {
            await socketClient.connect();
        }
        socketClient.send("exit_room", {
            roomId: rid,
            userId: uid
        });
        Cookies.set("userid", undefined);
        Cookies.set("roomid", undefined);
        // 找到所有cookie并删除
        const cookies = Cookies.get();
        for (const key in cookies) {
            Cookies.remove(key);
        }
        socketClient.disconnect();
    }
}
