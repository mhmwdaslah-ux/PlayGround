import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const CHARACTER_HEIGHT = 1.82

export const CHARACTER_FILES = [
  { file: 'Male_Casual', label: 'Casual' },
  { file: 'Male_LongSleeve', label: 'Long Sleeve' },
  { file: 'Male_Shirt', label: 'Shirt' },
  { file: 'Male_Suit', label: 'Suit' }
]

const KIT_SKIN = '#c98a5b'

export function makeNumberTexture(number, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 112
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 64px "Arial Narrow", Arial, sans-serif'
  ctx.lineWidth = 9
  ctx.strokeStyle = 'rgba(2, 12, 18, 0.9)'
  ctx.strokeText(String(number), 48, 58)
  ctx.fillStyle = color
  ctx.fillText(String(number), 48, 58)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.minFilter = THREE.LinearFilter
  return texture
}

export function createPlayerMarkers() {
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#f7ff9d', transparent: true, opacity: 0.96, depthWrite: false })
  ringMaterial.userData.ephemeral = true
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.055, 8, 32), ringMaterial)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.04
  ring.visible = false

  const ringBackMaterial = new THREE.MeshBasicMaterial({ color: '#02110d', transparent: true, opacity: 0.55, depthWrite: false })
  ringBackMaterial.userData.ephemeral = true
  const ringBack = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.095, 6, 32), ringBackMaterial)
  ringBack.rotation.x = -Math.PI / 2
  ringBack.position.y = 0.025
  ringBack.visible = false

  const arrowMaterial = new THREE.MeshBasicMaterial({ color: '#f7ff9d' })
  arrowMaterial.userData.ephemeral = true
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), arrowMaterial)
  arrow.rotation.x = Math.PI
  arrow.position.y = 2.5
  arrow.visible = false

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 20),
    new THREE.MeshBasicMaterial({ color: '#00110b', transparent: true, opacity: 0.38, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.y = 0.58
  shadow.position.y = 0.015
  shadow.material.userData.ephemeral = true

  return { ring, ringBack, arrow, shadow }
}

function kitColors(team, isGK, profile) {
  if (isGK) {
    return {
      shirt: '#eaff5c',
      shorts: '#12262c',
      socks: '#eaff5c',
      boots: '#061018',
      skin: profile.skin || KIT_SKIN,
      hair: profile.hair || '#241a12'
    }
  }
  return {
    shirt: team.primary,
    shorts: team.secondary,
    socks: team.accent,
    boots: '#061018',
    skin: profile.skin || KIT_SKIN,
    hair: profile.hair || '#241a12'
  }
}

function applyKit(instance, kit) {
  instance.traverse((node) => {
    if (!node.isMesh) return
    const source = Array.isArray(node.material) ? node.material : [node.material]
    const copies = source.map((material) => {
      if (!material) return material
      const copy = material.clone()
      const name = (copy.name || '').toLowerCase()
      if (name.includes('shirt')) copy.color.set(kit.shirt)
      else if (name.includes('pants')) copy.color.set(kit.shorts)
      else if (name.includes('sock')) copy.color.set(kit.socks)
      else if (name.includes('shoe')) copy.color.set(kit.boots)
      else if (name.includes('skin')) copy.color.set(kit.skin)
      else if (name.includes('hair')) copy.color.set(kit.hair)
      if (copy.emissive) {
        copy.emissive.set('#000000')
        copy.emissiveIntensity = 0
      }
      copy.metalness = 0
      copy.roughness = copy.roughness === undefined ? 0.82 : Math.min(1, copy.roughness)
      copy.userData = { ...copy.userData, ephemeral: true }
      return copy
    })
    node.material = Array.isArray(node.material) ? copies : copies[0]
  })
}

function copyAttribute(attribute) {
  if (!attribute) return null
  if (!attribute.isInterleavedBufferAttribute) return attribute.clone()
  const itemSize = attribute.itemSize
  const Ctor = attribute.array.constructor
  const array = new Ctor(attribute.count * itemSize)
  const source = attribute.data.array
  const stride = attribute.data.stride
  const offset = attribute.offset
  for (let i = 0; i < attribute.count; i += 1) {
    const base = i * stride + offset
    for (let c = 0; c < itemSize; c += 1) {
      array[i * itemSize + c] = source[base + c]
    }
  }
  return new THREE.BufferAttribute(array, itemSize, attribute.normalized)
}

function bakeCharacterMeshes(instance) {
  const meshes = []
  instance.traverse((node) => {
    if (node.isSkinnedMesh) meshes.push(node)
  })
  if (meshes.length < 2) return null
  const source = meshes[0]
  const geometries = []
  for (const mesh of meshes) {
    const src = mesh.geometry
    if (!src.attributes.position || !src.attributes.skinIndex || !src.attributes.skinWeight) return null
    const count = src.attributes.position.count
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', copyAttribute(src.attributes.position))
    if (src.attributes.normal) geometry.setAttribute('normal', copyAttribute(src.attributes.normal))
    geometry.setAttribute('skinIndex', copyAttribute(src.attributes.skinIndex))
    geometry.setAttribute('skinWeight', copyAttribute(src.attributes.skinWeight))
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    const color = new Float32Array(count * 3)
    const r = material?.color?.r ?? 1
    const g = material?.color?.g ?? 1
    const b = material?.color?.b ?? 1
    for (let i = 0; i < count; i += 1) {
      color[i * 3] = r
      color[i * 3 + 1] = g
      color[i * 3 + 2] = b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(color, 3))
    if (src.index) geometry.setIndex(copyAttribute(src.index))
    geometries.push(geometry)
  }
  const merged = mergeGeometries(geometries, false)
  if (!merged) return null
  for (const [name, attribute] of Object.entries(merged.attributes)) {
    const source = geometries[0].attributes[name]
    if (source && source.normalized !== attribute.normalized) attribute.normalized = source.normalized
  }
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.84,
    metalness: 0,
    flatShading: false
  })
  material.userData.ephemeral = true
  const baked = new THREE.SkinnedMesh(merged, material)
  baked.name = 'Character'
  baked.position.copy(source.position)
  baked.quaternion.copy(source.quaternion)
  baked.scale.copy(source.scale)
  const parent = source.parent
  for (const mesh of meshes) {
    if (mesh.parent) mesh.parent.remove(mesh)
  }
  parent.add(baked)
  baked.bind(source.skeleton, source.bindMatrix)
  return baked
}

export async function loadCharacterLibrary() {
  const library = { ready: false, assets: [], error: null }
  try {
    const loader = new GLTFLoader()
    for (const entry of CHARACTER_FILES) {
      const gltf = await loader.loadAsync(`/models/players/${entry.file}.glb`)
      const scene = gltf.scene
      scene.updateMatrixWorld(true)
      const bones = new Map()
      scene.traverse((node) => {
        if (node.isBone) bones.set(node.name, node)
      })
      const head = bones.get('Head_end') || bones.get('Head')
      const foot = bones.get('FootL') || bones.get('FootR')
      const height = head && foot
        ? head.getWorldPosition(new THREE.Vector3()).y - foot.getWorldPosition(new THREE.Vector3()).y
        : 0
      const clips = {}
      for (const clip of gltf.animations) {
        clips[clip.name.split('|').pop()] = clip
      }
      library.assets.push({
        label: entry.label,
        file: entry.file,
        scene,
        bones,
        clips,
        height,
        scale: height > 0 ? CHARACTER_HEIGHT / height : 0.0044
      })
    }
    library.ready = library.assets.length > 0
  } catch (error) {
    library.error = error
    library.ready = false
  }
  return library
}

export function createCharacterModel(library, { assetIndex = 0, team, profile, isGK = false }) {
  const assets = library?.assets || []
  if (!assets.length) return null
  const asset = assets[assetIndex % assets.length]
  const group = new THREE.Group()
  const character = new THREE.Group()
  character.scale.setScalar(asset.scale)
  group.add(character)

  const instance = cloneSkeleton(asset.scene)
  character.add(instance)
  applyKit(instance, kitColors(team, isGK, profile))
  bakeCharacterMeshes(instance)

  const bones = new Map()
  instance.traverse((node) => {
    if (node.isBone) bones.set(node.name, node)
  })

  const mixer = new THREE.AnimationMixer(instance)
  const actions = {}
  for (const key of ['Man_Idle', 'Man_Standing', 'Man_Walk', 'Man_Run', 'Man_Jump', 'Man_Punch', 'Man_Death']) {
    const clip = asset.clips[key]
    if (clip) actions[key] = mixer.clipAction(clip)
  }

  const markers = createPlayerMarkers()
  group.add(markers.ring, markers.ringBack, markers.arrow, markers.shadow)

  const numberMaterial = new THREE.MeshBasicMaterial({
    map: makeNumberTexture(profile.number, isGK ? '#f7ff9d' : team.accent),
    transparent: true,
    depthWrite: false,
    toneMapped: false
  })
  numberMaterial.userData.ephemeral = true
  const number = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.4), numberMaterial)
  number.position.set(0, 1.28, -0.17)
  number.rotation.y = Math.PI
  group.add(number)

  group.userData = {
    rig: character,
    ...markers,
    number,
    phase: Math.random() * Math.PI * 2,
    dive: 0,
    glb: {
      mixer,
      actions,
      bones,
      asset,
      body: character,
      current: null,
      state: 'idle',
      number
    }
  }
  return group
}
