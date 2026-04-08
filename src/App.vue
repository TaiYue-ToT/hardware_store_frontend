<template>
  <div class="container">
    <div class="header">
      <h1>🛠️ 五金店智能搜索</h1>
      <p>无需知道专业名词，用大白话描述你的需求</p>
    </div>
    
    <div class="search-box">
      <input 
        v-model="query" 
        @keyup.enter="performSearch"
        placeholder="告诉 AI 你需要什么，例如：我要用来拧六角螺丝的工具..." 
        :disabled="loading"
      />
      <button @click="performSearch" :disabled="loading || !query">
        {{ loading ? '🤖 AI 思考中...' : '✨ 智能搜索' }}
      </button>
    </div>

    <Warehouse3D :targetName="currentItemName" v-if="results.length > 0" />
    
    <div v-else-if="searched && results.length === 0" class="no-result">
      <p>🤷‍♂️ 抱歉，仓库里暂时没有找到符合您描述的工具哦。</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import Warehouse3D from './components/Warehouse3D.vue'

// 定义页面上需要用到的变量
const currentItemName = ref('') // 记录当前要在 3D 里高亮的物品
const query = ref('')           // 用户输入的内容
const results = ref([])         // AI 返回的结果列表
const loading = ref(false)      // 是否正在加载中
const searched = ref(false)     // 是否已经搜索过

// 点击搜索按钮时执行的方法
const performSearch = async () => {
  if (!query.value.trim()) return // 如果没输入东西就不管
  
  loading.value = true
  searched.value = false
  results.value = []

  try {
    // 呼叫后端 AI 接口
    const response = await axios.post('http://localhost:8080/api/hardware/semantic-search', {
      query: query.value,
      limit: 3
    })

    if (response.data && response.data.ok) {
      results.value = response.data.detail 
    } else {
      alert('搜索出错了：' + (response.data.error || '未知错误'))
    }
  } catch (error) {
    console.error(error)
    alert('无法连接到后端服务器，请检查 Java 项目是否在运行！')
  } finally {
    loading.value = false
    searched.value = true
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 50px auto;
  padding: 20px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #333;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 10px;
}

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 40px;
}

input {
  flex: 1;
  padding: 15px 20px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 30px;
  outline: none;
  transition: border-color 0.3s;
}

input:focus {
  border-color: #42b983;
}

button {
  padding: 0 30px;
  font-size: 16px;
  font-weight: bold;
  color: white;
  background-color: #42b983;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover:not(:disabled) {
  background-color: #3aa876;
}

button:disabled {
  background-color: #a0d8bf;
  cursor: not-allowed;
}

.results {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 15px;
}

.card {
  background: white;
  padding: 20px;
  margin-top: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.card h3 {
  margin-top: 0;
  color: #e67e22;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.reason, .suggestion {
  line-height: 1.6;
  color: #555;
}

.no-result {
  text-align: center;
  color: #7f8c8d;
  font-size: 1.2rem;
  margin-top: 40px;
}

.view-btn {
  margin-top: 10px;
  background-color: #3498db;
  padding: 8px 15px;
  font-size: 14px;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.view-btn:hover { 
  background-color: #2980b9; 
}
</style>