import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      // 取得したデータをHTMLに反映させる
      document.getElementById('work-title').textContent = data.title;
      document.getElementById('work-author').textContent = data.author_name || '匿名さん';

      // （共同開発者向け）3Dモデルのパスをコンソールに出力
      console.log('取得した3Dモデルのパス:', data.model_url);
      // 必要に応じて、ここでThree.jsの初期化関数に data.model_url を渡して
      // キャンバス(#three-canvas)に描画する処理を呼び出します。
      // 例: initThreeJS(data.model_url);
    }

  } catch (error) {
    console.error('データの取得に失敗しました:', error);
  }
});
