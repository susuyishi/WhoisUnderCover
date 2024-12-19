<template>
  <div>
    <h1>房间号：{{ roomId }}</h1>
    <h2>玩家列表：</h2>
    <ul>
      <li v-for="user in users" :key="user.id">{{ user.nickname }}</li>
    </ul>
    <div v-if="word">
      <p>你的词是：{{ word }}</p>
    </div>
    <div v-if="isHost">
      <button @click="startGame">开始游戏</button>
      <button @click="hostVote">开始投票</button>
    </div>
    <div v-if="!isJoin">
      <input v-model="nickname" placeholder="输入昵称"/>
      <button @click="joinRoom">加入房间</button>
    </div>
    <div v-if="isJoin">
      <t-select v-model="voteSele" @change="select(voteSele)" v-if="isVotable">
        <t-option v-for="user in users" :label="user.nickname" :value="user.nickname"/>
      </t-select >
    </div>
    <button @click="exitRoom">退出房间</button>
  </div>
</template>

<script setup>
import {ref, onMounted} from "vue";
import {useRoute, useRouter} from "vue-router";
import WebSocketClient from "../utils/websocket.js";
import Cookies from 'js-cookie';

const route = useRoute();
const router = useRouter();
const wsClient = new WebSocketClient("ws://localhost:3000");

const nickname = ref("");
const userid = ref("");
const roomId = route.params.roomId; // 获取传递的房间号
const word = ref("");
const users = ref([]); // 房间内玩家列表
const isHost = ref(false); // 是否为房主
const isJoin = ref(false);
const rid = Cookies.get("roomid");
const uid = Cookies.get("userid");
const nid = Cookies.get("nickname");

const userNames = ref([]);
const voteSele = ref("");

const deadMan = ref([])
const identity = ref("")
const isVotable = ref(false)

onMounted(async () => {
  if (!wsClient.isConnected) {
    await wsClient.connect();
  }
  init();

  wsClient.onMessage((message) => {
    if (message.type === "room_update") {
      if (message.roomId !== roomId) return;
      users.value = message.room.users;
      userNames.value = []
      users.value.forEach(item => {
        userNames.value.push(item.nickname)
      })
      isHost.value = message.room.host === userid.value;
    }

    if (message.type === "join_room_success") {
      Cookies.set("userid", message.user.id);
      Cookies.set("roomid", roomId)
      Cookies.set("nickname", message.user.nickname)
      users.value = message.room.users;
      userNames.value = []
      users.value.forEach(item => {
        userNames.value.push(item.nickname)
      })
      for (const user of message.room.users) {
        if (user.nickname === nickname.value) {
          userid.value = user.id;
        }
      }
      isJoin.value = true;
      isHost.value = message.room.host === userid.value;
    }

    if (message.type === "room_info") {
      console.log("room_info", message.room);
      users.value = message.room.users;
      userNames.value = []
      users.value.forEach(item => {
        userNames.value.push({label : item.nickname, value: item.nickname})
      })
      console.log("room_info", userNames.value);

      for (const user of message.room.users) {
        if (user.id === uid) {
          nickname.value = user.nickname;
          userid.value = user.id;
        }
      }
      isJoin.value = true;
      isHost.value = message.room.host === userid.value;
    }

    if (message.type === "game_started") {
      console.log("游戏开始啦");
      if (!isJoin || message.roomId !== roomId) return;
      users.value = message.users;
      userNames.value = []
      users.value.forEach(item => {
        userNames.value.push(item.nickname)
      })
      for (const user of message.users) {
        if (user.id === userid.value) {
          word.value = user.word;
        }
      }
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
        if (user.isDead && !deadMan.value.includes(user.id)){
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

    if (uid !== undefined && uid !== "undefined") {
      wsClient.send({
        type: "get_room_info",
        roomId: roomId,
      })
    }
  } catch (error) {
    console.error(error);
  }

}

async function hostVote() {
  wsClient.send({
    type: "vote_start",
    roomId: roomId,
  });
}

function select(value) {
  console.log(value);
  const whobe = ref("");
  users.value.forEach(item=>{
    if (item.nickname === value) {
      whobe.value = item.id;
    }
  });
  console.log(whobe.value);
  wsClient.send({
    type: "vote_to",
    roomId: roomId,
    userId: whobe.value,
    voteFromId: userid.value,
  });
}

async function joinRoom() {
  try {
    // 确保 WebSocket 连接成功
    if (!wsClient.isConnected) {
      await wsClient.connect();
    }
    if (!nickname.value) {
      alert("请输入昵称");
      return;
    }

    wsClient.send({
      type: "join_room",
      roomId: roomId,
      nickname: nickname.value,
    });

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
