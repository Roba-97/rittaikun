import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { supabase } from './const.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const workId = urlParams.get('id');

  if (!workId) {
    alert('作品IDが指定されていません。ギャラリーに戻ります。');
    window.location.href = '../pages/gallery.html';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('objects')
      .select('*')
      .eq('id', workId)
      .single(); // .single()で配列ではなく1つのオブジェクトとして取得

    if (error) throw error;

    if (data) {
      const container = document.getElementById('canvas-container')
      container.innerHTML = `
        <h1 id="work-title" class="text-center my-3">${data.title}
          <span class="fs-4 text-muted">By ${data.author_name || '匿名さん'}</span>
        </h1>
        <div id="preview-${data.id}" class="w-100 flex-grow-1" style="max-height: 50%;"></div>
      `;

      const titleHeight = document.getElementById('work-title').offsetHeight;
      const buttonsHeight = document.getElementById('buttons').offsetHeight;

      const preview = document.getElementById(`preview-${data.id}`);
      preview.style.maxHeight = `calc(95% - ${titleHeight}px - ${buttonsHeight}px)`;

      if (data.model_data) {
        setTimeout(() => {
          create3DPreview(`preview-${data.id}`, data.model_data);
        }, 50);
      }

      const createLink = document.getElementById('create-link');
      createLink.href = `./create.html?id=${data.id}`
    }
  } catch (error) {
    console.error('データの取得に失敗しました:', error);
  }
});

// 3Dプレビュー生成
function create3DPreview(containerId, modelData) {
  const GRID_SIZE = 16;
  const SHAPES = {
    box: () => new THREE.BoxGeometry(1, 1, 1),
    sphere: () => new THREE.SphereGeometry(0.5, 16, 12),
    cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    cone: () => new THREE.ConeGeometry(0.5, 1, 16),
    torus: () => new THREE.TorusGeometry(0.35, 0.15, 12, 24),
    // torus:		() => new THREE.TorusGeometry(0.35, 0.15, 12, 24).rotateX(Math.PI / 2),
    // 水平バージョン
    tetrahedron: () => new THREE.TetrahedronGeometry(0.6),
    octahedron: () => new THREE.OctahedronGeometry(0.55),
    dodecahedron: () => new THREE.DodecahedronGeometry(0.55),
    icosahedron: () => new THREE.IcosahedronGeometry(0.55),
  };

  const container = document.getElementById(containerId);
  if (!container) return;

  // 各カード専用のシーン、カメラ、レンダラーを作成（グローバルのものは使わない）
  const scene = new THREE.Scene();

  // 背景は透過させて、Bootstrap側の色（CSS）を活かす
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // カメラの設定（モデル全体が見えるように少し引き気味に配置）
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(20, 20, 20);

  // ライトの設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);

  // Supabaseの jsonb 型は自動で配列として解釈されるが念のためチェック
  const designData = typeof modelData === 'string' ? JSON.parse(modelData) : modelData;

  // JSONデータから3D空間にブロックを配置
  if (designData && Array.isArray(designData)) {
    designData.forEach(item => {
      const geometry = SHAPES[item.shape]();
      const material = new THREE.MeshLambertMaterial({ color: item.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(item.x + 0.5, item.y + 0.5, item.z + 0.5);
      scene.add(mesh);
    });
  }

  const animate = () => {
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  const resizeObserver = new ResizeObserver(() => {
    // コンテナの最新の幅と高さを取得
    const container = document.getElementById(containerId);
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    // 画面から見えなくなって潰れている時（0px）はエラーを防ぐため処理をスキップ
    if (newWidth === 0 || newHeight === 0) return;

    // カメラのアスペクト比（縦横比）を新しいサイズに合わせて更新
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    // レンダラー（キャンバス）のサイズを新しい幅と高さに更新
    renderer.setSize(newWidth, newHeight);
    renderer.render(scene, camera);
  });

  resizeObserver.observe(container);
}
