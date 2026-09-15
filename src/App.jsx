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
const FLIP_DAMPING = 2.2 // slower/weightier — this is a deliberate click gesture, not a hover twitch

function Logo({ hovered, flipTarget }) {
  const { scene, cameras } = useGLTF('/models/logo.glb')
  const sourceCam = cameras[0]
  const groupRef = useRef()
  const materialsRef = useRef([])
  const hoverX = useRef(0)
  const hoverY = useRef(0)
  const flipAngle = useRef(0)
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
    hoverX.current = THREE.MathUtils.damp(hoverX.current, targetX, DAMPING, delta)
    hoverY.current = THREE.MathUtils.damp(hoverY.current, targetY, DAMPING, delta)
    flipAngle.current = THREE.MathUtils.damp(flipAngle.current, flipTarget.current, FLIP_DAMPING, delta)

    group.rotation.x = hoverX.current + flipAngle.current
    group.rotation.y = hoverY.current

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
  const flipTarget = useRef(0)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        onPointerEnter={() => {
          hovered.current = true
        }}
        onPointerLeave={() => {
          hovered.current = false
        }}
        onClick={() => {
          flipTarget.current += Math.PI
        }}
      >
        <color attach="background" args={['#e4e4e4']} />
        <Suspense fallback={null}>
          <Logo hovered={hovered} flipTarget={flipTarget} />
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
