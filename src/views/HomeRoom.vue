<template>
  <div class="home-room">
    <h1>谁是卧底</h1>
    <p>输入房间号创建房间或加入房间</p>
    <!-- 房间号表单 -->
    <div class="home-room-form">
      <input type="text" placeholder="请输入4位数字房间号" required maxlength="6" v-model="roomId">
      <button @click="joinRoom">加入房间</button>
    </div>
  </div>

  <t-link theme="primary" @click="clearCookies" style="margin-top: 20px" underline> 有问题点这里 </t-link>


</template>

<script setup>
import {computed, ref} from "vue";
import {useRouter} from "vue-router";
import WebSocketClient from "../utils/websocket.js";
import Cookies from "js-cookie";
import {MessagePlugin} from "tdesign-vue-next";

const router = useRouter();
const wsClient = new WebSocketClient(import.meta.env.VITE_WS_URL); // WebSocket 地址

const roomId = ref(""); // 用户输入的房间号

function clearCookies() {
  Cookies.set("userid", undefined);
  Cookies.set("roomid", undefined);
  MessagePlugin.success('页面已修复');
}


async function joinRoom() {
  // 检测房间号是否为6位数字
  if (!/^\d{4}$/.test(roomId.value)) {
    await MessagePlugin.warning('请输入合法的房间号');
    return;
  }

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

<style>
.home-room {
  background: white;
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  width: 75%;
  max-width: 400px;
  text-align: center;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h1 {
  color: #1890ff;
  margin-bottom: 15px;
  font-size: 2.2em;
  font-weight: bold;
}

p {
  color: #666;
  margin-bottom: 30px;
  font-size: 1.1em;
}

.home-room-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

input {
  width: 80%;
  padding: 12px 20px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
}

input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

input::placeholder {
  color: #bbb;
}

button {
  background: #1890ff;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  width: 80%;
}

button:hover {
  background: #147cd2;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(1px);
}

/* 响应式调整 */
@media (max-width: 480px) {
  .home-room {
    padding: 30px 20px;
    width: 95%;
  }

  h1 {
    font-size: 1.8em;
  }

  p {
    font-size: 1em;
  }

  input, button {
    padding: 10px 15px;
    font-size: 14px;
  }
}


</style>
