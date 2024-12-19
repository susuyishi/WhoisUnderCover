import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import TDesign from 'tdesign-vue-next';
import 'tdesign-vue-next/es/style/index.css';
import router from './router/index.js';
import ElementPlus from 'element-plus';
import { createPinia } from "pinia";
import Cookies from 'js-cookie';
import exitRoom from "./utils/exitRoom.js";

const app = createApp(App);

// 标记页面加载
sessionStorage.setItem('isReloading', 'true');

window.addEventListener('beforeunload', (event) => {
    // 检查是否是刷新页面
    if (sessionStorage.getItem('isReloading') === 'true') {
        sessionStorage.setItem('isReloading', 'false');
    } else {
        exitRoom();
        // 获取所有cookie的键
        const allCookies = Cookies.get();
        // 清除所有cookie
        for (const cookie in allCookies) {
            Cookies.remove(cookie);
        }
    }
});
app.use(TDesign);
app.use(router);
app.use(createPinia());
app.use(ElementPlus, { size: 'small', zIndex: 3000 })
app.mount("#app")
