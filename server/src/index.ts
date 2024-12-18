import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { assignRolesAndWords, fetchWords } from "./gameLogic";
import { Room, User } from "./types";

const wss = new WebSocketServer({ port: 3000 });
const rooms: Map<string, Room> = new Map();

interface ClientMessage {
    type: string;
    roomId?: string;
    nickname?: string;
    userId?: string;
}

wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket 连接已建立");

    ws.on("message", async (message: string) => {
        const data: ClientMessage = JSON.parse(message);
        const { type, roomId, nickname , userId} = data;

        // 加入房间逻辑
        if (type === "create_room" && roomId) {
            if (rooms.has(roomId)) {
                ws.send(JSON.stringify({ type: "room_exist", message: "房间已存在" }));
                return;
            }
            const room: Room = { roomId, users: [], host: "" };
            rooms.set(roomId, room);

            ws.send(JSON.stringify({ type: "room_created", room }));
        }

        // 开始游戏逻辑
        if (type === "start_game" && roomId) {
            const room = rooms.get(roomId);

            if (room && room.users.length >= 4) {
                try {
                    const words = await fetchWords();
                    const updatedUsers = assignRolesAndWords(room.users, words);
                    room.users = updatedUsers;

                    rooms.set(roomId, room);

                    // 通知房间内所有用户
                    broadcastToRoom(roomId, { type: "game_started", users: updatedUsers });
                } catch (error) {
                    ws.send(JSON.stringify({ type: "error", message: "分配词语失败" }));
                }
            } else {
                ws.send(JSON.stringify({ type: "error", message: "人数不足，无法开始游戏" }));
            }
        }

        // 退出房间逻辑
        if (type === "exit_room" && roomId && userId) {
            const room = rooms.get(roomId);
            if (room) {
                room.users = room.users.filter((user) => user.id !== userId);
                if (room.users.length === 0) {
                    rooms.delete(roomId);
                    return;
                }
                room.host = room.users[0]?.id || "";
                rooms.set(roomId!, room);
                broadcastToRoom(roomId, { type: "room_update", room, roomId });
            }
        }

        if (type === "get_room_info" && roomId){

            const room = rooms.get(roomId);

            ws.send(JSON.stringify({ type: "room_info", room }));
        }

        if (type === "join_room" && roomId){
            const userId = uuidv4();
            const room = rooms.get(roomId);
            const user: User = { id: userId, nickname: nickname || `玩家${userId.slice(0, 4)}` };
            if (room) {
                room.users.push(user);
                if (!room.host) room.host = userId;
            } else {
                ws.send(JSON.stringify({ type: "error", message: "房间不存在" }));
                return;
            }

            rooms.set(roomId!, room);
            broadcastToRoom(roomId, { type: "room_update", room, roomId});
            ws.send(JSON.stringify({ type: "join_room_success", user, room }));
        }
    });

    ws.on("close", () => console.log("WebSocket 连接已关闭"));
});

/**
 * 广播消息到房间内所有用户
 */
function broadcastToRoom(roomId: string, message: any) {
    wss.clients.forEach((client: WebSocket) => {
        client.send(JSON.stringify(message));

        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

console.log("WebSocket 服务已启动，监听端口 3000");