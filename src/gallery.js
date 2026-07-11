import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const galleryContainer = document.getElementById('gallery-container');
const loadMoreBtn = document.getElementById('load-more-btn');

// 取得状態を管理する変数
let currentIndex = 0;
const fetchCount = 8;

// データを取得する非同期関数
async function fetchGalleries() {
  try {
    // ボタンを一時的に無効化して連打を防ぐ
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = '読み込み中...';
    }

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
      if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none'; // ボタンを非表示にする
      }
    } else {
      // まだ続きがある場合はボタンを元の状態に戻す
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'もっと見る';
      }
    }
  } catch (err) {
      console.error("予期せぬエラーが発生しました:", err);
  }
}

// ページ読み込み時にデータ取得を実行
fetchGalleries();

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', fetchGalleries);
}
