import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Environment,
  PerspectiveCamera,
  useGLTF,
  useTexture,
} from '@react-three/drei'
import * as THREE from 'three'

useGLTF.preload('/models/logo.glb')

const MAX_TILT = 0.1 // radians, subtle — the object itself
const ENV_MAX_TILT = 0.6 // radians — HDRI swings further and opposite, to exaggerate highlight sweep
const DAMPING = 4 // higher = snappier easing

function Logo({ hovered }) {
  const { scene, cameras } = useGLTF('/models/logo.glb')
  const sourceCam = cameras[0]
  const groupRef = useRef()
  const materialsRef = useRef([])
  const [baseColorMap, normalMap] = useTexture([
    '/textures/basecolor-2k.jpg',
    '/textures/normal-2k.png',
  ])

  useEffect(() => {
    ;[baseColorMap, normalMap].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(4, 2)
    })
    baseColorMap.colorSpace = THREE.SRGBColorSpace

    materialsRef.current = []
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: baseColorMap,
          normalMap,
          metalness: 1,
          roughness: 0.3,
        })
        materialsRef.current.push(child.material)
      }
    })
  }, [scene, baseColorMap, normalMap])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return
    const targetX = hovered.current ? state.pointer.y * MAX_TILT : 0
    const targetY = hovered.current ? state.pointer.x * MAX_TILT : 0
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetX, DAMPING, delta)
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, DAMPING, delta)

    const envTargetX = hovered.current ? -state.pointer.y * ENV_MAX_TILT : 0
    const envTargetY = hovered.current ? -state.pointer.x * ENV_MAX_TILT : 0
    materialsRef.current.forEach((material) => {
      const rot = material.envMapRotation
      rot.x = THREE.MathUtils.damp(rot.x, envTargetX, DAMPING, delta)
      rot.y = THREE.MathUtils.damp(rot.y, envTargetY, DAMPING, delta)
    })
  })

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={sourceCam.position}
        quaternion={sourceCam.quaternion}
        fov={sourceCam.fov}
        near={sourceCam.near}
        far={sourceCam.far}
      />
      <Environment files="/hdri/environment-2k.exr" />
      <group ref={groupRef}>
        <primitive object={scene} />
      </group>
    </>
  )
}

function App() {
  const hovered = useRef(false)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        onPointerEnter={() => {
          hovered.current = true
        }}
        onPointerLeave={() => {
          hovered.current = false
        }}
      >
        <color attach="background" args={['#e4e4e4']} />
        <Suspense fallback={null}>
          <Logo hovered={hovered} />
        </Suspense>
      </Canvas>
      {/* lifts crushed blacks toward a soft navy floor, without touching highlights */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#151b26',
          mixBlendMode: 'lighten',
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />
      {/* recolors the lifted result toward a cool blue grade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#4a6fa0',
          mixBlendMode: 'color',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default App
