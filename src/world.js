import * as THREE from 'three'
import { PITCH } from './data.js'

const FIELD_WIDTH = 72
const FIELD_LENGTH = 109
const materialCache = new Map()

function material(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.05, ...options }))
  }
  return materialCache.get(key)
}

function makePitchTexture() {
  const px = 16
  const width = FIELD_WIDTH * px
  const height = FIELD_LENGTH * px
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const xToPx = (x) => (x + FIELD_WIDTH / 2) * px
  const zToPx = (z) => (z + FIELD_LENGTH / 2) * px

  ctx.fillStyle = '#175a40'
  ctx.fillRect(0, 0, width, height)
  const band = 7
  for (let i = 0; i < Math.ceil(FIELD_LENGTH / band); i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#1b6447' : '#185a40'
    ctx.fillRect(0, i * band * px, width, band * px)
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, 'rgba(93,255,212,0.09)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0)')
  gradient.addColorStop(1, 'rgba(0,9,22,0.16)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(236,255,248,0.86)'
  ctx.lineWidth = Math.max(3, 0.16 * px)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const line = (x1, z1, x2, z2) => {
    ctx.beginPath()
    ctx.moveTo(xToPx(x1), zToPx(z1))
    ctx.lineTo(xToPx(x2), zToPx(z2))
    ctx.stroke()
  }
  const rect = (x1, z1, x2, z2) => {
    ctx.beginPath()
    ctx.rect(xToPx(x1), zToPx(z1), (x2 - x1) * px, (z2 - z1) * px)
    ctx.stroke()
  }

  rect(-PITCH.halfWidth, -PITCH.halfLength, PITCH.halfWidth, PITCH.halfLength)
  line(-PITCH.halfWidth, 0, PITCH.halfWidth, 0)
  ctx.beginPath()
  ctx.arc(xToPx(0), zToPx(0), PITCH.centerCircle * px, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(xToPx(0), zToPx(0), 0.28 * px, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(236,255,248,0.9)'
  ctx.fill()

  for (const side of [-1, 1]) {
    const goalLine = side * PITCH.halfLength
    rect(-PITCH.penaltyWidth / 2, side < 0 ? goalLine : goalLine - PITCH.penaltyDepth, PITCH.penaltyWidth / 2, side < 0 ? goalLine + PITCH.penaltyDepth : goalLine)
    rect(-PITCH.goalAreaWidth / 2, side < 0 ? goalLine : goalLine - PITCH.goalAreaDepth, PITCH.goalAreaWidth / 2, side < 0 ? goalLine + PITCH.goalAreaDepth : goalLine)
    const spotZ = goalLine - side * 11
    ctx.beginPath()
    ctx.arc(xToPx(0), zToPx(spotZ), 0.22 * px, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(236,255,248,0.9)'
    ctx.fill()
    const arcCenter = spotZ
    const start = side > 0 ? Math.PI : 0
    const end = side > 0 ? Math.PI * 2 : Math.PI
    ctx.beginPath()
    ctx.arc(xToPx(0), zToPx(arcCenter), 9.15 * px, start, end)
    ctx.stroke()
    for (const corner of [-1, 1]) {
      ctx.beginPath()
      const a0 = side > 0
        ? (corner > 0 ? Math.PI * 0.5 : Math.PI * 1.5)
        : (corner > 0 ? Math.PI * 1.5 : Math.PI * 0.5)
      ctx.arc(xToPx(corner * PITCH.halfWidth), zToPx(goalLine), 1.15 * px, a0, a0 + (side > 0 ? Math.PI : Math.PI))
      ctx.stroke()
    }
  }

  ctx.save()
  ctx.globalAlpha = 0.13
  ctx.strokeStyle = '#d9ffe9'
  ctx.lineWidth = 1
  for (let i = 0; i < 1400; i += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 2, y + 4)
    ctx.stroke()
  }
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function makeAdTexture(text, bg, fg) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = fg
  ctx.font = '800 46px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
  ctx.strokeStyle = fg
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.35
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeScreenTexture(text, sub) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 1024, 320)
  gradient.addColorStop(0, '#071b22')
  gradient.addColorStop(1, '#0b3438')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 320)
  ctx.strokeStyle = '#41f5c5'
  ctx.lineWidth = 8
  ctx.strokeRect(12, 12, 1000, 296)
  ctx.fillStyle = '#f4fff9'
  ctx.textAlign = 'center'
  ctx.font = '900 96px Arial, sans-serif'
  ctx.fillText(text, 512, 150)
  ctx.fillStyle = '#41f5c5'
  ctx.font = '700 32px Arial, sans-serif'
  ctx.fillText(sub, 512, 230)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeBallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f7fff9'
  ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#0a2632'
  const spots = [
    [60, 80, 34], [170, 150, 30], [300, 70, 35], [430, 155, 30], [95, 295, 30],
    [225, 255, 36], [370, 300, 32], [480, 410, 28], [30, 430, 32], [220, 440, 35]
  ]
  for (const [x, y, r] of spots) {
    ctx.beginPath()
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      const px = x + Math.cos(a) * r
      const py = y + Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = '#31f2c5'
  ctx.lineWidth = 5
  ctx.strokeRect(0, 0, 512, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function addStars(scene) {
  const geometry = new THREE.BufferGeometry()
  const positions = []
  for (let i = 0; i < 420; i += 1) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.45
    const r = 220 + Math.random() * 45
    positions.push(
      Math.cos(theta) * Math.cos(phi) * r,
      45 + Math.sin(phi) * r,
      Math.sin(theta) * Math.cos(phi) * r
    )
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const materialStars = new THREE.PointsMaterial({ color: 0xc9fff0, size: 0.8, transparent: true, opacity: 0.75, sizeAttenuation: true })
  scene.add(new THREE.Points(geometry, materialStars))
}

function createSky(scene) {
  const uniforms = {
    topColor: { value: new THREE.Color('#020a14') },
    horizonColor: { value: new THREE.Color('#123b42') },
    bottomColor: { value: new THREE.Color('#061017') }
  }
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(270, 32, 20),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = normalize(world.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorld;
        void main() {
          float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = h < 0.47 ? mix(bottomColor, horizonColor, smoothstep(0.15, 0.47, h)) : mix(horizonColor, topColor, smoothstep(0.47, 0.95, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
  )
  scene.add(sky)
  addStars(scene)

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 32),
    new THREE.MeshBasicMaterial({ color: '#c9fff4', transparent: true, opacity: 0.75 })
  )
  moon.position.set(-85, 84, -150)
  moon.lookAt(0, 20, 0)
  scene.add(moon)
}

function createStands(scene) {
  const tierMaterial = material('#0a202b', { roughness: 0.88 })
  const railMaterial = new THREE.MeshStandardMaterial({ color: '#143a46', emissive: '#1de0b6', emissiveIntensity: 0.55, roughness: 0.5 })
  const tierColors = ['#0b202b', '#0d2632', '#102c38', '#0c2330']
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 6; tier += 1) {
      const width = 2.4
      const stand = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2 + tier * 0.65, 100), material(tierColors[tier % tierColors.length]))
      stand.position.set(side * (41 + tier * 2.1), 1.0 + tier * 0.95, 0)
      scene.add(stand)
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 98), railMaterial)
      rail.position.set(side * (39.9 + tier * 2.1), 1.65 + tier * 0.95, 0)
      scene.add(rail)
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.55, 102), material('#061820', { metalness: 0.25 }))
    roof.position.set(side * 47, 15.2, 0)
    roof.rotation.z = side * 0.07
    scene.add(roof)
    for (let z = -44; z <= 44; z += 22) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 15, 8), material('#193644'))
      mast.position.set(side * 49.5, 9, z)
      scene.add(mast)
    }
  }

  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 6; tier += 1) {
      const length = 64 + tier * 3.4
      const stand = new THREE.Mesh(new THREE.BoxGeometry(length, 1.2 + tier * 0.65, 3), material(tierColors[(tier + 2) % tierColors.length]))
      stand.position.set(0, 1.0 + tier * 0.95, side * (60 + tier * 2.0))
      scene.add(stand)
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length - 2, 0.12, 0.12), railMaterial)
      rail.position.set(0, 1.65 + tier * 0.95, side * (58.9 + tier * 2.0))
      scene.add(rail)
    }
  }

  const boardTexts = [
    ['NOVA ELEVEN', '#082b31', '#47f5c6'],
    ['AURORA CUP', '#1b0d2a', '#ffd166'],
    ['VOLT ENERGY', '#2c0b14', '#ff7b66'],
    ['PULSE KIT', '#0b1a30', '#8de7ff']
  ]
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i += 1) {
      const [text, bg, fg] = boardTexts[i % boardTexts.length]
      const texture = makeAdTexture(text, bg, fg)
      const boardMaterial = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.12, roughness: 0.6 })
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.25, 7.2), boardMaterial)
      board.position.set(side * 37.2, 1.0, -45 + i * 10)
      scene.add(board)
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.5, 7.6),
        new THREE.MeshBasicMaterial({ color: fg, transparent: true, opacity: 0.22 })
      )
      glow.position.set(side * 37.35, 1.0, -45 + i * 10)
      scene.add(glow)
    }
  }
  for (const side of [-1, 1]) {
    const texture = makeAdTexture(side > 0 ? 'NOVA ELEVEN' : 'PLAY THE FUTURE', '#071b22', side > 0 ? '#47f5c6' : '#ffd166')
    const boardMaterial = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.12 })
    const board = new THREE.Mesh(new THREE.BoxGeometry(28, 1.25, 0.28), boardMaterial)
    board.position.set(0, 1.0, side * 55.5)
    scene.add(board)
  }

  const screenTextureA = makeScreenTexture('NOVA ELEVEN', 'AURORA CUP  •  LIVE')
  const screenTextureB = makeScreenTexture('PLAY BOLD', 'NOVA ELEVEN')
  for (const side of [-1, 1]) {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 6.8),
      new THREE.MeshBasicMaterial({ map: side > 0 ? screenTextureA : screenTextureB, toneMapped: false })
    )
    screen.position.set(0, 18, side * 78)
    screen.rotation.y = side > 0 ? Math.PI : 0
    scene.add(screen)
  }
  return tierMaterial
}

function createCrowd(scene) {
  const count = 1500
  const geometry = new THREE.BoxGeometry(0.34, 0.42, 0.34)
  const crowdMaterial = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 })
  const crowd = new THREE.InstancedMesh(geometry, crowdMaterial, count)
  const matrix = new THREE.Matrix4()
  const color = new THREE.Color()
  const palette = ['#39e8c1', '#ff6b57', '#ffd166', '#e9fff9', '#7098a8', '#1b4d5c', '#183a48', '#fe9f4a']
  let index = 0
  const random = () => Math.random()
  for (let side = 0; side < 4; side += 1) {
    for (let i = 0; i < Math.floor(count / 4); i += 1) {
      const tier = Math.floor(random() * 5)
      let x
      let z
      if (side < 2) {
        const s = side === 0 ? 1 : -1
        x = s * (42.4 + tier * 2.1 + random() * 0.7)
        z = -48 + random() * 96
      } else {
        const s = side === 2 ? 1 : -1
        x = -33 + random() * 66
        z = s * (61.4 + tier * 2.0 + random() * 0.7)
      }
      const y = 1.55 + tier * 0.95 + random() * 0.18
      matrix.makeTranslation(x, y, z)
      crowd.setMatrixAt(index, matrix)
      color.set(palette[Math.floor(random() * palette.length)])
      color.offsetHSL(0, 0, (random() - 0.5) * 0.1)
      crowd.setColorAt(index, color)
      index += 1
    }
  }
  crowd.instanceMatrix.needsUpdate = true
  if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true
  scene.add(crowd)
  return crowd
}

function createFloodlights(scene) {
  const lightMaterial = new THREE.MeshStandardMaterial({ color: '#eafffb', emissive: '#c8fff4', emissiveIntensity: 2.6, roughness: 0.2 })
  const towerMaterial = material('#1b3e4a', { metalness: 0.4, roughness: 0.45 })
  for (const x of [-46, 46]) {
    for (const z of [-58, 58]) {
      const group = new THREE.Group()
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.8, 30, 8), towerMaterial)
      mast.position.y = 15
      group.add(mast)
      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.6, 0.5), lightMaterial)
      lightBar.position.y = 30
      group.add(lightBar)
      for (let i = -3; i <= 3; i += 1) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.2), lightMaterial)
        lamp.position.set(i * 1.15, 30, 0.36)
        group.add(lamp)
      }
      group.position.set(x, 0, z)
      group.lookAt(0, 0, 0)
      scene.add(group)
    }
  }
}

function createGoal(scene, side) {
  const group = new THREE.Group()
  const goalLine = side * PITCH.halfLength
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#ecfff9', emissive: '#b6fff0', emissiveIntensity: 0.18, roughness: 0.35, metalness: 0.15 })
  const postGeometry = new THREE.CylinderGeometry(0.09, 0.09, PITCH.goalHeight, 10)
  for (const x of [-PITCH.goalWidth / 2, PITCH.goalWidth / 2]) {
    const post = new THREE.Mesh(postGeometry, postMaterial)
    post.position.set(x, PITCH.goalHeight / 2, goalLine)
    group.add(post)
  }
  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, PITCH.goalWidth, 10), postMaterial)
  crossbar.rotation.z = Math.PI / 2
  crossbar.position.set(0, PITCH.goalHeight, goalLine)
  group.add(crossbar)

  const netMaterial = new THREE.LineBasicMaterial({ color: '#b7ded6', transparent: true, opacity: 0.3 })
  const positions = []
  const depth = 2.2
  const backZ = goalLine + side * depth
  for (let i = 0; i <= 12; i += 1) {
    const x = -PITCH.goalWidth / 2 + (PITCH.goalWidth / 12) * i
    positions.push(x, 0, goalLine, x, PITCH.goalHeight, backZ)
    positions.push(x, 0, backZ, x, PITCH.goalHeight, backZ)
  }
  for (let i = 0; i <= 5; i += 1) {
    const y = (PITCH.goalHeight / 5) * i
    positions.push(-PITCH.goalWidth / 2, y, goalLine, PITCH.goalWidth / 2, y, goalLine)
    positions.push(-PITCH.goalWidth / 2, y, backZ, PITCH.goalWidth / 2, y, backZ)
  }
  for (const x of [-PITCH.goalWidth / 2, PITCH.goalWidth / 2]) {
    for (let i = 0; i <= 4; i += 1) {
      const y = (PITCH.goalHeight / 4) * i
      positions.push(x, y, goalLine, x, y, backZ)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  group.add(new THREE.LineSegments(geometry, netMaterial))
  scene.add(group)
  return group
}

function createBall(scene) {
  const texture = makeBallTexture()
  const ballMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.42, metalness: 0.03, emissive: '#102a2a', emissiveIntensity: 0.16 })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), ballMaterial)
  mesh.position.set(0, 0.34, 0)
  scene.add(mesh)
  const trailMaterial = new THREE.MeshBasicMaterial({ color: '#54ffd4', transparent: true, opacity: 0.13, depthWrite: false })
  const trail = []
  for (let i = 0; i < 7; i += 1) {
    const ghost = new THREE.Mesh(new THREE.SphereGeometry(0.28 - i * 0.018, 12, 8), trailMaterial.clone())
    ghost.material.opacity = 0.14 - i * 0.017
    ghost.visible = false
    scene.add(ghost)
    trail.push(ghost)
  }
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 20),
    new THREE.MeshBasicMaterial({ color: '#00110a', transparent: true, opacity: 0.45, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.012
  scene.add(shadow)
  return { mesh, trail, shadow, material: ballMaterial }
}

export function createPlayerModel(team, profile, isGK = false) {
  const group = new THREE.Group()
  const rig = new THREE.Group()
  group.add(rig)

  const shirt = isGK ? '#f4ff69' : team.primary
  const shorts = isGK ? '#172a2e' : team.secondary
  const socks = isGK ? '#f4ff69' : team.primary
  const sleeve = isGK ? '#c9ff54' : team.accent
  const skin = material(profile.skin, { roughness: 0.82 })
  const hair = material(profile.hair, { roughness: 0.95 })
  const shirtMaterial = material(shirt, { roughness: 0.8 })
  const shortsMaterial = material(shorts, { roughness: 0.82 })
  const sockMaterial = material(socks, { roughness: 0.85 })
  const sleeveMaterial = material(sleeve, { roughness: 0.8 })
  const bootMaterial = material('#07121a', { roughness: 0.5 })

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 20),
    new THREE.MeshBasicMaterial({ color: '#00110b', transparent: true, opacity: 0.34, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.y = 0.58
  shadow.position.y = 0.015
  group.add(shadow)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.56, 5, 10), shirtMaterial)
  torso.position.y = 1.32
  torso.scale.x = 1.12
  rig.add(torso)

  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.52, 0.61), sleeveMaterial)
  chestStripe.position.set(0, 1.34, 0.015)
  chestStripe.scale.z = 1.01
  rig.add(chestStripe)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.235, 16, 12), skin)
  head.position.y = 1.95
  head.scale.set(1, 1.08, 0.95)
  rig.add(head)

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.242, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), hair)
  hairCap.position.y = 2.02
  hairCap.scale.set(1, 0.95, 0.98)
  rig.add(hairCap)

  const leftLeg = new THREE.Group()
  const rightLeg = new THREE.Group()
  leftLeg.position.set(-0.135, 0.92, 0)
  rightLeg.position.set(0.135, 0.92, 0)
  rig.add(leftLeg, rightLeg)

  for (const [leg, side] of [[leftLeg, -1], [rightLeg, 1]]) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.43, 8), shortsMaterial)
    thigh.position.y = -0.18
    leg.add(thigh)
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.064, 0.42, 8), sockMaterial)
    calf.position.y = -0.58
    leg.add(calf)
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.32), bootMaterial)
    boot.position.set(0, -0.83, 0.07)
    leg.add(boot)
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), skin)
    knee.position.y = -0.39
    leg.add(knee)
    leg.userData.side = side
  }

  const leftArm = new THREE.Group()
  const rightArm = new THREE.Group()
  leftArm.position.set(-0.39, 1.6, 0)
  rightArm.position.set(0.39, 1.6, 0)
  rig.add(leftArm, rightArm)
  for (const arm of [leftArm, rightArm]) {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.37, 8), sleeveMaterial)
    upper.position.y = -0.17
    arm.add(upper)
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.052, 0.35, 8), skin)
    lower.position.y = -0.48
    arm.add(lower)
    if (isGK) {
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), material('#f7fff9', { roughness: 0.7 }))
      glove.position.y = -0.7
      arm.add(glove)
    }
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.045, 8, 28),
    new THREE.MeshBasicMaterial({ color: '#52ffce', transparent: true, opacity: 0.95, depthWrite: false })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.035
  ring.visible = false
  group.add(ring)

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.19, 0.4, 4),
    new THREE.MeshBasicMaterial({ color: '#52ffce' })
  )
  arrow.rotation.x = Math.PI
  arrow.position.y = 2.75
  arrow.visible = false
  group.add(arrow)

  group.userData = { rig, leftLeg, rightLeg, leftArm, rightArm, ring, arrow, shadow, phase: Math.random() * Math.PI * 2, dive: 0 }
  return group
}

export function createWorld(scene, renderer) {
  scene.background = new THREE.Color('#041018')
  scene.fog = new THREE.Fog('#07141d', 120, 245)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.07
  renderer.outputColorSpace = THREE.SRGBColorSpace

  createSky(scene)
  createStands(scene)
  const crowd = createCrowd(scene)
  createFloodlights(scene)

  const arena = new THREE.Mesh(
    new THREE.PlaneGeometry(152, 205),
    new THREE.MeshStandardMaterial({ color: '#071b23', roughness: 0.84 })
  )
  arena.rotation.x = -Math.PI / 2
  arena.position.y = -0.04
  scene.add(arena)

  const runOff = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 118),
    new THREE.MeshStandardMaterial({ color: '#0a2d2c', roughness: 0.9 })
  )
  runOff.rotation.x = -Math.PI / 2
  runOff.position.y = -0.02
  scene.add(runOff)

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD_WIDTH, FIELD_LENGTH),
    new THREE.MeshStandardMaterial({ map: makePitchTexture(), roughness: 0.94, metalness: 0 })
  )
  pitch.rotation.x = -Math.PI / 2
  pitch.position.y = 0
  scene.add(pitch)

  const goalA = createGoal(scene, 1)
  const goalB = createGoal(scene, -1)
  const ball = createBall(scene)

  const hemi = new THREE.HemisphereLight('#a3e9ff', '#0b241a', 1.7)
  scene.add(hemi)
  const key = new THREE.DirectionalLight('#e4fff7', 3.2)
  key.position.set(38, 65, 20)
  scene.add(key)
  const fill = new THREE.DirectionalLight('#31f2c5', 1.4)
  fill.position.set(-40, 30, -35)
  scene.add(fill)
  const rim = new THREE.DirectionalLight('#ff8a6b', 0.9)
  rim.position.set(-12, 24, 60)
  scene.add(rim)

  const menuFocus = new THREE.Vector3(0, 1.5, 0)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300)
  camera.position.set(29, 19, -33)

  return {
    scene,
    camera,
    crowd,
    goalA,
    goalB,
    ball,
    menuFocus,
    update(time) {
      crowd.position.y = Math.sin(time * 0.9) * 0.012
    },
    setMenuCamera(aspect) {
      camera.aspect = aspect
      const angle = Math.sin(performance.now() * 0.00006) * 0.24
      camera.position.set(Math.sin(angle) * 42 + 22, 25 + Math.sin(performance.now() * 0.0001) * 1.2, -55)
      camera.lookAt(0, 2.2, 6)
      camera.updateProjectionMatrix()
    },
    disposePlayers(parent) {
      while (parent.children.length) {
        const child = parent.children.pop()
        child.traverse?.((node) => {
          if (node.geometry) node.geometry.dispose()
        })
      }
    }
  }
}

export function createContactRing(color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.16, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  )
  ring.rotation.x = -Math.PI / 2
  return ring
}
