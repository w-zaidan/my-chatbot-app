import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST allowed' });
    return;
  }
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;

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
    res.status(500).json({ message: error.message });
  }
}
