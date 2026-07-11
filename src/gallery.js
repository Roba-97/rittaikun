import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const galleryContainer = document.getElementById('gallery-container');
const loadingSentinel = document.getElementById('loading-sentinel');
const loadingSpinner = document.getElementById('loading-spinner');

// 取得状態を管理する変数
let currentIndex = 0;
const fetchCount = 8;
let isLoading = false; // 重複して通信しないためのロック用フラグ
let hasMoreData = true; // まだDBにデータが残っているかのフラグ

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
      .select('id, title, author_name, thumbnail_url, created_at')
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
      // 実際のDBのカラム名（item.title, item.image_url等）に合わせてください
      colDiv.innerHTML = `
        <a href="./showcase.html?id=${item.id}">
          <img src="${item.thumbnail_url || 'https://placehold.jp/300x300.png'}" class="img-fluid" alt="作品画像">
        </a>
        <p>${item.title || '無題'}</p>
      `;
      galleryContainer.appendChild(colDiv);
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
