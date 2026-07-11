import * as THREE from "three";
import {OrbitControls } from "three/addons/controls/OrbitControls.js";

// Limit one side size
const GRID_SIZE = 16;

// Scene (Like 3D space)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Camera
const camera = new THREE.PerspectiveCamera(
	50, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(20, 20, 20);

// Renderer
const renderer = new THREE.WebGLRenderer({ antilias: true});
// HACK
// アンチエイリアスを有効にするかどうかは要検討
renderer.setSize(window.innerWidth, window.innerHeight);
// TODO
// 配置はのちに決定する
document.body.appendChild(renderer.domElement);

// Mouse control
const controls = new OrbitControls(camera, renderer.domElement);
// 注視点を設定
controls.target.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);

// Light
// NOTE
// 環境光と並行光源
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const direct = new THREE.DirectionalLignt(0xffffff, 0.8);
direct.position.set(10, 30, 10);
scene.add(direct);

// Floor grid (16 × 16)
const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
grid.position.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
scene.add(grid);

// Test cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshLambertMaterial({ color: 0xff6633 });
const testCube = new THREE.Mesh(
	geometry,
	material,
);
scene.add(testCube);

// 非推奨
// requestAnimationFrame(animate);
function animate() {
	controls.update();
	renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Follow the Window size update
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});