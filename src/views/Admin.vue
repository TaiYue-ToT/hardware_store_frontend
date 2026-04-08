<template>
  <div class="admin-container">
    <div class="top-nav">
      <button class="back-btn" @click="$router.push('/')">⬅️ 退出系统</button>
      <h1>👨‍💼 五金店中央控制台</h1>
    </div>

    <div class="dashboard top-dash">
      <div class="panel orders-panel">
        <h2>🔔 待确认订单 <span class="badge" v-if="orders.length > 0">{{ orders.length }}</span></h2>
        <div v-for="order in orders" :key="order.id" class="order-card">
          <h3>📦 {{ order.itemName }} (x{{ order.quantity }})</h3>
          <div class="order-actions">
            <button class="approve-btn" @click="handleApprove(order.id)">✅ 确认发货</button>
            <button class="reject-btn" @click="handleCancel(order.id)">❌ 驳回</button>
          </div>
        </div>
      </div>

      <div class="panel history-panel">
        <h2>📜 销售流水</h2>
        <div class="table-wrapper mini-table">
          <table class="data-table">
            <thead><tr><th>商品</th><th>金额</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td>{{ h.itemName }}</td>
                <td class="price-red">￥{{ h.totalPrice }}</td>
                <td>{{ h.status === 1 ? '✅' : '❌' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel add-panel full-width">
      <h2>📦 新货入库</h2>
      <form @submit.prevent="handleAddItem" class="add-form-inline">
        <input v-model="newItem.name" required placeholder="名称 (如: 3M-101)" />
        <input v-model="newItem.brand" required placeholder="品牌" />
        <input v-model="newItem.model" required placeholder="规格" />
        <input type="number" v-model="newItem.stock" required placeholder="数量" />
        <input type="number" step="0.01" v-model="newItem.price" required placeholder="单价" />
        <div class="loc-mini">
          <input type="number" v-model="locShelf" />架
          <input type="number" v-model="locLayer" />层
          <input type="number" v-model="locSlot" />格
        </div>
        <button type="submit" class="submit-btn" :disabled="submitting">➕ 提交</button>
      </form>
    </div>

    <div class="panel inventory-panel">
      <div class="panel-header">
        <div class="title-area">
          <h2>📊 实时库存表</h2>
          <input v-model="searchKey" placeholder="🔍 搜索名称/品牌/规格..." class="search-input" />
        </div>
        <button class="toggle-btn" @click="isInventoryCollapsed = !isInventoryCollapsed">
          {{ isInventoryCollapsed ? '展开 ▼' : '收起 ▲' }}
        </button>
      </div>

      <div v-show="!isInventoryCollapsed" class="table-wrapper main-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>序号</th><th>名称</th><th>品牌</th><th>规格</th><th>价格</th><th>库存</th><th>位置</th><th>管理</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in filteredInventory" :key="item.id">
              <td class="index-col">{{ index + 1 }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.brand }}</td>
              <td>{{ item.model }}</td>
              <td>
                <span v-if="!item.isEditing" class="price-text">{{ item.price }}</span>
                <input v-else type="number" step="0.01" v-model="item.editPrice" class="edit-input" />
              </td>
              <td :class="{'low-stock': item.stock < 5}">{{ item.stock }}</td>
              <td><span class="loc-badge">{{ item.location }}</span></td>
              <td class="action-cell">
                <template v-if="!item.isEditing">
                  <button class="edit-sm" @click="startEdit(item)">✏️</button>
                  <button class="del-sm" @click="handleDelete(item.id, item.name)">🗑️</button>
                </template>
                <template v-else>
                  <button class="save-sm" @click="savePrice(item)">💾</button>
                  <button class="cancel-sm" @click="item.isEditing = false">❌</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const orders = ref([]); const history = ref([]); const inventory = ref([])
const searchKey = ref(''); const isInventoryCollapsed = ref(false); const submitting = ref(false)
const locShelf = ref(1); const locLayer = ref(1); const locSlot = ref(1)
const newItem = ref({ name: '', brand: '', model: '', stock: '', price: '' })
let timer = null

// 【核心修复】搜索过滤逻辑，处理字段可能为 null 的情况
const filteredInventory = computed(() => {
  if (!searchKey.value) return inventory.value
  const key = searchKey.value.toLowerCase()
  return inventory.value.filter(item => {
    const n = (item.name || '').toLowerCase()
    const b = (item.brand || '').toLowerCase()
    const m = (item.model || '').toLowerCase()
    return n.includes(key) || b.includes(key) || m.includes(key)
  })
})

// 【核心修复】分离请求，防止单一接口报错阻塞全部数据展示
const fetchAllData = async () => {
  // 1. 获取待处理订单
  axios.get('http://localhost:8080/api/orders/pending')
    .then(res => orders.value = res.data)
    .catch(e => console.error("待处理订单加载失败", e))

  // 2. 获取销售流水
  axios.get('http://localhost:8080/api/orders/history')
    .then(res => history.value = res.data)
    .catch(e => console.error("销售流水加载失败", e))

  // 3. 获取实时库存
  axios.get('http://localhost:8080/api/hardware/items')
    .then(res => {
      inventory.value = res.data.map(i => ({ ...i, isEditing: false, editPrice: i.price }))
    })
    .catch(e => console.error("库存数据加载失败", e))
}

onMounted(() => { 
  fetchAllData()
  timer = setInterval(() => { 
    if(!inventory.value.some(i => i.isEditing)) fetchAllData() 
  }, 5000) 
})
onUnmounted(() => clearInterval(timer))

const handleAddItem = async () => {
  submitting.value = true
  // 修改为“货架”，匹配 3D 组件的正则
  const locationStr = `${locShelf.value}货架${locLayer.value}层${locSlot.value}格`
  try {
    await axios.post('http://localhost:8080/api/hardware/add', { ...newItem.value, location: locationStr })
    newItem.value = { name: '', brand: '', model: '', stock: '', price: '' }
    fetchAllData()
  } finally { submitting.value = false }
}

const startEdit = (item) => { item.editPrice = item.price; item.isEditing = true }

const savePrice = async (item) => {
  try {
    await axios.put(`http://localhost:8080/api/hardware/updatePrice/${item.id}`, { price: item.editPrice })
    item.isEditing = false
    fetchAllData()
  } catch (e) { alert("改价失败，请检查后端 PUT 权限") }
}

const handleDelete = async (id, name) => {
  if (confirm(`确定要彻底删除【${name}】吗？`)) {
    try {
      await axios.delete(`http://localhost:8080/api/hardware/delete/${id}`)
      fetchAllData()
    } catch (e) { alert("删除失败，请检查后端 DELETE 权限") }
  }
}

const handleApprove = async (id) => { await axios.post(`http://localhost:8080/api/orders/approve/${id}`); fetchAllData() }
const handleCancel = async (id) => { await axios.post(`http://localhost:8080/api/orders/cancel/${id}`); fetchAllData() }
</script>

<style scoped>
/* 样式保持不变，确保表格和按钮可用 */
.admin-container { max-width: 1400px; margin: 0 auto; padding: 20px; background: #f4f7f6; min-height: 100vh; }
.dashboard { display: flex; gap: 20px; margin-bottom: 20px; }
.panel { background: white; border-radius: 10px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.full-width { width: 100%; margin-bottom: 20px; box-sizing: border-box; }
.add-form-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.add-form-inline input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 120px; }
.loc-mini input { width: 40px !important; text-align: center; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th, .data-table td { padding: 12px 10px; border-bottom: 1px solid #eee; }
.price-red { color: #e74c3c; font-weight: bold; }
.loc-badge { background: #34495e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.action-cell button { border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px; }
.edit-sm { background: #f39c12; color: white; }
.del-sm { background: #e74c3c; color: white; }
.save-sm { background: #27ae60; color: white; }
.cancel-sm { background: #bdc3c7; color: white; }
.search-input { padding: 8px 15px; border: 1px solid #ddd; border-radius: 20px; width: 250px; }
.index-col { color: #ccc; font-weight: bold; }
</style>