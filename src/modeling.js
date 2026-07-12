import * as THREE from "three";
import {OrbitControls } from "three/addons/controls/OrbitControls.js";
import { shadow } from "three/src/nodes/lighting/ShadowNode.js";

// Limit one side size
const GRID_SIZE = 16;

// ガラス色
const GLASS_COLOR = 0x88ccff;

// ---- Geometry Define ----
const SHAPES = {
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

let currentShape = "box"; // 今選ばれている形状
let currentColor = 0xff6633;

// Scene (Like 3D space)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
scene.fog = new THREE.Fog(0xfafafa, 30, 90);

// Camera
// const aspect = window.innerWidth / window.innerHeight;
// const frustumSize = 16; // 画面に収める空間の大きさ。ズーム感の調整はここ

// const camera = new THREE.OrthographicCamera(
//   -frustumSize * aspect / 2, frustumSize * aspect / 2,  // left, right
//   frustumSize / 2, -frustumSize / 2,                     // top, bottom
//   0.1, 1000
// );
const camera = new THREE.PerspectiveCamera(
  50,                                        // 視野角(度)
  window.innerWidth / window.innerHeight,    // アスペクト比
  0.1, 1000                                  // near, far
);
camera.position.set(20, 20, 20); // 斜め45度上から

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true});
renderer.shadowMap.enabled = true;

// HACK
// アンチエイリアスを有効にするかどうかは要検討
renderer.setSize(window.innerWidth, window.innerHeight);
// TODO
// 配置はのちに決定する
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 影の輪郭を柔らかく。
document.body.appendChild(renderer.domElement);

// Mouse control
const controls = new OrbitControls(camera, renderer.domElement);
// 注視点を設定
controls.target.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);

// Light
// NOTE
// 環境光と並行光源
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
ambient.intensity = 0.75;
scene.add(ambient);
const direct = new THREE.DirectionalLight(0xffffff, 0.8);
direct.castShadow = true;
direct.position.set(30, 12, 5);
scene.add(direct);

direct.target.position.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
scene.add(direct.target);

direct.shadow.camera.left = -GRID_SIZE;
direct.shadow.camera.right = GRID_SIZE;
direct.shadow.camera.top = GRID_SIZE;
direct.shadow.camera.bottom = -GRID_SIZE;
direct.shadow.mapSize.set(2648, 2648);
direct.shadow.radius = 4;
direct.shadow.camera.updateProjectionMatrix();

// const helper = new THREE.CameraHelper(direct.shadow.camera);
// scene.add(helper);

// Floor grid (16 × 16)
const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0xcccccc, 0xdddddd);
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

// Shadow floor
const shadowFloor = new THREE.Mesh(
	new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE).rotateX(-Math.PI / 2),
	new THREE.ShadowMaterial({ opacity: 0.3 })
);
shadowFloor.position.set(GRID_SIZE / 2, 0.001, GRID_SIZE / 2);
shadowFloor.castShadow = true;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

// The work data
const voxels = new Map();

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pickObject(event) {
	// screen point -> normalized point
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(pointer, camera);

	// judgement target
	const targets = [floor, ...[...voxels.values()].map((v) => v.mesh)];
	const hits = raycaster.intersectObjects(targets);
	return hits.length > 0 ? hits[0] : null;
}

function onClick(event) {
	const hit = pickObject(event);
	if (!hit) return;
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

function onRightClick(event) {
	const hit = pickObject(event);
	if (!hit) return;
	if (hit.object === floor) return;

	const p = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(-0.5));

	const x = Math.floor(p.x);
	const y = Math.floor(p.y);
	const z = Math.floor(p.z);

	removeVoxel(x, y, z);
}

// アニメーション中のブロックを管理するリスト
const falling = [];

function addVoxel(x, y, z, shape = currentShape, color = currentColor) {
  const key = `${x},${y},${z}`;
  if (voxels.has(key)) return;

  const isGlass = (color === GLASS_COLOR);
  const material = new THREE.MeshLambertMaterial({
		color: color,
		transparent: isGlass,
		opacity: isGlass ? 0.4 : 1.0,
	 });

  const mesh = new THREE.Mesh(SHAPES[shape](), material);
  const targetY = y + 0.5;
  mesh.position.set(x + 0.5, targetY + 10, z + 0.5); // 10マス上空からスタート
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  voxels.set(key, { mesh, shape, color });

  falling.push({ mesh, targetY, velocity: 0 });
}
// function addVoxel(x, y, z, shape = currentShape, color = currentColor) {
// 	const key = `${x},${y},${z}`;
// 	if (voxels.has(key)) return; // すでに埋まっている場合

// 	const geometry = SHAPES[shape]();
// 	const material = new THREE.MeshLambertMaterial({ color });
// 	const mesh = new THREE.Mesh(geometry, material);

// 	mesh.castShadow = true;
// 	mesh.receiveShadow = true;
// 	mesh.position.set(x + 0.5, y + 0.5, z + 0.5);

// 	// mesh.userData = {
//     // shape: shape,
//     // color: color
// 	// };

// 	scene.add(mesh);
// 	voxels.set(key, { mesh, shape, color });
// }

function removeVoxel(x, y, z) {
	const key = `${x},${y},${z}`;
	const v = voxels.get(key);
	if (!v) return;

	scene.remove(v.mesh);
	v.mesh.geometry.dispose();
	v.mesh.material.dispose();
	voxels.delete(key);
}

// Distinction between drag and click.
let downX = 0, downY = 0;

window.addEventListener("pointerdown", (e) => {
	downX = e.clientX;
	downY = e.clientY;
});

window.addEventListener("pointerup", (e) => {
	if (e.target !== renderer.domElement) return null;
	// NOTE
	// ブラウザのバブリング対策
	const moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
	if (moved > 5) return;

	if (e.button === 0) onClick(e); // left button
	else if (e.button === 2) onRightClick(e); // right button
});

// 右クリックで出るブラウザ標準メニューを止める
// OrbitControlsが一応対策してはいた。
window.addEventListener("contextmenu", (e) => e.preventDefault());

function updateFalling() {
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    f.velocity += 0.02;            // 重力加速
    f.mesh.position.y -= f.velocity;
    if (f.mesh.position.y <= f.targetY) {
      f.mesh.position.y = f.targetY; // 着地でスナップ
      falling.splice(i, 1);          // リストから除去
    }
  }
}
function animate() {
	controls.update();
	updateFalling();
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

const shapeButtons = document.querySelectorAll(".shape-btn");

shapeButtons.forEach((btn) => {
	btn.addEventListener("click", (e) => {
		e.stopPropagation();
		// NOTE
		// 

		currentShape = btn.dataset.shape;

		// 全てのボタンからslected classを外し，押されたボタンだけにつける
		// NOTE
		// (selectedが付与されるのは，ユーザーがボタンを押したとき)
		shapeButtons.forEach((b) => b.classList.remove("selected"));
		btn.classList.add("selected");
	});
});


// Initial Setting
document.querySelector('[data-shape="box"]').classList.add("selected");

// Color picker process
const colorPicker = document.querySelector("#color-picker");

// NOTE
// colorPickerはinput or changeがある。
colorPicker.addEventListener("input", () => {
	// Char -> Num
	currentColor = parseInt(colorPicker.value.slice(1), 16);
});

// ---- ガラスボタンの処理 ----
const glassBtn = document.querySelector("#glass-btn");

glassBtn.addEventListener("click", () => {
  currentColor = GLASS_COLOR;
  glassBtn.classList.add("selected");
});

// カラーピッカーを触ったらガラス選択は解除
colorPicker.addEventListener("input", () => {
  glassBtn.classList.remove("selected");
});

// JSON形式で図形情報の出力
export function exportToJSON() {
  const designData = [];

  // voxelsの中身をループ処理
  voxels.forEach((v, key) => {
    // keyは "x,y,z" の文字列なので、カンマで分割して数値に戻す
	const [x, y, z] = key.split(",").map(Number);
    designData.push({
	  x: x,
	  y: y,
	  z: z,
      shape: v.shape, // メモしておいた形状名
      color: v.color  // メモしておいた色（数値）
    });
  });

  // 配列をJSON文字列に変換（これをSupabaseに送信する！）
	const jsonString = JSON.stringify(designData);
	console.log(jsonString);
  return jsonString;
}

function buildFromJSON(jsonString) {
  // 現在のキャンバスをリセット
  voxels.forEach((v, key) => {
    scene.remove(v.mesh);
    v.mesh.geometry.dispose();
    v.mesh.material.dispose();
  });
  voxels.clear();

  // 文字列からJavaScriptの配列に戻す
  const designData = JSON.parse(jsonString);

  // 配列のデータを使い再配置
  designData.forEach(item => {
    // addVoxel関数にすべてのパラメータを渡す
    addVoxel(item.x, item.y, item.z, item.shape, item.color);
  });
}
