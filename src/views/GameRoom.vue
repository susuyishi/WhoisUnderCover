<template>
  <nickname-dialog v-if="dialogVisible" @nickname-submitted="handleNicknameSubmitted"/>
  <div class="room-container">
    <!-- 固定顶部栏 -->
    <div class="top-bar">
      <div>房间号：<span class="room-id">{{ roomId }}</span></div>
    </div>


    <!-- 玩家列表 -->
    <div class="player-list" :key="randKey">
      <div v-for="user in users" :key="user.id" :id="user.id"
           :class="{self: user.id === userid&&!user.isDead, common: user.id!== userid&&!user.isDead}">
        <div>
          <el-avatar :id="'avatar'+user.id" :size="35" class="alive">{{ user.nickname.slice(0, 1) }}</el-avatar>
          <span v-if="user.id === hostId" style="font-size: 12px; color: #f13e3e">(房主)</span>
        </div>
        <span class="user-nickname">{{ user.nickname }}</span>
      </div>
    </div>

    <div class="game-container">
      <div class="game-title" v-if="!started">等待房主开始游戏</div>
      <div class="game-info" v-if="started">
        <div class="game-title" v-if="!isVotable">游戏进行中</div>
        <div class="game-title" v-if="isVotable">投票进行中, 请等待其他玩家投票<b>({{ countdown }} 秒)</b></div>

        <div class="game-word">{{ word }}</div>
      </div>
    </div>
  </div>

  <!-- 投票选择框-->
  <vote-dialog v-if="voteDialogVisible"  :user-id="userid" :is-votable="isVotable" :dead-man="deadMan" :users="users" :alive-users="aliveUsers" :pre-to-dead-man="preToDeadMan"
               :is-get-vote-result="isGetVoteResult" :candidate-user="candidateUser" :oprate-user="oprateUser" :ended="ended" :winner="winner" :countdown="countdown"
               @vote-to="voteTo" @close-vote-dialog="closeVoteDialog" />

  <!-- 底部操作栏 -->
  <div class="bottom-bar">
    <div v-if="isHost&&started&&!isVotable" :key="randKey" class="start-vote-button">
      <button @click="startVote">开始投票</button>
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
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SocketIOClient from "../utils/socketio.js";
import Cookies from 'js-cookie';

import NicknameDialog from '../components/nicknameDialog.vue';
import { MessagePlugin } from "tdesign-vue-next";
import VoteDialog from "../components/voteDialog.vue";

const route = useRoute();
const router = useRouter();
const socketClient = new SocketIOClient(import.meta.env.VITE_WS_URL + ":3060"); // 使用环境变量

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
const countdown = ref(15);

const started = ref(false);
const ended = ref(false);
const winner = ref("");
const word = ref("");

const userNames = ref([]);
const deadMan = ref([]);
const aliveUsers = ref([]);
const preToDeadMan = ref([]);
const isGetVoteResult = ref(true);
const isVotable = ref(false);
const voteDialogVisible = ref(false);

const oprateUser = ref([]);
const candidateUser = ref([]);

watch([users, randKey, dialogVisible, nickname, userid, hostId, isHost, isJoin, started, ended, winner, word, userNames, deadMan, aliveUsers, preToDeadMan, isGetVoteResult, isVotable, voteDialogVisible, oprateUser, candidateUser],
  ([newUsers, newRandKey, newDialogVisible, newNickname, newUserid, newHostId, newIsHost, newIsJoin, newStarted, newEnded, newWinner, newWord, newUserNames, newDeadMan, newAliveUsers, newPreToDeadMan, newIsGetVoteResult, newIsVotable, newVoteDialogVisible, newOprateUser, newCandidateUser]) => {
  Cookies.set('users', JSON.stringify(newUsers));
  Cookies.set('randKey', newRandKey);
  Cookies.set('dialogVisible', newDialogVisible);
  Cookies.set('nickname', newNickname);
  Cookies.set('userid', newUserid);
  Cookies.set('hostId', newHostId);
  Cookies.set('isHost', newIsHost);
  Cookies.set('isJoin', newIsJoin);
  Cookies.set('started', newStarted);
  Cookies.set('ended', newEnded);
  Cookies.set('winner', newWinner);
  Cookies.set('word', newWord);
  Cookies.set('userNames', JSON.stringify(newUserNames));
  Cookies.set('deadMan', JSON.stringify(newDeadMan));
  Cookies.set('aliveUsers', JSON.stringify(newAliveUsers));
  Cookies.set('preToDeadMan', JSON.stringify(newPreToDeadMan));
  Cookies.set('isGetVoteResult', newIsGetVoteResult);
  Cookies.set('isVotable', newIsVotable);
  Cookies.set('voteDialogVisible', newVoteDialogVisible);
  Cookies.set('oprateUser', JSON.stringify(newOprateUser));
  Cookies.set('candidateUser', JSON.stringify(newCandidateUser));
}, { deep: true });

onMounted(async () => {
  if (!socketClient.isConnected) {
    await socketClient.connect();
  }

  init();

  socketClient.onMessage("room_update", (message) => {
    console.log("room_update", message.room);
    if (message.roomId !== roomId) {
      return;
    }
    users.value = message.room.users;
    hostId.value = message.room.host;
    isHost.value = message.room.host === userid.value;

  });

  socketClient.onMessage("join_room_success", (message) => {
    Cookies.set("userid", message.user.id);
    Cookies.set("roomid", roomId);
    Cookies.set("nickname", message.user.nickname);
    users.value = message.room.users;
    for (const user of message.room.users) {
      if (user.nickname === nickname.value) {
        userid.value = user.id;
      }
    }
    isJoin.value = true;
    hostId.value = message.room.host;
    isHost.value = message.room.host === userid.value;
  });

  socketClient.onMessage("room_info", (message) => {
    console.log("room_info", message.room);
    users.value = message.room.users;
    console.log("users", users.value);
    // 曾经来过
    if (uid !== undefined && uid !== "undefined") {
      for (const user of message.room.users) {
        if (user.id === uid) {
          nickname.value = user.nickname;
          userid.value = user.id;
          word.value = user.word;
        }
      }
      isJoin.value = true;
      isHost.value = message.room.host === userid.value;

      // Restore state from cookies
      users.value = JSON.parse(Cookies.get('users') || '[]');
      randKey.value = Cookies.get('randKey') || '';
      dialogVisible.value = Cookies.get('dialogVisible') === 'true';
      nickname.value = Cookies.get('nickname') || '';
      userid.value = Cookies.get('userid') || '';
      hostId.value = Cookies.get('hostId') || '';
      isHost.value = Cookies.get('isHost') === 'true';
      isJoin.value = Cookies.get('isJoin') === 'true';
      started.value = Cookies.get('started') === 'true';
      ended.value = Cookies.get('ended') === 'true';
      winner.value = Cookies.get('winner') || '';
      userNames.value = JSON.parse(Cookies.get('userNames') || '[]');
      deadMan.value = JSON.parse(Cookies.get('deadMan') || '[]');
      for (const dead of deadMan.value) {
        document.getElementById(String(dead.id)).className = "userDead";
        document.getElementById('avatar' + String(dead.id)).className = "dead";
      }
      aliveUsers.value = JSON.parse(Cookies.get('aliveUsers') || '[]');
      preToDeadMan.value = JSON.parse(Cookies.get('preToDeadMan') || '[]');
      isGetVoteResult.value = Cookies.get('isGetVoteResult') === 'true';
      isVotable.value = Cookies.get('isVotable') === 'true';
      voteDialogVisible.value = Cookies.get('voteDialogVisible') === 'true';
      oprateUser.value = JSON.parse(Cookies.get('oprateUser') || '[]');
      candidateUser.value = JSON.parse(Cookies.get('candidateUser') || '[]');
    } else {
      // 第一次进来
      dialogVisible.value = true;
      voteDialogVisible.value = false;
      userNames.value = [];
      for (const user of message.room.users) {
        if (user.id !== userid.value) {
          userNames.value.push(user.nickname);
        }
      }
    }

    hostId.value = message.room.host;
  });

  socketClient.onMessage("game_started", (message) => {
    console.log("游戏开始啦");

    if (!isJoin || message.roomId !== roomId) {
      return;
    }
    MessagePlugin.success("游戏开始啦");
    clearTimeout(countdownInterval2);

    users.value = message.users;
    aliveUsers.value = message.users;
    candidateUser.value = message.users;
    oprateUser.value = message.users;
    for (const user of message.users) {
      document.getElementById(user.id).className = "common";
      document.getElementById('avatar' + user.id).className = "alive";
      if (user.id === userid.value) {
        word.value = user.word;
        document.getElementById(user.id).className = "self";
      }
    }
    started.value = true;
    // 刷新字段
    ended.value = false;
    isVotable.value = false;
    voteDialogVisible.value = false;
    isGetVoteResult.value = true;
    preToDeadMan.value = [];
    deadMan.value = [];

    console.log("word", started.value, word.value);
  });

  socketClient.onMessage("vote_started", (message) => {
    console.log("开始投票");

    if (!isJoin || message.roomId !== roomId) {
      return;
    }
    MessagePlugin.success("投票开始啦");

    isVotable.value = true;
    voteDialogVisible.value = true;
    //倒计时
    startCountdown();
  });

  socketClient.onMessage("vote_ended", (message) => {
    if (!isJoin || message.roomId !== roomId) {
      return;
    }
    clearTimeout(countdownInterval2);
    if (message.message === "卧底" || message.message === "平民") {
      winner.value = message.message;
      voteDialogVisible.value = true;
      ended.value = true;
      return;
    }

    isVotable.value = false;
    voteDialogVisible.value = true;
    console.log("投票结束" + voteDialogVisible.value);
    MessagePlugin.info("投票结束");

    if (message.deadUser.length === 1) {
      deadMan.value.push(message.deadUser[0]);
      aliveUsers.value = message.aliveUser;
      candidateUser.value = message.aliveUser;
      oprateUser.value = message.aliveUser;
      isGetVoteResult.value = true;
      console.log(deadMan.value, aliveUsers.value, candidateUser.value, oprateUser.value, isGetVoteResult.value);
      //更改样式
      document.getElementById(message.deadUser[0].id).className = "userDead";
      document.getElementById('avatar' + message.deadUser[0].id).className = "dead";
    } else if (message.deadUser.length === message.aliveUser.length) {
      aliveUsers.value = message.aliveUser;
      candidateUser.value = message.aliveUser;
      oprateUser.value = message.aliveUser;
      preToDeadMan.value = candidateUser.value;
      isGetVoteResult.value = false;
    } else {
      aliveUsers.value = message.aliveUser;
      candidateUser.value = message.deadUser;
      oprateUser.value = message.aliveUser.filter(aliveUser =>
        !candidateUser.value.some(candidate => candidate.id === aliveUser.id)
      );
      preToDeadMan.value = candidateUser.value;
      isGetVoteResult.value = false;
    }
  });

  socketClient.onMessage("error", (message) => {
    alert(message.message);
  });
});

// 在页面关闭时
window.onbeforeunload = function () {
  socketClient.disconnect();
};

async function init() {
  try {
    if (rid !== undefined && rid !== "undefined") {
      if (rid !== roomId) {
        MessagePlugin.error("你怎么进来的");
        router.push('/');
      }
    }

    socketClient.send("get_room_info", { roomId: roomId });

  } catch (error) {
    console.error(error);
  }
}

async function handleNicknameSubmitted(nn) {
  try {
    console.log("userNames", userNames.value);
    for (const niName of userNames.value) {
      if (niName === nn) {
        MessagePlugin.error("昵称已被占用");
        return;
      }
    }

    socketClient.send("join_room", { roomId: roomId, nickname: nn });

    nickname.value = nn;
    dialogVisible.value = false;
    randKey.value = Math.random().toString(36).substring(2, 15);
  } catch (error) {
    MessagePlugin.error("加入房间失败，请重试");
  }
}

function startGame() {
  socketClient.send("start_game", { roomId: roomId });
}

function startVote() {
  socketClient.send("vote_start", { roomId: roomId });

  let ctd = 15;
  countdownInterval2 = setTimeout(() => {
    socketClient.send("vote_end", { roomId: roomId });
  }, ctd * 1000); // Decrease countdown every second
}

let countdownInterval2 = null;

function startCountdown() {
  countdown.value = 15;
  let countdownInterval1 = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--;
    } else {
      clearInterval(countdownInterval1);
    }
  }, 1000); // Decrease countdown every second
}

function voteTo(voteSele) {
  try {
    socketClient.send("vote_to", {
      roomId: roomId,
      userId: voteSele,
      voteFromId: userid.value,
      oprateUser: oprateUser.value,
      candidateUser: candidateUser.value,
    });
    MessagePlugin.success("投票成功");
    voteDialogVisible.value = false;
  } catch (error) {
    MessagePlugin.error("投票失败，请重试");
  }
}

function closeVoteDialog() {
  voteDialogVisible.value = false;
}

function exitRoom() {
  if (Cookies.get("userid") === userid.value) {
    socketClient.send("exit_room", {
      roomId: roomId,
      userId: userid.value
    });
    Cookies.set("userid", undefined);
    Cookies.set("roomid", undefined);
    socketClient.disconnect();
    router.push('/'); // 返回到加入房间页面
    return;
  }
  socketClient.disconnect();
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

.player-list .userDead {
  background: #d7dcde;
  border: 1px solid #8c8585;
  opacity: 0.6;
}

.alive {
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

.dead {
  background: #484d52;
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

.start-vote-button button {
  background: #ff1833;
  color: white;
}

.start-vote-button button:hover {
  background: #ee3e53;
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
  left: 50%;
  bottom: 20px;
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
    bottom: 80px;
    top: auto;
    transform: translateX(-50%);
    width: 90%;
    max-width: 220px;
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


