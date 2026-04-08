import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Customer from '../views/Customer.vue'
import Admin from '../views/Admin.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 👇 就是这里！刚才你不小心把这里的配置漏掉了
  routes: [
    { path: '/', component: Home },             // 访问根目录，显示门户首页
    { path: '/customer', component: Customer }, // 访问 /customer，显示顾客选购页
    { path: '/admin', component: Admin }        // 访问 /admin，显示店员后台页
  ],
})

export default router