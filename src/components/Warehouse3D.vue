<template>
  <div class="warehouse-3d" ref="sceneContainer">
    <div v-if="targetName" class="overlay-text">
      📍 目标位置：{{ targetName }} 所在货架
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'

// 接收父页面（App.vue）传过来的物品名字
const props = defineProps({
  targetName: String
})

const sceneContainer = ref(null)
let scene, camera, renderer, targetBox

// 初始化 3D 场景
const init3D = () => {
  // 1. 建一个舞台
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#eef2f5')

  // 2. 架设摄像机
  camera = new THREE.PerspectiveCamera(45, sceneContainer.value.clientWidth / 300, 0.1, 1000)
  camera.position.set(0, 5, 10)
  camera.lookAt(0, 0, 0)

  // 3. 准备渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(sceneContainer.value.clientWidth, 300)
  sceneContainer.value.appendChild(renderer.domElement)

  // 4. 打上灯光
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(5, 10, 5)
  scene.add(light)
  scene.add(new THREE.AmbientLight(0x606060))

  // 5. 画一个网格代表货架
  const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
  scene.add(gridHelper)

  // 6. 画一个红色的高亮方块（代表我们要找的物品）
  const boxGeo = new THREE.BoxGeometry(1, 1, 1)
  const boxMat = new THREE.MeshLambertMaterial({ color: '#ff4757' })
  targetBox = new THREE.Mesh(boxGeo, boxMat)
  targetBox.position.set(0, 0.5, 0) 
  targetBox.visible = false // 没搜到东西前先藏起来
  scene.add(targetBox)

  // 开始循环播放动画
  animate()
}

const animate = () => {
  requestAnimationFrame(animate)
  // 如果方块显示出来了，就让它转圈圈，更显眼
  if (targetBox.visible) {
    targetBox.rotation.y += 0.03
  }
  renderer.render(scene, camera)
}

// 监听传进来的物品名字，一旦有变化，就把红色方块显现出来！
watch(() => props.targetName, (newName) => {
  if (newName) {
    targetBox.visible = true
    // 实际项目中这里可以通过后端返回的坐标移动方块，这里先演示原地旋转
    targetBox.position.set((Math.random() - 0.5) * 4, 0.5, (Math.random() - 0.5) * 4) 
  } else {
    targetBox.visible = false
  }
})

// 网页加载完毕后，立刻启动 3D 引擎
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
  box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
  border: 2px solid #ddd;
}
.overlay-text {
  position: absolute;
  top: 15px;
  left: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}
</style>