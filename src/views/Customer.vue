<template>
  <div class="container">
    <button class="back-btn" @click="$router.push('/')">⬅️ 返回总大门</button>
    <div class="header">
      <h1>🛒 顾客选购端</h1>
      <p>无需知道专业名词，用大白话描述你的需求</p>
    </div>
    
    <div class="search-box">
      <input v-model="query" @keyup.enter="performSearch" placeholder="告诉 AI 你需要什么..." :disabled="loading" />
      <button @click="performSearch" :disabled="loading || !query">{{ loading ? '🤖 思考中...' : '✨ 搜索' }}</button>
    </div>

    <Warehouse3D :targetName="currentItem.name" :targetLocation="currentItem.location" v-if="results.length > 0 && currentItem.name" />
    
    <div v-if="results.length > 0" class="results">
      <h2>为您推荐：</h2>
      <div v-for="(item, index) in results" :key="index" class="card">
        <div class="card-info">
          <h3>📦 {{ item.name }}</h3>
          <p class="loc-badge">位置：{{ item.location || '未知' }} | 💰 ￥{{ item.price || 0 }} | 📦 库存: {{ item.stock || 0 }}</p>
        </div>
        <div class="action-btns">
          <button class="view-btn" @click="currentItem = item">📍 3D 位置</button>
          <button class="buy-btn" @click="startPurchase(item)">🛒 购买</button>
        </div>
      </div>
    </div>
    <div v-else-if="searched && results.length === 0" class="no-result"><p>🤷‍♂️ 抱歉，未找到。</p></div>

    <div v-if="showBuyModal" class="modal-overlay">
      <div class="modal">
        <h2>确认购买信息</h2>
        <div class="modal-body">
          <p><strong>商品：</strong>{{ buyingItem.name }}</p>
          <p><strong>单价：</strong>￥{{ buyingItem.price }}</p>
          <p><strong>剩余库存：</strong>{{ buyingItem.stock }} 件</p>
          <div class="input-group">
            <label>购买数量：</label>
            <input type="number" v-model="buyQuantity" min="1" :max="buyingItem.stock" />
          </div>
          <p class="total"><strong>总计需要支付：</strong><span class="price-red">￥{{ (buyingItem.price * buyQuantity).toFixed(2) }}</span></p>
        </div>
        <div class="modal-actions">
          <button class="confirm-btn" @click="confirmBuy" :disabled="buyQuantity > buyingItem.stock || buyQuantity < 1">✅ 发送给店员确认</button>
          <button class="cancel-btn" @click="showBuyModal = false">❌ 再想想</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import Warehouse3D from '../components/Warehouse3D.vue'

const currentItem = ref({}) 
const query = ref('')           
const results = ref([])         
const loading = ref(false)      
const searched = ref(false)     

// 购买弹窗相关变量
const showBuyModal = ref(false)
const buyingItem = ref({})
const buyQuantity = ref(1)

const performSearch = async () => {
  if (!query.value.trim()) return 
  loading.value = true; searched.value = false; results.value = []; currentItem.value = {}
  try {
    const res = await axios.post('http://localhost:8080/api/hardware/semantic-search', { query: query.value, limit: 3 })
    if (res.data && res.data.ok) {
      results.value = res.data.candidates || []
      if (results.value.length > 0) currentItem.value = results.value[0]
    }
  } catch (error) { console.error(error) } finally { loading.value = false; searched.value = true }
}

// 唤起购买弹窗
const startPurchase = (item) => {
  buyingItem.value = item
  buyQuantity.value = 1
  showBuyModal.value = true
}

// 确认下单发给后台
const confirmBuy = async () => {
  try {
    const res = await axios.post('http://localhost:8080/api/orders/create', {
      itemId: buyingItem.value.id,
      quantity: buyQuantity.value
    })
    if (res.data && res.data.ok) {
      alert('🎉 ' + res.data.message)
      showBuyModal.value = false
    } else {
      alert('❌ 下单失败：' + (res.data.error || '未知错误'))
    }
  } catch (error) {
    alert('无法连接到服务器')
  }
}
</script>

<style scoped>
/* 原有样式简化版，加上了弹窗样式 */
.container { max-width: 800px; margin: 20px auto; padding: 20px; }
.back-btn { background: transparent; border: none; font-size: 16px; cursor: pointer; color: #7f8c8d; margin-bottom: 20px;}
.header h1 { font-size: 2.2rem; color: #2c3e50; }
.search-box { display: flex; gap: 10px; margin-bottom: 20px; }
.search-box input { flex: 1; padding: 12px; border-radius: 20px; border: 1px solid #ccc; font-size: 16px; outline: none; }
.search-box button { padding: 0 20px; border-radius: 20px; background: #27ae60; color: white; border: none; font-weight: bold; cursor: pointer; }
.results { margin-top: 20px; }
.card { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; margin-top: 10px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.loc-badge { font-size: 13px; color: #7f8c8d; background: #ecf0f1; padding: 4px 8px; border-radius: 5px; }
.action-btns { display: flex; gap: 10px; }
.view-btn { background: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; }
.buy-btn { background: #e67e22; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; }
.no-result { text-align: center; margin-top: 30px; color: #999; }

/* 弹窗核心 CSS */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal { background: white; padding: 30px; border-radius: 15px; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.modal-body p { margin: 10px 0; font-size: 16px; }
.input-group { display: flex; align-items: center; margin: 15px 0; }
.input-group input { width: 80px; padding: 5px; font-size: 16px; margin-left: 10px; }
.total { font-size: 18px; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #eee; }
.price-red { color: #e74c3c; font-weight: bold; font-size: 22px; }
.modal-actions { display: flex; justify-content: space-between; margin-top: 25px; }
.confirm-btn { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; }
.confirm-btn:disabled { background: #bdc3c7; cursor: not-allowed; }
.cancel-btn { background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; }
</style>