<template>
  <div class="portal">
    <h1 class="title">🛠️ 智能五金店 ERP 系统</h1>
    <p class="subtitle">请选择您的登录身份</p>

    <div class="cards">
      <div class="card customer-card" @click="$router.push('/customer')">
        <div class="icon">🛒</div>
        <h2>我是顾客</h2>
        <p>AI 智能选购 · 3D 定位 · 一键下单</p>
      </div>

      <div class="card admin-card" @click="goToAdmin">
        <div class="icon">👨‍💼</div>
        <h2>我是店员</h2>
        <p>处理订单 · 库存管理 · 销售数据</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const goToAdmin = () => {
  // 一个简易的店员密码验证门槛
  const pwd = prompt('🔒 请输入店员后台安全密码 (测试默认: 123456):')
  if (pwd === '123456') {
    router.push('/admin')
  } else if (pwd !== null) {
    alert('❌ 密码错误，禁止进入！')
  }
}
</script>

<style scoped>
.portal { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
.title { font-size: 3rem; color: #2c3e50; margin-bottom: 10px; }
.subtitle { font-size: 1.2rem; color: #7f8c8d; margin-bottom: 50px; }
.cards { display: flex; gap: 40px; }
.card { background: white; padding: 40px; border-radius: 20px; width: 250px; text-align: center; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
.card:hover { transform: translateY(-10px); box-shadow: 0 15px 30px rgba(0,0,0,0.15); }
.icon { font-size: 4rem; margin-bottom: 20px; }
.customer-card h2 { color: #27ae60; }
.admin-card h2 { color: #2980b9; }
.card p { color: #95a5a6; font-size: 0.9rem; }
</style>