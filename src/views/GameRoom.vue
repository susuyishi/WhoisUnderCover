<template>
  <nickname-dialog v-if="dialogVisible" @nickname-submitted="handleNicknameSubmitted"/>
  <div class="room-container">
    <!-- 固定顶部栏 -->
    <div class="top-bar">
      <div>房间号：<span class="room-id">{{ roomId }}</span></div>
    </div>


    <!-- 玩家列表 -->
    <div class="player-list" :key="randKey">
      <div v-for="user in users" :key="user.id"
           :class="{self: user.id === userid, common: user.id!== userid}">
        <div>
          <el-avatar :size="35" class="user-avatar">{{ user.nickname.slice(0, 1) }}</el-avatar>
          <span v-if="user.id === hostId" style="font-size: 12px; color: #f13e3e">(房主)</span>
        </div>
        <span class="user-nickname">{{ user.nickname }}</span>
      </div>
    </div>

    <div class="game-container">
      <div class="game-title" v-if="!started">等待房主开始游戏</div>
      <div class="game-info" v-if="started">
        <div class="game-title">游戏进行中</div>
        <div class="game-word">{{ word }}</div>
      </div>
    </div>

    <!-- 投票选择框，固定位置在左侧 -->
    <div class="vote-container" v-if="isVoteSelectedVisible">
      <!--列表投票-->
      <div class="vote-list">
        <div v-for="user in users" :key="user.id">
          <el-radio v-model="voteSele" :label="user.id">{{ user.nickname }}</el-radio>
        </div>
      </div>

      <!-- 投票按钮 -->
      <div class="vote-button">
        <button @click="voteTo">投票</button>
      </div>
    </div>
  </div>

  <!-- 底部操作栏 -->
  <div class="bottom-bar">
    <div v-if="isHost&&started&&!ended&&!isVotable" class="start-game-button">
      <button @click="startVote">开始投票</button>
    </div>
    <div v-if="started&&!ended&&isVotable" class="start-game-button">
      <button @click="voteSelect">请投票</button>
    </div>
    <div v-if="isHost&&!started" class="start-game-button">
      <button @click="startGame">开始游戏</button>
    </div>
    <div v-if="isHost&&started" class="start-game-button">
      <button @click="startGame">重新开始</button>
    </div>
    <div class="exit-room-button">
      <button @click="exitRoom">退出房间</button>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import WebSocketClient from "../utils/websocket.js";
import Cookies from 'js-cookie';


import NicknameDialog from '../components/nicknameDialog.vue'
import {MessagePlugin} from "tdesign-vue-next";

const route = useRoute();
const router = useRouter();
const wsClient = new WebSocketClient(import.meta.env.VITE_WS_URL + ":3060");

const roomId = route.params.roomId; // 获取传递的房间号
const users = ref([]); // 房间内玩家列表
const randKey = ref("");


// 弹窗, 用于输入昵称
const dialogVisible = ref(false);
const nickname = ref("");
const userid = ref("");

const hostId = ref("");
const isHost = ref(false);
const isJoin = ref(false);

const rid = Cookies.get("roomid");
const uid = Cookies.get("userid");
const nid = Cookies.get("nickname");

const started = ref(false);
const ended = ref(false);
const word = ref("");

const userNames = ref([]);
const voteSele = ref("");
const deadMan = ref([]);
const identity = ref("");
const isVotable = ref(false);
const isVoteSelectedVisible = ref(false);

onMounted(async () => {
  if (!wsClient.isConnected) {
    await wsClient.connect();
  }
  init();

  wsClient.onMessage((message) => {
    if (message.type === "room_update") {
      if (message.roomId !== roomId) return;
      users.value = message.room.users;
      hostId.value = message.room.host;
      isHost.value = message.room.host === userid.value;

    }

    if (message.type === "join_room_success") {
      Cookies.set("userid", message.user.id);
      Cookies.set("roomid", roomId)
      Cookies.set("nickname", message.user.nickname)
      users.value = message.room.users;
      for (const user of message.room.users) {
        if (user.nickname === nickname.value) {
          userid.value = user.id;
        }
      }
      isJoin.value = true;
      hostId.value = message.room.host;
      isHost.value = message.room.host === userid.value;
    }

    if (message.type === "room_info") {
      console.log("room_info", message.room);
      users.value = message.room.users;

      // 曾经来过
      if (uid !== undefined && uid !== "undefined") {
        for (const user of message.room.users) {
          if (user.id === uid) {
            nickname.value = user.nickname;
            userid.value = user.id;
          }
        }
        isJoin.value = true;
        isHost.value = message.room.host === userid.value;
      } else {
        // 第一次进来
        dialogVisible.value = true;
        userNames.value = [];
        for (const user of message.room.users) {
          if (user.id !== userid.value) {
            userNames.value.push(user.nickname);
          }
        }
      }

      hostId.value = message.room.host;
    }

    if (message.type === "game_started") {
      console.log("游戏开始啦");
      if (!isJoin || message.roomId !== roomId) return;
      users.value = message.users;
      for (const user of message.users) {
        if (user.id === userid.value) {
          word.value = user.word;
        }
      }
      started.value = true;
      console.log("word", started.value, word.value);
    }

    if (message.type === "vote_started") {
      console.log("开始投票");
      if (!isJoin || message.roomId !== roomId) return;
      isVotable.value = true;
      //TODO 倒计时
    }
    if (message.type === "vote_ended") {
      console.log("投票结束");
      if (!isJoin || message.roomId !== roomId) return;
      isVotable.value = false;
      //TODO 判身份、
      for (const user of message.room.users) {
        if (user.isDead && !deadMan.value.includes(user.id)) {
          deadMan.value.push(user.id);
          identity.value = user.role;
          console.log(user.role);
        }
      }
      alert(identity);
      console.log(deadMan.value);
    }

    if (message.type === "error") {
      alert(message.message);
    }
  });

});


async function init() {
  try {
    if (!wsClient.isConnected) {
      await wsClient.connect();
    }

    if (rid !== undefined && rid !== "undefined") {
      if (rid !== roomId) {
        alert("你怎么进来的");
        router.push('/');
      }
    }

    wsClient.send({
      type: "get_room_info",
      roomId: roomId,
    });

  } catch (error) {
    console.error(error);
  }

}

async function handleNicknameSubmitted(nn) {
  try {
    // 确保 WebSocket 连接成功
    if (!wsClient.isConnected) {
      await wsClient.connect();
    }

    console.log("userNames", userNames.value);
    for (const niName of userNames.value) {
      if (niName === nn) {
        MessagePlugin.error("昵称已被占用");
        return;
      }
    }

    wsClient.send({
      type: "join_room",
      roomId: roomId,
      nickname: nn,
    });

    nickname.value = nn;
    dialogVisible.value = false;
    randKey.value = Math.random().toString(36).substring(2, 15);
  } catch (error) {
    alert("加入房间失败，请重试");
  }
}

function startGame() {
  wsClient.send({
    type: "start_game",
    roomId: roomId,
  });
}

function startVote() {
  wsClient.send({
    type: "vote_start",
    roomId: roomId,
  });
}


function voteSelect() {
  isVoteSelectedVisible.value = true;
}

function voteTo() {
  if (voteSele.value === "") {
    alert("请选择投票对象");
    return;
  }
  wsClient.send({
    type: "vote_to",
    roomId: roomId,
    userId: voteSele.value,
    voteFromId: userid.value,
  });
}


function exitRoom() {
  if (Cookies.get("userid") === userid.value) {
    wsClient.send({
      type: "exit_room",
      roomId: roomId,
      userId: userid.value
    });
    Cookies.set("userid", undefined);
    Cookies.set("roomid", undefined);
    router.push('/'); // 返回到加入房间页面
    return;
  }
  router.push('/'); // 返回到加入房间页面

}
</script>
<style>
.room-container {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, #e6f3ff, #ffffff);
}

.top-bar {
  height: 60px;
  background-color: #1890ff;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.room-id {
  font-weight: bold;
  font-size: 1.2em;
  margin-left: 5px;
}

.player-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.player-list > div {
  background: white;
  padding: 15px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.player-list > div:hover {
  transform: translateY(-2px);
}

.player-list .self {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.user-avatar {
  background: #1890ff;
  color: white;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-weight: bold;
}

.user-nickname {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin: 20px;
  padding: 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.game-title {
  font-size: 24px;
  color: #1890ff;
  margin-bottom: 30px;
  font-weight: 600;
  text-align: center;
  animation: slideDown 0.6s ease-out;
}

.game-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeIn 0.8s ease-out;
}

.game-word {
  font-size: 36px;
  font-weight: bold;
  color: #333;
  padding: 30px 50px;
  background: #f0f7ff;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(24, 144, 255, 0.1);
  margin-top: 20px;
  animation: scaleIn 0.5s ease-out;
  transition: transform 0.3s;
}

.game-word:hover {
  transform: scale(1.05);
}

/* 动画定义 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 游戏开始时的过渡动画 */
.game-info-enter-active {
  animation: slideIn 0.6s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 响应式调整 */
@media (max-width: 600px) {
  .game-title {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .game-word {
    font-size: 28px;
    padding: 20px 30px;
  }
}


.bottom-bar {
  height: 70px;
  background: white;
  border-top: 1px solid #eee;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 15px;
}

button {
  padding: 10px 25px;
  border-radius: 5px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

vote-button {
  background: #fa3131;
  color: white;
}

vote-button:hover {
  background: #f16a6a;
}


.start-game-button button {
  background: #1890ff;
  color: white;
}

.start-game-button button:hover {
  background: #40a9ff;
}

.exit-room-button button {
  background: #f5f5f5;
  color: #333;
}

.exit-room-button button:hover {
  background: #e6e6e6;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .player-list {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    padding: 10px;
  }

  .player-list .common {
    height: 70px;
  }

  .player-list .self {
    height: 70px;
  }

  .bottom-bar {
    height: 65px;
    padding: 0 10px;
  }

  button {
    padding: 8px 15px;
  }
}

.vote-container {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 220px;
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

.vote-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 15px;
  padding-right: 10px;
}

.vote-list::-webkit-scrollbar {
  width: 6px;
}

.vote-list::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.vote-list::-webkit-scrollbar-thumb {
  background: #1890ff;
  border-radius: 3px;
}

.vote-list > div {
  margin-bottom: 12px;
  transition: transform 0.2s;
}

.vote-list > div:hover {
  transform: translateX(5px);
}

/* 自定义radio样式 */
.el-radio {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.3s;
}

.el-radio:hover {
  background: #f0f7ff;
}

.el-radio.is-checked {
  color: #1890ff;
  background: #e6f7ff;
}

.vote-button {
  text-align: center;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.vote-button button {
  background: #1890ff;
  color: white;
  border: none;
  padding: 10px 30px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.vote-button button:hover {
  background: #40a9ff;
  transform: translateY(-1px);
}

.vote-button button:active {
  transform: translateY(1px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .vote-container {
    position: fixed;
    left: 50%;
    bottom: 20px;
    top: auto;
    transform: translateX(-50%);
    width: 90%;
    max-width: 300px;
    animation: slideUp 0.4s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .vote-list {
    max-height: 200px;
  }
}
</style>


<!--<template>-->
<!--  <div>-->
<!--    <h1>房间号：{{ roomId }}</h1>-->
<!--    <h2>玩家列表：</h2>-->
<!--    <ul>-->
<!--      <li v-for="user in users" :key="user.id">{{ user.nickname }}</li>-->
<!--    </ul>-->
<!--    <div v-if="word">-->
<!--      <p>你的词是：{{ word }}</p>-->
<!--    </div>-->
<!--    <div v-if="isHost">-->
<!--      <button @click="startGame">开始游戏</button>-->
<!--      <button @click="hostVote">开始投票</button>-->
<!--    </div>-->
<!--    <div v-if="!isJoin">-->
<!--      <input v-model="nickname" placeholder="输入昵称"/>-->
<!--      <button @click="joinRoom">加入房间</button>-->
<!--    </div>-->
<!--    <div v-if="isJoin">-->
<!--      <t-select v-model="voteSele" @change="select(voteSele)" v-if="isVotable">-->
<!--        <t-option v-for="user in users" :label="user.nickname" :value="user.nickname"/>-->
<!--      </t-select >-->
<!--    </div>-->
<!--    <button @click="exitRoom">退出房间</button>-->
<!--  </div>-->
<!--</template>-->

<!--<script setup>-->
<!--import {ref, onMounted} from "vue";-->
<!--import {useRoute, useRouter} from "vue-router";-->
<!--import WebSocketClient from "../utils/websocket.js";-->
<!--import Cookies from 'js-cookie';-->

<!--const route = useRoute();-->
<!--const router = useRouter();-->
<!--const wsClient = new WebSocketClient("ws://localhost:3000");-->

<!--const nickname = ref("");-->
<!--const userid = ref("");-->
<!--const roomId = route.params.roomId; // 获取传递的房间号-->
<!--const word = ref("");-->
<!--const users = ref([]); // 房间内玩家列表-->
<!--const isHost = ref(false); // 是否为房主-->
<!--const isJoin = ref(false);-->
<!--const rid = Cookies.get("roomid");-->
<!--const uid = Cookies.get("userid");-->
<!--const nid = Cookies.get("nickname");-->

<!--const userNames = ref([]);-->
<!--const voteSele = ref("");-->

<!--const deadMan = ref([])-->
<!--const identity = ref("")-->
<!--const isVotable = ref(false)-->

<!--onMounted(async () => {-->
<!--  if (!wsClient.isConnected) {-->
<!--    await wsClient.connect();-->
<!--  }-->
<!--  init();-->

<!--  wsClient.onMessage((message) => {-->
<!--    if (message.type === "room_update") {-->
<!--      if (message.roomId !== roomId) return;-->
<!--      users.value = message.room.users;-->
<!--      userNames.value = []-->
<!--      users.value.forEach(item => {-->
<!--        userNames.value.push(item.nickname)-->
<!--      })-->
<!--      isHost.value = message.room.host === userid.value;-->
<!--    }-->

<!--    if (message.type === "join_room_success") {-->
<!--      Cookies.set("userid", message.user.id,  { expires: 1/12 });-->
<!--      Cookies.set("roomid", roomId,  { expires: 1/12 });-->
<!--      Cookies.set("nickname", message.user.nickname,  { expires: 1/12 });-->
<!--      users.value = message.room.users;-->
<!--      userNames.value = []-->
<!--      users.value.forEach(item => {-->
<!--        userNames.value.push(item.nickname)-->
<!--      })-->
<!--      for (const user of message.room.users) {-->
<!--        if (user.nickname === nickname.value) {-->
<!--          userid.value = user.id;-->
<!--        }-->
<!--      }-->
<!--      isJoin.value = true;-->
<!--      isHost.value = message.room.host === userid.value;-->
<!--    }-->

<!--    if (message.type === "room_info") {-->
<!--      console.log("room_info", message.room);-->
<!--      users.value = message.room.users;-->
<!--      userNames.value = []-->
<!--      users.value.forEach(item => {-->
<!--        userNames.value.push({label : item.nickname, value: item.nickname})-->
<!--      })-->
<!--      console.log("room_info", userNames.value);-->

<!--      for (const user of message.room.users) {-->
<!--        if (user.id === uid) {-->
<!--          nickname.value = user.nickname;-->
<!--          userid.value = user.id;-->
<!--        }-->
<!--      }-->
<!--      isJoin.value = true;-->
<!--      isHost.value = message.room.host === userid.value;-->
<!--    }-->

<!--    if (message.type === "game_started") {-->
<!--      console.log("游戏开始啦");-->
<!--      if (!isJoin || message.roomId !== roomId) return;-->
<!--      users.value = message.users;-->
<!--      userNames.value = []-->
<!--      users.value.forEach(item => {-->
<!--        userNames.value.push(item.nickname)-->
<!--      })-->
<!--      for (const user of message.users) {-->
<!--        if (user.id === userid.value) {-->
<!--          word.value = user.word;-->
<!--        }-->
<!--      }-->
<!--    }-->

<!--    if (message.type === "vote_started") {-->
<!--      console.log("开始投票");-->
<!--      if (!isJoin || message.roomId !== roomId) return;-->
<!--      isVotable.value = true;-->
<!--      //TODO 倒计时-->
<!--    }-->

<!--    if (message.type === "vote_ended") {-->
<!--      console.log("投票结束");-->
<!--      if (!isJoin || message.roomId !== roomId) return;-->
<!--      isVotable.value = false;-->
<!--      //TODO 判身份、-->
<!--      for (const user of message.room.users) {-->
<!--        if (user.isDead && !deadMan.value.includes(user.id)){-->
<!--          deadMan.value.push(user.id);-->
<!--          identity.value = user.role;-->
<!--        }-->
<!--      }-->
<!--      console.log(identity.value);-->
<!--      console.log(deadMan.value);-->

<!--    }-->

<!--    if (message.type === "error") {-->
<!--      alert(message.message);-->
<!--    }-->
<!--  });-->

<!--});-->

<!--async function init() {-->
<!--  try {-->
<!--    if (!wsClient.isConnected) {-->
<!--      await wsClient.connect();-->
<!--    }-->

<!--    if (rid !== undefined && rid !== "undefined") {-->
<!--      if (rid !== roomId) {-->
<!--        alert("你怎么进来的");-->
<!--        router.push('/');-->
<!--      }-->
<!--    }-->

<!--    if (uid !== undefined && uid !== "undefined") {-->
<!--      wsClient.send({-->
<!--        type: "get_room_info",-->
<!--        roomId: roomId,-->
<!--      })-->
<!--    }-->
<!--  } catch (error) {-->
<!--    console.error(error);-->
<!--  }-->

<!--}-->

<!--async function hostVote() {-->
<!--  wsClient.send({-->
<!--    type: "vote_start",-->
<!--    roomId: roomId,-->
<!--  });-->
<!--}-->

<!--function select(value) {-->
<!--  console.log(value);-->
<!--  const whobe = ref("");-->
<!--  users.value.forEach(item=>{-->
<!--    if (item.nickname === value) {-->
<!--      whobe.value = item.id;-->
<!--    }-->
<!--  });-->
<!--  console.log(whobe.value);-->
<!--  wsClient.send({-->
<!--    type: "vote_to",-->
<!--    roomId: roomId,-->
<!--    userId: whobe.value,-->
<!--    voteFromId: userid.value,-->
<!--  });-->
<!--}-->

<!--async function joinRoom() {-->
<!--  try {-->
<!--    // 确保 WebSocket 连接成功-->
<!--    if (!wsClient.isConnected) {-->
<!--      await wsClient.connect();-->
<!--    }-->
<!--    if (!nickname.value) {-->
<!--      alert("请输入昵称");-->
<!--      return;-->
<!--    }-->

<!--    wsClient.send({-->
<!--      type: "join_room",-->
<!--      roomId: roomId,-->
<!--      nickname: nickname.value,-->
<!--    });-->

<!--  } catch (error) {-->
<!--    alert("加入房间失败，请重试");-->
<!--  }-->
<!--}-->

<!--function startGame() {-->
<!--  wsClient.send({-->
<!--    type: "start_game",-->
<!--    roomId: roomId,-->
<!--  });-->
<!--}-->

<!--function exitRoom() {-->
<!--  if (Cookies.get("userid") === userid.value) {-->
<!--    wsClient.send({-->
<!--      type: "exit_room",-->
<!--      roomId: roomId,-->
<!--      userId: userid.value-->
<!--    });-->
<!--    Cookies.set("userid", undefined);-->
<!--    Cookies.set("roomid", undefined);-->
<!--    router.push('/'); // 返回到加入房间页面-->
<!--    return;-->
<!--  }-->
<!--  router.push('/'); // 返回到加入房间页面-->

<!--}-->
<!--</script>-->
