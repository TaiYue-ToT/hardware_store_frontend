<template>
  <div class="admin-container">
    <div class="top-nav">
      <button class="back-btn" @click="$router.push('/')">⬅️ 退出登录，返回大门</button>
      <h1>👨‍💼 店员后台管理中枢</h1>
    </div>

    <div class="dashboard">
      <div class="panel orders-panel">
        <h2>🔔 待处理订单 <span class="badge" v-if="orders.length > 0">{{ orders.length }}</span></h2>
        
        <div v-if="loadingOrders" class="loading">正在获取订单...</div>
        <div v-else-if="orders.length === 0" class="empty-state">🎉 太棒了，当前没有积压的订单！</div>
        
        <div v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-info">
            <div class="order-title">📦 {{ order.itemName }}</div>
            <p><strong>需求数量：</strong>{{ order.quantity }} 件</p>
            <p><strong>订单总价：</strong><span class="price-red">￥{{ order.totalPrice }}</span></p>
            <p class="time">🕒 下单时间：{{ new Date(order.createTime).toLocaleString() }}</p>
          </div>
          <div class="order-actions">
            <button class="approve-btn" @click="handleApprove(order.id)">✅ 确认发货并扣库存</button>
            <button class="reject-btn" @click="handleCancel(order.id)">❌ 驳回取消</button>
          </div>
        </div>
      </div>

      <div class="panel add-panel">
        <h2>📦 新货物入库登记</h2>
        <form @submit.prevent="handleAddItem" class="add-form">
          <div class="form-group">
            <label>工具名称：</label>
            <input v-model="newItem.name" required placeholder="例如：得力无刷电钻" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>入库数量：</label>
              <input type="number" v-model="newItem.stock" required min="1" placeholder="填数字" />
            </div>
            <div class="form-group">
              <label>单价(￥)：</label>
              <input type="number" step="0.01" v-model="newItem.price" required placeholder="0.00" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>品牌：</label>
              <input v-model="newItem.brand" placeholder="选填" />
            </div>
            <div class="form-group">
              <label>型号：</label>
              <input v-model="newItem.model" placeholder="选填" />
            </div>
          </div>
          <div class="form-group">
            <label>货架位置 (Location)：</label>
            <input v-model="newItem.location" required placeholder="决定3D红框位置，如: A-1" />
          </div>
          
          <button type="submit" class="submit-btn" :disabled="submitting">
            {{ submitting ? '录入中...' : '➕ 确认录入数据库' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// 订单相关数据
const orders = ref([])
const loadingOrders = ref(false)

// 新商品相关数据
const submitting = ref(false)
const newItem = ref({
  name: '', stock: '', price: '', brand: '', model: '', location: ''
})

// ==========================================
// 🟢 获取待处理订单
// ==========================================
const fetchOrders = async () => {
  loadingOrders.value = true
  try {
    const res = await axios.get('http://localhost:8080/api/orders/pending')
    orders.value = res.data
  } catch (error) {
    console.error(error)
    alert('无法获取订单数据，请检查后端是否运行')
  } finally {
    loadingOrders.value = false
  }
}

// ==========================================
// 🟢 确认订单 (发货扣库存)
// ==========================================
const handleApprove = async (orderId) => {
  if (!confirm('确定要发货并扣除该商品的库存吗？')) return
  try {
    const res = await axios.post(`http://localhost:8080/api/orders/approve/${orderId}`)
    if (res.data.ok) {
      alert('✅ ' + res.data.message)
      fetchOrders() // 刷新列表
    } else {
      alert('❌ 操作失败：' + res.data.error)
    }
  } catch (error) {
    alert('请求失败')
  }
}

// ==========================================
// 🟢 驳回订单
// ==========================================
const handleCancel = async (orderId) => {
  if (!confirm('确定要驳回取消该订单吗？')) return
  try {
    const res = await axios.post(`http://localhost:8080/api/orders/cancel/${orderId}`)
    if (res.data.ok) {
      fetchOrders() // 刷新列表
    }
  } catch (error) {
    alert('请求失败')
  }
}

// ==========================================
// 🟢 添加新商品到数据库
// ==========================================
const handleAddItem = async () => {
  submitting.value = true
  try {
    const res = await axios.post('http://localhost:8080/api/hardware/add', newItem.value)
    if (res.data && res.data.id) {
      alert(`🎉 成功入库！新工具【${res.data.name}】已存入数据库！\n您可以去顾客端呼叫 AI 搜索它了！`)
      // 清空表单
      newItem.value = { name: '', stock: '', price: '', brand: '', model: '', location: '' }
    } else {
      alert('入库失败，请重试')
    }
  } catch (error) {
    console.error(error)
    alert('入库请求失败')
  } finally {
    submitting.value = false
  }
}

// 页面加载时自动获取一次订单
onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.admin-container { max-width: 1100px; margin: 0 auto; padding: 20px; color: #333; }
.top-nav { display: flex; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #ecf0f1; padding-bottom: 15px;}
.back-btn { background: #95a5a6; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; margin-right: 20px; font-weight: bold;}
.top-nav h1 { margin: 0; color: #2c3e50; }

.dashboard { display: flex; gap: 30px; align-items: flex-start; }
.panel { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); flex: 1; }
.panel h2 { margin-top: 0; color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; display: inline-block;}
.badge { background: #e74c3c; color: white; font-size: 14px; padding: 3px 10px; border-radius: 20px; vertical-align: middle; margin-left: 10px;}

/* 订单卡片样式 */
.empty-state { text-align: center; color: #7f8c8d; padding: 40px 0; font-size: 1.1rem; }
.order-card { border: 1px solid #e0e6ed; border-radius: 10px; padding: 15px; margin-bottom: 15px; background: #fdfefe; transition: transform 0.2s;}
.order-card:hover { transform: translateX(5px); border-color: #3498db;}
.order-title { font-size: 1.2rem; font-weight: bold; color: #e67e22; margin-bottom: 10px;}
.order-info p { margin: 5px 0; color: #555; }
.price-red { color: #e74c3c; font-weight: bold; font-size: 1.1rem;}
.time { font-size: 0.85rem; color: #95a5a6; margin-top: 10px !important;}
.order-actions { display: flex; gap: 10px; margin-top: 15px; border-top: 1px dashed #eee; padding-top: 15px;}
.approve-btn { flex: 2; background: #27ae60; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;}
.reject-btn { flex: 1; background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; }

/* 表单样式 */
.add-form { margin-top: 20px; }
.form-row { display: flex; gap: 15px; }
.form-row .form-group { flex: 1; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; font-size: 0.9rem;}
.form-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; font-size: 1rem; outline: none; transition: border 0.3s;}
.form-group input:focus { border-color: #3498db; }
.submit-btn { width: 100%; background: #3498db; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-top: 10px;}
.submit-btn:hover { background: #2980b9; }
.submit-btn:disabled { background: #bdc3c7; cursor: not-allowed; }
</style>