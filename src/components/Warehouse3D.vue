<template>
  <div class="warehouse-3d" ref="sceneContainer">
    <div v-if="targetName" class="overlay-text">
      <h3>📦 目标：{{ targetName }}</h3>
      <p>📍 仓库位置：<span class="highlight">{{ targetLocation || '未分配' }}</span></p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  targetName: String,
  targetLocation: String,
  refreshKey: Number // 👈 专门用来解决“点击同一个物品没反应”的触发器
})

const sceneContainer = ref(null)
let scene, camera, renderer, targetBox

// 镜头平滑移动的变量
let targetCameraPos = new THREE.Vector3(0, 15, 30)
let currentLookAt = new THREE.Vector3(0, 0, 0)
let targetLookAt = new THREE.Vector3(0, 0, 0)

const init3D = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#1a1a2e') // 换成酷炫的暗黑工业风背景

  camera = new THREE.PerspectiveCamera(45, sceneContainer.value.clientWidth / 300, 0.1, 1000)
  camera.position.copy(targetCameraPos)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(sceneContainer.value.clientWidth, 300)
  sceneContainer.value.appendChild(renderer.domElement)

  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(10, 20, 10)
  scene.add(light)
  scene.add(new THREE.AmbientLight(0x555555))

  // 地面网格
  scene.add(new THREE.GridHelper(50, 50, 0x444444, 0x222222))

  // ==========================================
  // 🛠️ 建造 10 个大型货架 (双排，每排5个)
  // 每个货架 10 层，每层 10 格
  // ==========================================
  const shelfMat = new THREE.MeshLambertMaterial({ color: '#576574' })
  const shelfNames = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  
  shelfNames.forEach((name, index) => {
    const isFrontRow = index < 5
    const shelfZ = isFrontRow ? -8 : 8 // 前后排
    const shelfX = (index % 5 - 2) * 9 // 每个货架间距 9

    const shelfGroup = new THREE.Group()
    
    // 4根柱子
    const postGeo = new THREE.BoxGeometry(0.2, 10, 1)
    const positions = [[-4, 5, -0.5], [4, 5, -0.5], [-4, 5, 0.5], [4, 5, 0.5]]
    positions.forEach(pos => {
      const post = new THREE.Mesh(postGeo, shelfMat)
      post.position.set(...pos)
      shelfGroup.add(post)
    })

    // 10层层板 (Y坐标 0.5 到 9.5)
    for(let i=0; i<10; i++) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.1, 1), shelfMat)
      board.position.set(0, i + 0.5, 0)
      shelfGroup.add(board)
    }

    shelfGroup.position.set(shelfX, 0, shelfZ)
    scene.add(shelfGroup)
  })

  // ==========================================
  // 🟥 目标物品高亮框
  // ==========================================
  const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  const boxMat = new THREE.MeshLambertMaterial({ color: '#e74c3c', emissive: '#ff0000', transparent: true, opacity: 0.9 }) 
  targetBox = new THREE.Mesh(boxGeo, boxMat)
  targetBox.visible = false 
  scene.add(targetBox)

  animate()
}

const animate = () => {
  requestAnimationFrame(animate)
  // 让镜头和视角平滑飞向目标
  camera.position.lerp(targetCameraPos, 0.05)
  currentLookAt.lerp(targetLookAt, 0.05)
  camera.lookAt(currentLookAt)
  renderer.render(scene, camera)
}

// 监听刷新 Key（解析 "X货架Y层Z格"）
watch(() => props.refreshKey, () => {
  if (!props.targetLocation) return
  
  targetBox.visible = true
  
  let shelfIndex = 0, layerStr = 1, slotStr = 1

  // 👇 使用正则表达式，精准扣出字符串里的三个数字
  const regex = /(\d+)\s*货架\s*(\d+)\s*层\s*(\d+)\s*格/
  const match = props.targetLocation.match(regex)

  if (match) {
    // match[1] 是货架号(1-10)，减 1 变成索引(0-9)
    shelfIndex = Math.min(Math.max(parseInt(match[1]) - 1, 0), 9) 
    layerStr = Math.min(Math.max(parseInt(match[2]), 1), 10)
    slotStr = Math.min(Math.max(parseInt(match[3]), 1), 10)
  }

  // 计算具体 3D 坐标 (10个货架，双排布置)
  const isFrontRow = shelfIndex < 5
  const shelfZ = isFrontRow ? -8 : 8
  const shelfX = (shelfIndex % 5 - 2) * 9 // 每排5个，计算X轴间距
  
  const boxY = (layerStr - 1) * 1.0 + 0.9 // 第几层的高度
  const localX = (slotStr - 1) * 0.8 - 3.6 // 第几格的横向位置
  const boxX = shelfX + localX

  // 设置红框位置
  targetBox.position.set(boxX, boxY, shelfZ)

  // 导演，推镜头！让镜头飞到对应货架正前方
  targetCameraPos.set(boxX, boxY + 2, shelfZ + (isFrontRow ? 8 : -8))
  targetLookAt.set(boxX, boxY, shelfZ)
})


onMounted(() => init3D())
</script>

<style scoped>
.warehouse-3d { width: 100%; height: 300px; border-radius: 12px; overflow: hidden; position: relative; border: 2px solid #2c3e50; }
.overlay-text { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0, 0.7); color: #fff; padding: 12px 20px; border-radius: 10px; border-left: 4px solid #e74c3c;}
.overlay-text h3 { margin: 0 0 5px 0; color: #f1c40f; }
.overlay-text p { margin: 0; }
.highlight { font-weight: bold; color: #e74c3c; font-size: 18px; }
</style>