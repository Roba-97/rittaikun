import * as THREE from "three";
import { createClient } from '@supabase/supabase-js';

// ---- supabase ----
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// ---- Geometry Define ----
export const SHAPES = {
  box:          () => new THREE.BoxGeometry(1, 1, 1),
  sphere:       () => new THREE.SphereGeometry(0.5, 16, 12),
  cylinder:     () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  cone:         () => new THREE.ConeGeometry(0.5, 1, 16),
  torus:        () => new THREE.TorusGeometry(0.35, 0.15, 12, 24),
  // torus:		() => new THREE.TorusGeometry(0.35, 0.15, 12, 24).rotateX(Math.PI / 2),
  // 水平バージョン
  tetrahedron:  () => new THREE.TetrahedronGeometry(0.6),
  octahedron:   () => new THREE.OctahedronGeometry(0.55),
  dodecahedron: () => new THREE.DodecahedronGeometry(0.55),
  icosahedron:  () => new THREE.IcosahedronGeometry(0.55),
};
