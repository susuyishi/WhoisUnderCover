class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.isConnected = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(this.url);

            // 监听连接成功
            this.socket.onopen = () => {
                console.log("WebSocket 连接成功");
                this.isConnected = true;
                resolve();
            };

            // 监听错误
            this.socket.onerror = (error) => {
                console.error("WebSocket 连接错误:", error);
                reject(error);
            };

            // 监听连接关闭
            this.socket.onclose = () => {
                console.log("WebSocket 连接已关闭");
                this.isConnected = false;
            };
        });
    }

    send(data) {
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.error("WebSocket 未连接，无法发送数据");
        }
    }

    onMessage(callback) {
        this.socket.onmessage = (event) => {
            callback(JSON.parse(event.data));
        };
    }

    disconnect() {
        this.socket.close();
    }
}

export default WebSocketClient;
