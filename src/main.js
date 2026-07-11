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
const renderer = new THREE.WebGLRenderer({ antialias: true});
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
const direct = new THREE.DirectionalLight(0xffffff, 0.8);
direct.position.set(10, 30, 10);
scene.add(direct);

// Floor grid (16 × 16)
const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
// NOTE
// GridHelperは光線の交差判定できない。
grid.position.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
scene.add(grid);

// Hit judgement floor (Grid)
const floorGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
// NOTE
// 平面は初期状態が縦向きなので，水平に倒す。
floorGeometry.rotateX(-Math.PI / 2);
const material = new THREE.MeshBasicMaterial({ visible: false });
const floor = new THREE.Mesh(floorGeometry, material);
floor.position.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
scene.add(floor);

// The work data
const voxels = new Map();

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onClick(event) {
	// screen point -> normalized point
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(pointer, camera);

	// judgement target
	const targets = [floor, ...voxels.values()];
	const hits = raycaster.intersectObjects(targets);
	if (hits.length === 0) return; // No hits

	const hit = hits[0]; // first hit

	// ヒットした面の法線方向に半マスずらすと，置くべきマスの内部の点になる。
	// NOTE
	// 浮動小数点誤差の問題を解決するために行う。
	const p = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.5));

	// その点がどのマスどのマス
	const x = Math.floor(p.x);
	const y = Math.floor(p.y);
	const z = Math.floor(p.z);

	if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || z < 0 || z >= GRID_SIZE) return;

	addVoxel(x, y, z);
}

function addVoxel(x, y, z) {
	const key = `${x},${y},${z}`;
	if (voxels.has(key)) return; // すでに埋まっている場合

	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshLambertMaterial({ color: 0xff6633 });
	const mesh = new THREE.Mesh(geometry, material);

	mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
	scene.add(mesh);
	voxels.set(key, mesh);
}

window.addEventListener("click", onClick);

function animate() {
	controls.update();
	renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Follow the Window size update
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	// NOTE
	// 内部に投影行列を持っている。
	renderer.setSize(window.innerWidth, window.innerHeight);
});