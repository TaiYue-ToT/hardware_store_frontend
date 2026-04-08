<template>
  <div class="warehouse-3d" ref="sceneContainer">
    <div v-if="targetName" class="overlay-text">
      <h3>📦 目标：{{ targetName }}</h3>
      <p>📍 仓库位置：<span class="highlight">{{ targetLocation || '未分配位置' }}</span></p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  targetName: String,
  targetLocation: String // 接收具体的位置字符串
})

const sceneContainer = ref(null)
let scene, camera, renderer, targetBox

const init3D = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#eef2f5')

  camera = new THREE.PerspectiveCamera(45, sceneContainer.value.clientWidth / 300, 0.1, 1000)
  camera.position.set(0, 5, 12) // 调整视角，俯视货架
  camera.lookAt(0, 2.5, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(sceneContainer.value.clientWidth, 300)
  sceneContainer.value.appendChild(renderer.domElement)

  // 打光，让金属有立体感
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(5, 10, 8)
  scene.add(light)
  scene.add(new THREE.AmbientLight(0x888888))

  // 地面网格
  const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xdddddd)
  scene.add(gridHelper)

  // ==========================================
  // 🛠️ 建造 3D 立体金属货架
  // ==========================================
  const shelfGroup = new THREE.Group()
  const shelfMat = new THREE.MeshLambertMaterial({ color: '#2c3e50' }) // 深蓝色金属漆

  // 画 4 根竖向的支撑柱 (高 6)
  const postGeo = new THREE.BoxGeometry(0.2, 6, 0.2)
  const positions = [ [-3.1, 3, -1.1], [3.1, 3, -1.1], [-3.1, 3, 1.1], [3.1, 3, 1.1] ]
  positions.forEach(pos => {
    const post = new THREE.Mesh(postGeo, shelfMat)
    post.position.set(...pos)
    shelfGroup.add(post)
  })

  // 画 4 层横向的层板
  const boardGeo = new THREE.BoxGeometry(6.4, 0.1, 2.4)
  const boardY = [0.5, 2.0, 3.5, 5.0] // 层板的高度
  boardY.forEach(y => {
    const board = new THREE.Mesh(boardGeo, shelfMat)
    board.position.set(0, y, 0)
    shelfGroup.add(board)
  })
  scene.add(shelfGroup)

  // ==========================================
  // 🟥 目标物品的高亮红框
  // ==========================================
  const boxGeo = new THREE.BoxGeometry(1.5, 1.2, 1.5)
  const boxMat = new THREE.MeshLambertMaterial({ color: '#e74c3c', emissive: '#c0392b', transparent: true, opacity: 0.8 }) 
  targetBox = new THREE.Mesh(boxGeo, boxMat)
  targetBox.visible = false 
  scene.add(targetBox)

  animate()
}

const animate = () => {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

// 监听传进来的位置，动态移动红框到指定层板！
watch(() => props.targetLocation, (newLoc) => {
  if (props.targetName) {
    targetBox.visible = true
    
    // 简单的“定位算法”：把 location 字符串转成对应的格子位置
    // 货架分 3 层 (y=1.1, 2.6, 4.1)，每层分 3 个格子 (x=-2, 0, 2)
    let hash = 0
    if (newLoc) {
      for (let i = 0; i < newLoc.length; i++) hash += newLoc.charCodeAt(i)
    }
    
    const layerIndex = hash % 3      // 决定在哪一层
    const colIndex = (hash + 1) % 3  // 决定在哪一列

    const yPos = [1.1, 2.6, 4.1][layerIndex] // 红框放在层板上的高度
    const xPos = [-2, 0, 2][colIndex]

    targetBox.position.set(xPos, yPos, 0) // 精准落位！
  } else {
    targetBox.visible = false
  }
})

onMounted(() => {
  init3D()
})
</script>

<style scoped>
.warehouse-3d {
  width: 100%;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 1px solid #ddd;
}
.overlay-text {
  position: absolute;
  top: 15px;
  left: 15px;
  background: rgba(44, 62, 80, 0.85);
  color: #fff;
  padding: 12px 20px;
  border-radius: 10px;
  backdrop-filter: blur(5px);
}
.overlay-text h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: #f1c40f;
}
.overlay-text p {
  margin: 0;
  font-size: 14px;
}
.highlight {
  font-weight: bold;
  color: #e74c3c;
  font-size: 16px;
}
</style>