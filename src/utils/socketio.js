import { io } from "socket.io-client";

class SocketIOClient {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.isConnected = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(this.url);

            // 监听连接成功
            this.socket.on("connect", () => {
                console.log("Socket.IO 连接成功");
                this.isConnected = true;
                resolve();
            });

            // 监听错误
            this.socket.on("connect_error", (error) => {
                console.error("Socket.IO 连接错误:", error);
                reject(error);
            });

            // 监听连接关闭
            this.socket.on("disconnect", () => {
                console.log("Socket.IO 连接已关闭");
                this.isConnected = false;
            });
        });
    }

    send(event, data) {
        if (this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.error("Socket.IO 未连接，无法发送数据");
        }
    }

    onMessage(event, callback) {
        this.socket.on(event, (data) => {
            callback(data);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export default SocketIOClient;
