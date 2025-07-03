import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST allowed' });
    return;
  }
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent?key=' + apiKey;

  try {
    const result = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );
    const aiReply = result.data.candidates[0]?.content?.parts[0]?.text ?? 'No reply';
    res.status(200).json({ reply: aiReply });
  } catch (error) {
    console.error(error);  // ←（追加）VercelのRuntime Logsでもエラーが見える
    res.status(500).json({ 
      message: error.message,
      detail: error.response?.data,         // Geminiからのエラー詳細を返す
      env: process.env.GEMINI_API_KEY ? 'KEY_SET' : 'KEY_NOT_SET' // 環境変数があるか判定
    });
  }
}
