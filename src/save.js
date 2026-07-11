import { exportToJSON } from "./modeling.js";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveData() {
  try {
    const authorName = document.getElementById('author-input').value;
    const title = document.getElementById('title-input').value;

    const json = exportToJSON();
    const modelData = JSON.parse(json);

    const { error } = await supabase
      .from("objects")
      .insert([
        {
          title: title,
          author_name: authorName,
          model_data: modelData,       // 🔥 ここにボクセルの配列がそのまま入ります！
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    console.log("JSONの保存に成功しました!");
    alert("作品の保存に成功しました！");

    // OKが押されたら一覧ページへ遷移
    window.location.href = "../pages/gallery.html";
  }
  catch (error) {
	  console.error("予期せぬエラーが発生しました:", error);
  }
}

// Save button
const saveButton = document.getElementById('save-btn');
saveButton.addEventListener("click", (e) => {
	e.stopPropagation();
  e.preventDefault();
  const form = document.getElementById('submit-form');
  const titleInput = document.getElementById('title-input');

  form.classList.add('was-validated');

  // HTMLの「required」を満たしているかチェック
  if (!form.checkValidity()) {
    event.preventDefault(); // 送信をストップ
    event.stopPropagation();
    return; // ここで処理を終了
  }

	saveData();
});
