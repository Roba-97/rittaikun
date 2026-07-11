import { exportToJSON } from "./modeling.js";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveData() {
  try {
  const authorName = document.getElementById('author-input').value;
  console.log(authorName);
  const title = document.getElementById('title-input').value;
  console.log(title);

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
	saveData();
});

