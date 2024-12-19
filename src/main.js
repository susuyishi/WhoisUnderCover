import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import TDesign from 'tdesign-vue-next';
import 'tdesign-vue-next/es/style/index.css';
import router from './router/index.js';
import { createPinia } from "pinia";
import Cookies from 'js-cookie';
import exitRoom from "./utils/exitRoom.js";

const app = createApp(App);
window.addEventListener('beforeunload', () => {
    exitRoom();
    // 获取所有cookie的键
    const allCookies = Cookies.get();
    // 清除所有cookie
    for (const cookie in allCookies) {
        Cookies.remove(cookie);
    }
});

app.use(TDesign);
app.use(router);
app.use(createPinia());
app.mount("#app")
