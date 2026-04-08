<template>
  <div class="admin-container">
    <div class="top-nav">
      <button class="back-btn" @click="$router.push('/')">⬅️ 退出系统</button>
      <h1>👨‍💼 五金店中央控制台</h1>
    </div>

    <div class="dashboard top-dash">
      <div class="panel orders-panel">
        <h2>🔔 待处理订单 <span class="badge" v-if="orders.length > 0">{{ orders.length }}</span></h2>
        <div v-if="orders.length === 0" class="empty-state">🎉 暂无待处理</div>
        <div v-for="order in orders" :key="order.id" class="order-card">
          <h3>📦 {{ order.itemName }} - {{ order.brand }} (x{{ order.quantity }})</h3>
          <p class="price-red">￥{{ order.totalPrice }}</p>
          <div class="order-actions">
            <button class="approve-btn" @click="handleApprove(order.id)">✅ 发货</button>
            <button class="reject-btn" @click="handleCancel(order.id)">❌ 驳回</button>
          </div>
        </div>
      </div>

      <div class="panel history-panel">
        <h2>📜 最近销售流水</h2>
        <div class="table-wrapper mini-table">
          <table class="data-table">
            <thead>
              <tr><th>时间</th><th>商品</th><th>金额</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td>{{ new Date(h.createTime).toLocaleTimeString() }}</td>
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
        <input v-model="newItem.name" required placeholder="名称" />
        <input v-model="newItem.brand" required placeholder="品牌" />
        <input v-model="newItem.model" required placeholder="规格" />
        <input type="number" v-model="newItem.stock" required placeholder="数量" />
        <input type="number" step="0.01" v-model="newItem.price" required placeholder="单价" />
        <div class="loc-mini">
          <input type="number" v-model="locShelf" min="1" max="10" />架
          <input type="number" v-model="locLayer" min="1" max="10" />层
          <input type="number" v-model="locLayer" min="1" max="10" />格
        </div>
        <button type="submit" class="submit-btn" :disabled="submitting">➕ 入库</button>
      </form>
    </div>

    <div class="panel inventory-panel">
      <div class="panel-header">
        <div class="title-area">
          <h2>📊 实时库存表</h2>
          <div class="search-bar">
            <input v-model="searchKey" placeholder="🔍 搜索名称/品牌/规格..." class="search-input" />
          </div>
        </div>
        <button class="toggle-btn" @click="isInventoryCollapsed = !isInventoryCollapsed">
          {{ isInventoryCollapsed ? '展开列表 ▼' : '折叠收起 ▲' }}
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
                  <button class="del-sm" @click="handleDelete(item.id)">🗑️</button>
                </template>
                <template v-else>
                  <button class="save-sm" @click="savePrice(item)">💾</button>
                  <button class="cancel-sm" @click="item.isEditing = false">❌</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredInventory.length === 0" class="no-data">未匹配到相关货物</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const orders = ref([])
const history = ref([])
const inventory = ref([])
const searchKey = ref('') // 搜索关键词
const isInventoryCollapsed = ref(false) // 是否折叠
const submitting = ref(false)
let timer = null

const newItem = ref({ name: '', brand: '', model: '', stock: '', price: '' })
const locShelf = ref(1); const locLayer = ref(1); const locSlot = ref(1)

// ================= 搜索过滤逻辑 =================
const filteredInventory = computed(() => {
  if (!searchKey.value) return inventory.value
  const key = searchKey.value.toLowerCase()
  return inventory.value.filter(item => 
    item.name.toLowerCase().includes(key) || 
    item.brand.toLowerCase().includes(key) || 
    item.model.toLowerCase().includes(key)
  )
})

const fetchAllData = async () => {
  try {
    const [resOrders, resHistory, resInventory] = await Promise.all([
      axios.get('http://localhost:8080/api/orders/pending'),
      axios.get('http://localhost:8080/api/orders/history'),
      axios.get('http://localhost:8080/api/hardware/items')
    ])
    orders.value = resOrders.data
    history.value = resHistory.data
    // 初始化库存并注入编辑状态
    inventory.value = resInventory.data.map(item => ({
      ...item, isEditing: false, editPrice: item.price
    }))
  } catch (e) { console.error("刷新失败", e) }
}

onMounted(() => {
  fetchAllData();
  timer = setInterval(() => {
    if (!inventory.value.some(i => i.isEditing)) fetchAllData()
  }, 5000)
})
onUnmounted(() => clearInterval(timer))

// 操作方法
const handleApprove = async (id) => { await axios.post(`http://localhost:8080/api/orders/approve/${id}`); fetchAllData() }
const handleCancel = async (id) => { await axios.post(`http://localhost:8080/api/orders/cancel/${id}`); fetchAllData() }

const handleAddItem = async () => {
  submitting.value = true
  const locationStr = `${locShelf.value}架${locLayer.value}层`
  const payload = { ...newItem.value, location: locationStr }
  try {
    await axios.post('http://localhost:8080/api/hardware/add', payload)
    newItem.value = { name: '', brand: '', model: '', stock: '', price: '' }
    fetchAllData()
  } finally { submitting.value = false }
}

const startEdit = (item) => { item.editPrice = item.price; item.isEditing = true }
const savePrice = async (item) => {
  await axios.put(`http://localhost:8080/api/hardware/updatePrice/${item.id}`, { price: item.editPrice })
  item.isEditing = false; fetchAllData()
}
const handleDelete = async (id) => {
  if (confirm("确定删除吗？")) {
    await axios.delete(`http://localhost:8080/api/hardware/delete/${id}`)
    fetchAllData()
  }
}
</script>

<style scoped>
.admin-container { max-width: 1400px; margin: 0 auto; padding: 20px; background: #f4f7f6; min-height: 100vh; }
.top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { background: #34495e; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }

.dashboard { display: flex; gap: 20px; margin-bottom: 20px; }
.panel { background: white; border-radius: 10px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.full-width { width: 100%; margin-bottom: 20px; box-sizing: border-box; }

/* 标题与折叠样式 */
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.title-area { display: flex; align-items: center; gap: 20px; }
.search-input { padding: 8px 15px; border: 1px solid #ddd; border-radius: 20px; width: 250px; outline: none; }
.search-input:focus { border-color: #3498db; }
.toggle-btn { background: #ecf0f1; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; color: #7f8c8d; font-size: 13px; }

/* 流水表格小型化 */
.table-wrapper { overflow-y: auto; }
.mini-table { max-height: 250px; }
.main-table { max-height: 600px; }

/* 入库表单行内化 */
.add-form-inline { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.add-form-inline input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 120px; }
.loc-mini { font-size: 12px; display: flex; align-items: center; gap: 4px; }
.loc-mini input { width: 40px !important; }
.submit-btn { background: #2980b9; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; }

/* 通用表格样式 */
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
.data-table th { background: #f8f9fa; padding: 12px 10px; color: #666; position: sticky; top: 0; }
.data-table td { padding: 10px; border-bottom: 1px solid #eee; }
.price-red { color: #e74c3c; font-weight: bold; }
.loc-badge { background: #34495e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.index-col { color: #ccc; font-weight: bold; width: 40px; }

/* 小按钮 */
.action-cell button { border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px; }
.edit-sm { background: #f39c12; color: white; }
.del-sm { background: #e74c3c; color: white; }
.save-sm { background: #27ae60; color: white; }
.cancel-sm { background: #bdc3c7; color: white; }
.edit-input { width: 60px; padding: 2px; }

.no-data { text-align: center; padding: 20px; color: #999; }
.order-card { background: #fffcf5; border: 1px solid #ffeb3b; padding: 10px; border-radius: 6px; margin-bottom: 10px; }
</style>