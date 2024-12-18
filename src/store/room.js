import { defineStore } from 'pinia';

export const useRoomStore = defineStore('room', {
    state: () => ({
        roomId: '',
        users: [],
        userId: '',
        nickname: '',
        role: '', // 身份
        word: '', // 词语
        isHost: false, // 是否是房主
    }),
    actions: {
        setRoomData(data) {
            this.users = data.users;
            this.roomId = data.roomId;
        },
        setUserRole(role, word) {
            this.role = role;
            this.word = word;
        },
    },
});
