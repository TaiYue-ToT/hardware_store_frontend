<template>
  <div class="admin-container">
    <div class="top-nav">
      <button class="back-btn" @click="$router.push('/')">⬅️ 退出系统</button>
      <h1>👨‍💼 五金店中央控制台</h1>
    </div>

    <div class="dashboard top-dash">
      <div class="panel orders-panel">
        <h2>🔔 待确认订单 <span class="badge" v-if="orders.length > 0">{{ orders.length }}</span></h2>
        <div v-if="orders.length === 0" class="empty-state">🎉 暂无待处理</div>
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
            <thead>
              <tr>
                <th>销售时间</th>
                <th>商品</th>
                <th>数量</th>
                <th>总金额</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td class="time-col">{{ new Date(h.createTime).toLocaleString() }}</td>
                <td>{{ h.itemName }}</td>
                <td>{{ h.quantity }}</td>
                <td class="price-red">￥{{ h.totalPrice }}</td>
                <td>{{ h.status === 1 ? '✅' : '❌' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel add-panel full-width">
      <h2>📦 货物入库</h2>
      <form @submit.prevent="handleAddItem" class="add-form-stepper">
        <div class="form-row">
          <input v-model="newItem.name" required placeholder="商品名称" />
          <input v-model="newItem.brand" required placeholder="品牌" />
          <input v-model="newItem.model" required placeholder="规格" />
          <input type="number" step="0.01" v-model="newItem.price" required placeholder="单价 ￥" />
          <input type="number" v-model="newItem.stock" required placeholder="入库数量" />
        </div>

        <div v-if="newItem.name && newItem.brand && newItem.price" class="match-status" :class="isMatch ? 'match-ok' : 'match-new'">
          <p v-if="isMatch">✅ 检测到库内已有相同商品，确认后将自动合并库存。</p>
          <div v-else class="location-input-group">
            <p>🆕 新商品入库，请指定存放位置：</p>
            <div class="loc-mini">
              <input type="number" v-model="locShelf" placeholder="1-10" required />架
              <input type="number" v-model="locLayer" placeholder="1-10" required />层
              <input type="number" v-model="locSlot" placeholder="1-10" required />格
            </div>
          </div>
        </div>
        
        <button type="submit" class="submit-btn" :disabled="submitting">确认提交入库</button>
      </form>
    </div>

    <div class="panel inventory-panel">
      <div class="panel-header">
        <div class="title-area">
          <h2>📊 实时库存表</h2>
          <input v-model="searchKey" placeholder="🔍 搜索名称/品牌/规格..." class="search-input" />
        </div>
        <button class="toggle-btn" @click="isInventoryCollapsed = !isInventoryCollapsed">
          {{ isInventoryCollapsed ? '展开列表 ▼' : '收起 ▲' }}
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

// 核心匹配逻辑：判断输入的内容是否在现有库中
const isMatch = computed(() => {
  if (!newItem.value.name || !newItem.value.brand || !newItem.value.price) return false;
  return inventory.value.some(item => 
    item.name === newItem.value.name.trim() && 
    item.brand === newItem.value.brand.trim() && 
    Number(item.price) === Number(newItem.value.price)
  )
})

const filteredInventory = computed(() => {
  if (!searchKey.value) return inventory.value
  const key = searchKey.value.toLowerCase()
  return inventory.value.filter(i => {
    const n = (i.name || '').toLowerCase();
    const b = (i.brand || '').toLowerCase();
    const m = (i.model || '').toLowerCase();
    return (n + b + m).includes(key)
  })
})

const fetchAllData = async () => {
  try {
    const [resO, resH, resI] = await Promise.all([
      axios.get('http://localhost:8080/api/orders/pending'),
      axios.get('http://localhost:8080/api/orders/history'),
      axios.get('http://localhost:8080/api/hardware/items')
    ])
    orders.value = resO.data; history.value = resH.data
    inventory.value = resI.data.map(i => ({ ...i, isEditing: false, editPrice: i.price }))
  } catch (e) { console.error("API 数据加载失败", e) }
}

onMounted(() => { 
  fetchAllData()
  timer = setInterval(() => { if(!inventory.value.some(i=>i.isEditing)) fetchAllData() }, 5000) 
})
onUnmounted(() => clearInterval(timer))

const handleAddItem = async () => {
  submitting.value = true
  
  // 准备发送的数据
  let payload = { 
    name: newItem.value.name.trim(),
    brand: newItem.value.brand.trim(),
    model: newItem.value.model.trim(),
    price: Number(newItem.value.price),
    stock: Number(newItem.value.stock)
  }

  // 【核心修复点】只有不是匹配项（即新货）时，才拼接并添加 location 字段
  // 如果是匹配项，payload 里根本就不带 location 属性，后端就不会更新它
  if (!isMatch.value) {
    payload.location = `${locShelf.value}货架${locLayer.value}层${locSlot.value}格`
  }

  try {
    await axios.post('http://localhost:8080/api/hardware/add', payload)
    alert(isMatch.value ? "✅ 库存合并成功！" : "🎉 新货入库成功！")
    
    // 重置表单
    newItem.value = { name: '', brand: '', model: '', stock: '', price: '' }
    fetchAllData()
  } catch (e) {
    alert("入库失败")
  } finally {
    submitting.value = false
  }
}

const startEdit = (item) => { item.editPrice = item.price; item.isEditing = true }
const savePrice = async (item) => {
  try {
    await axios.put(`http://localhost:8080/api/hardware/updatePrice/${item.id}`, { price: item.editPrice })
    item.isEditing = false; fetchAllData()
  } catch (e) { alert("改价失败") }
}
const handleDelete = async (id, name) => {
  if (confirm(`确定要彻底删除【${name}】吗？`)) {
    try {
      await axios.delete(`http://localhost:8080/api/hardware/delete/${id}`)
      fetchAllData()
    } catch (e) { alert("删除失败") }
  }
}
const handleApprove = async (id) => { await axios.post(`http://localhost:8080/api/orders/approve/${id}`); fetchAllData() }
const handleCancel = async (id) => { await axios.post(`http://localhost:8080/api/orders/cancel/${id}`); fetchAllData() }
</script>

<style scoped>
.admin-container { max-width: 1400px; margin: 0 auto; padding: 20px; background: #f4f7f6; min-height: 100vh; }
.dashboard { display: flex; gap: 20px; margin-bottom: 20px; }
.panel { background: white; border-radius: 10px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.full-width { width: 100%; margin-bottom: 20px; box-sizing: border-box; }
.add-form-stepper .form-row { display: flex; gap: 10px; margin-bottom: 10px; }
.add-form-stepper input { padding: 10px; border: 1px solid #ddd; border-radius: 4px; flex: 1; }
.match-status { padding: 15px; border-radius: 8px; margin: 10px 0; font-size: 14px; }
.match-ok { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.match-new { background: #fff3e0; color: #ef6c00; border: 1px solid #ffe0b2; }
.loc-mini { display: flex; align-items: center; gap: 5px; margin-top: 10px; }
.loc-mini input { width: 60px !important; flex: none; text-align: center; }
.submit-btn { width: 100%; background: #2980b9; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th, .data-table td { padding: 12px 10px; border-bottom: 1px solid #eee; text-align: left; }
.time-col { font-size: 12px; color: #888; white-space: nowrap; }
.price-red { color: #e74c3c; font-weight: bold; }
.loc-badge { background: #34495e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.action-cell button { border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px; }
.edit-sm { background: #f39c12; color: white; }
.del-sm { background: #e74c3c; color: white; }
.save-sm { background: #27ae60; color: white; }
.cancel-sm { background: #bdc3c7; color: white; }
.search-input { padding: 8px 15px; border: 1px solid #ddd; border-radius: 20px; width: 250px; outline: none; }
</style>