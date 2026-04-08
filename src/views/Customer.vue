<template>
  <div class="container">
    <button class="back-btn" @click="$router.push('/')">⬅️ 返回总大门</button>
    <div class="header">
      <h1>🛒 顾客选购端</h1>
      <p>大白话描述你的需求，AI 为你精准匹配</p>
    </div>
    
    <div class="search-box">
      <input v-model="query" @keyup.enter="performSearch" placeholder="告诉我你需要什么工具..." :disabled="loading" />
      <button @click="performSearch" :disabled="loading || !query">{{ loading ? '🤖 思考中...' : '✨ 搜索' }}</button>
    </div>

    <Warehouse3D :targetName="currentItem.name" :targetLocation="currentItem.location" :refreshKey="refresh3DKey" v-if="results.length > 0 && currentItem.name" />

    <div v-if="results.length > 0" class="results">
      <h2>为您推荐：</h2>
      <div v-for="(item, index) in results" :key="index" class="card">
        <div class="card-info">
          <h3>📦 {{ item.name }}</h3>
          <div class="specs-row">
            <span class="spec-tag">品牌：{{ item.brand }}</span>
            <span class="spec-tag">规格：{{ item.model }}</span>
          </div>
          <p class="meta-row">
            <span class="price-red">￥{{ item.price }}</span>
            <span class="loc-label">📍 {{ item.location }}</span>
            <span class="stock-label">库存: {{ item.stock }}</span>
          </p>
        </div>
        <div class="action-btns">
          <button class="view-btn" @click="currentItem = item; refresh3DKey = Date.now()">📍 3D 位置</button>
          <button class="buy-btn" @click="startPurchase(item)">🛒 购买</button>
        </div>
      </div>
    </div>
    
    <div v-else-if="searched && results.length === 0" class="no-result">🤷‍♂️ 抱歉，未找到匹配项。</div>

    <div v-if="showBuyModal" class="modal-overlay">
      <div class="modal">
        <h2>确认购买</h2>
        <div class="modal-body">
          <p><strong>商品：</strong>{{ buyingItem.name }} ({{ buyingItem.brand }})</p>
          <p><strong>规格：</strong>{{ buyingItem.model }}</p>
          <p><strong>单价：</strong>￥{{ buyingItem.price }}</p>
          <div class="input-group">
            <label>购买数量：</label>
            <input type="number" v-model="buyQuantity" min="1" :max="buyingItem.stock" />
          </div>
          <p class="total">总计：<span class="price-red">￥{{ (buyingItem.price * buyQuantity).toFixed(2) }}</span></p>
        </div>
        <div class="modal-actions">
          <button class="confirm-btn" @click="confirmBuy" :disabled="buyQuantity < 1">✅ 提交订单</button>
          <button class="cancel-btn" @click="showBuyModal = false">❌ 取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import Warehouse3D from '../components/Warehouse3D.vue'

const currentItem = ref({}); const query = ref(''); const results = ref([]); 
const loading = ref(false); const searched = ref(false); const refresh3DKey = ref(Date.now())
const showBuyModal = ref(false); const buyingItem = ref({}); const buyQuantity = ref(1)

const performSearch = async () => {
  if (!query.value.trim()) return 
  loading.value = true; searched.value = false; results.value = []; currentItem.value = {}
  try {
    const res = await axios.post('http://localhost:8080/api/hardware/semantic-search', { query: query.value, limit: 3 })
    if (res.data && res.data.ok) {
      results.value = res.data.candidates || []
      if (results.value.length > 0) {
        currentItem.value = results.value[0]
        refresh3DKey.value = Date.now()
      }
    }
  } catch (error) { console.error(error) } finally { loading.value = false; searched.value = true }
}

const startPurchase = (item) => {
  buyingItem.value = item; buyQuantity.value = 1; showBuyModal.value = true
}

const confirmBuy = async () => {
  try {
    const res = await axios.post('http://localhost:8080/api/orders/create', {
      itemId: buyingItem.value.id,
      quantity: buyQuantity.value
    })
    if (res.data && res.data.ok) {
      alert('🎉 ' + res.data.message); showBuyModal.value = false
    } else {
      alert('❌ 下单失败：' + (res.data.error || '库存不足'))
    }
  } catch (error) { alert('服务器连接失败') }
}
</script>

<style scoped>
.container { max-width: 800px; margin: 20px auto; padding: 20px; }
.search-box { display: flex; gap: 10px; margin-bottom: 20px; }
.search-box input { flex: 1; padding: 12px 20px; border-radius: 25px; border: 1px solid #ddd; outline: none; font-size: 16px; }
.search-box button { padding: 0 25px; border-radius: 25px; background: #27ae60; color: white; border: none; font-weight: bold; cursor: pointer; }
.card { display: flex; justify-content: space-between; align-items: center; background: white; padding: 20px; margin-top: 15px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.specs-row { margin: 8px 0; display: flex; gap: 10px; }
.spec-tag { background: #f0f2f5; padding: 2px 10px; border-radius: 15px; font-size: 12px; color: #666; border: 1px solid #eee; }
.meta-row { display: flex; align-items: center; gap: 15px; font-size: 14px; margin-top: 10px; }
.price-red { color: #e74c3c; font-weight: bold; font-size: 18px; }
.loc-label { color: #7f8c8d; background: #ecf0f1; padding: 2px 8px; border-radius: 4px; }
.action-btns { display: flex; flex-direction: column; gap: 8px; }
.view-btn { background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.buy-btn { background: #e67e22; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal { background: white; padding: 30px; border-radius: 15px; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.total { margin-top: 15px; font-size: 18px; border-top: 1px dashed #eee; padding-top: 15px; }
</style>