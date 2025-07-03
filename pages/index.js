import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // 履歴をSupabaseから読み込む
  useEffect(() => {
    const fetchData = async () => {
      let { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error) setMessages(data);
    };
    fetchData();
  }, []);

  // メッセージ送信
  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    // Gemini API呼び出し
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input }),
    });
    const { reply } = await res.json();
    // Supabaseに保存
    const { data, error } = await supabase
      .from("messages")
      .insert([{ user_message: input, bot_reply: reply }])
      .select();
    setMessages([...messages, { user_message: input, bot_reply: reply }]);
    setInput("");
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>チャットボット（Gemini+Supabase）</h1>
      <div style={{ border: "1px solid #ccc", minHeight: 200, padding: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <b>あなた:</b> {msg.user_message}<br />
            <b>Bot:</b> {msg.bot_reply}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          style={{ width: "80%", padding: 8, fontSize: 16 }}
          placeholder="質問を入力..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading} style={{ padding: "8px 20px", marginLeft: 8 }}>
          送信
        </button>
      </div>
    </div>
  );
}
