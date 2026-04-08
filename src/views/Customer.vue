<template>
  <div class="container">
    <button class="back-btn" @click="$router.push('/')">⬅️ 返回总大门</button>
    <div class="header">
      <h1>🛒 顾客 AI 选购端</h1>
      <p>支持大白话描述需求，支持语音输入 🎙️</p>
    </div>
    
    <div class="search-section">
      <div class="search-box">
        <input v-model="query" @keyup.enter="performSearch" placeholder="描述你的需求 (如: 我要买最结实的铁锤)..." :disabled="loading" />
        
        <button class="voice-btn" :class="{ 'is-listening': isListening }" @click="toggleVoiceInput" title="语音输入">
          {{ isListening ? '🛑' : '🎙️' }}
        </button>

        <button class="search-btn" @click="performSearch" :disabled="loading || !query">
          {{ loading ? '🤔 匹配中...' : '✨ 搜索' }}
        </button>
      </div>
      <div v-if="isListening" class="voice-hint">正在倾听，请说话...</div>
    </div>

    <Warehouse3D :targetName="currentItem.name" :targetLocation="currentItem.location" :refreshKey="refresh3DKey" v-if="results.length > 0 && currentItem.name" />

    <div v-if="results.length > 0" class="results">
      <h2>为您匹配到以下工具：</h2>
      <div v-for="(item, index) in results" :key="index" class="card">
        <div class="card-left">
          <h3>📦 {{ item.name }}</h3>
          <div class="specs">
            <span class="tag">品牌：{{ item.brand || '通用' }}</span>
            <span class="tag">规格：{{ item.model || '标准' }}</span>
          </div>
          <div class="meta">
            <span class="price">￥{{ item.price }}</span>
            <span class="location">📍 {{ item.location }}</span>
            <span class="stock">库存: {{ item.stock }}</span>
          </div>
        </div>
        <div class="card-right">
          <button class="view-btn" @click="currentItem = item; refresh3DKey = Date.now()">📍 3D 位置</button>
          <button class="buy-btn" @click="startPurchase(item)">🛒 购买</button>
        </div>
      </div>
    </div>
    
    <div v-else-if="searched && results.length === 0" class="no-result">🤷‍♂️ 抱歉，库内暂无匹配商品，请换个词试试。</div>

    <div v-if="showBuyModal" class="modal-overlay">
      <div class="modal">
        <h2>确认订单信息</h2>
        <div class="modal-body">
          <p><strong>商品：</strong>{{ buyingItem.name }} ({{ buyingItem.brand }})</p>
          <p><strong>单价：</strong>￥{{ buyingItem.price }}</p>
          <div class="buy-qty">
            <label>购买数量：</label>
            <input type="number" v-model="buyQuantity" min="1" :max="buyingItem.stock" />
          </div>
          <p class="order-total">应付总额：<span class="price-red">￥{{ (buyingItem.price * buyQuantity).toFixed(2) }}</span></p>
        </div>
        <div class="modal-actions">
          <button class="confirm-btn" @click="confirmBuy" :disabled="buyQuantity < 1">✅ 提交给店员</button>
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

const query = ref(''); const results = ref([]); const loading = ref(false)
const searched = ref(false); const currentItem = ref({}); const refresh3DKey = ref(Date.now())
const showBuyModal = ref(false); const buyingItem = ref({}); const buyQuantity = ref(1)

// ================= 🎙️ 语音识别逻辑 (Web Speech API) =================
const isListening = ref(false)
let recognition = null

if (window.webkitSpeechRecognition || window.SpeechRecognition) {
  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = false

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript
    query.value = text.replace(/[。，？！]/g, '') // 清理标点
    isListening.value = false
    performSearch() // 识别完直接搜
  }

  recognition.onerror = () => { isListening.value = false }
  recognition.onend = () => { isListening.value = false }
}

const toggleVoiceInput = () => {
  if (!recognition) return alert("您的浏览器不支持语音识别，请使用 Chrome 浏览器")
  if (isListening.value) {
    recognition.stop()
  } else {
    isListening.value = true
    recognition.start()
  }
}

// ================= 🔍 搜索与购买 =================
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
      alert('❌ 失败：' + (res.data.error || '库存不足'))
    }
  } catch (error) { alert('服务器连接中断') }
}
</script>

<style scoped>
.container { max-width: 850px; margin: 20px auto; padding: 20px; }
.search-section { margin-bottom: 25px; position: relative; }
.search-box { display: flex; gap: 10px; align-items: center; background: white; padding: 5px; border-radius: 35px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.search-box input { flex: 1; border: none; padding: 12px 20px; outline: none; font-size: 16px; background: transparent; }
.voice-btn { background: #f8f9fa; border: none; font-size: 20px; cursor: pointer; padding: 5px 15px; border-radius: 50%; transition: all 0.3s; }
.voice-btn.is-listening { background: #ff4757; animation: pulse 1.5s infinite; }
.search-btn { background: #27ae60; color: white; border: none; padding: 12px 30px; border-radius: 25px; font-weight: bold; cursor: pointer; }
.voice-hint { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); color: #ff4757; font-size: 12px; margin-top: 5px; font-weight: bold;}

.card { display: flex; justify-content: space-between; align-items: center; background: white; padding: 20px; margin-top: 15px; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-left: 5px solid #27ae60; }
.specs { display: flex; gap: 8px; margin: 8px 0; }
.tag { background: #f1f2f6; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #57606f; }
.meta { display: flex; align-items: center; gap: 15px; margin-top: 12px; font-size: 14px; }
.price { color: #e74c3c; font-weight: bold; font-size: 20px; }
.location { color: #7f8c8d; background: #eee; padding: 2px 8px; border-radius: 4px; }

.action-btns { display: flex; flex-direction: column; gap: 10px; }
.view-btn { background: #3498db; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; }
.buy-btn { background: #e67e22; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold; }

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal { background: white; padding: 35px; border-radius: 20px; width: 420px; }
.order-total { margin-top: 20px; font-size: 20px; border-top: 2px dashed #f1f2f6; padding-top: 20px; }
</style>