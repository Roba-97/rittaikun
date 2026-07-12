import * as THREE from 'three';
import { supabase } from './const.js';

const galleryContainer = document.getElementById('gallery-container');
const loadingSentinel = document.getElementById('loading-sentinel');
const loadingSpinner = document.getElementById('loading-spinner');

// 取得状態を管理する変数
let currentIndex = 0;
const fetchCount = 4;
let isLoading = false; // 重複して通信しないためのロック用フラグ
let hasMoreData = true; // まだDBにデータが残っているかのフラグ

// 3Dプレビュー生成
function create3DPreview(containerId, modelData) {
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
  camera.position.set(20, 20, 20); // ※作品の大きさに合わせて数値を調整してください
  camera.lookAt(0, -8, 0);

  // ライトの設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Supabaseの jsonb 型は自動で配列として解釈されることが多いですが、念のためチェック
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

  renderer.render(scene, camera);

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

// データを取得する非同期関数
async function fetchGalleries() {
  // すでに読み込み中、またはこれ以上データが無い場合は処理をストップ
  if (isLoading || !hasMoreData) return;

  // ロックをかけて読み込み中状態にする
  isLoading = true;
  if (loadingSpinner) {
    loadingSpinner.style.display = 'inline-block'; // スピナーを表示
  }

  try {
    // range(開始位置, 終了位置) で取得するデータの範囲を指定
    const { data, error } = await supabase
      .from('objects')
      .select('id, title, author_name, model_data, created_at')
      .order('created_at', { ascending: false })
      .range(currentIndex, currentIndex + fetchCount - 1);

    if (error) {
      console.error("データの取得に失敗しました:", error.message);
      return;
    }

    // 取得したデータをループしてHTMLを生成し、コンテナに追加
    data.forEach(item => {
      const colDiv = document.createElement('div');
      colDiv.className = 'col';
      colDiv.innerHTML = `
        <div class="bg-opacity-75 preview-glass-panel w-100 h-100 d-flex flex-column">
          <div class="ratio ratio-1x1 w-100">
            <div id="preview-${item.id}"></div>
          </div>
          <div class="py-3 text-center">
            <a href="./showcase.html?id=${item.id}" class="stretched-link text-decoration-none text-dark fw-bold fs-4">${item.title || '無題'}</a>
          </div>
        </div>
      `;
      galleryContainer.appendChild(colDiv);
      // DOMに要素が追加された直後に、その要素に対して3Dプレビューを構築して描画する
      if (item.model_data) {
        // コンテナのサイズが確定してから描画させるための安全策として少し遅延させる
        setTimeout(() => {
          create3DPreview(`preview-${item.id}`, item.model_data);
        }, 50);
      }
    });

    // 次に取得を開始するインデックスを更新
    currentIndex += fetchCount;

    // 今回取得したデータが要求した件数(8件)より少なければ、全データ読み込み完了と判断
    if (data.length < fetchCount) {
      hasMoreData = false;
    }
  } catch (err) {
    console.error("予期せぬエラーが発生しました:", err);
  } finally {
    // 処理が終わったらロックを解除し、スピナーを隠す
    isLoading = false;
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }
  }
}


// 無限スクロール（Intersection Observer）の実装
const observerOptions = {
  root: null,
  rootMargin: '100px', // 画面の下端から100px手前に来たら早めに読み込みを開始する
  threshold: 0
};

const observer = new IntersectionObserver((entries) => {
  // 監視対象（loadingSentinel）が画面に入ったらデータを取得
  if (entries[0].isIntersecting) {
    fetchGalleries();
  }
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
  // 監視を開始
  if (loadingSentinel) {
    observer.observe(loadingSentinel);
  }

  // 初回読み込みを実行
  fetchGalleries();
});
