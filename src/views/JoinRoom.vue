<template>
  <div>
    <h1>加入房间</h1>
    <input v-model="roomId" placeholder="输入房间号" />
    <button @click="joinRoom">加入房间</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import WebSocketClient from "../utils/websocket.js";

const router = useRouter();
const wsClient = new WebSocketClient("ws://localhost:3000"); // WebSocket 地址

const roomId = ref(""); // 用户输入的房间号

async function joinRoom() {
  try {
    // 确保 WebSocket 连接成功
    if (!wsClient.isConnected) {
      await wsClient.connect();
    }

    // 发送加入房间请求
    wsClient.send({
      type: "create_room",
      roomId: roomId.value,
    });

    // 监听服务器消息，等待加入成功
    wsClient.onMessage((message) => {
      if (message.type === "room_created" || message.type === "room_exist") {
        console.log("加入房间成功:", message.room);

        // 跳转到房间页面，并传递房间号
        router.push({
          name: "GameRoom",
          params: {roomId: roomId.value},
        });
      }
    });
  } catch (error) {
    console.error("加入房间失败:", error);
  }
}
</script>
