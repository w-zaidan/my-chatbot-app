import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import PROMPT_TEMPLATE from '../../lib/promptTemplate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST allowed' })
    return
  }
  const { prompt } = req.body

  // manual_faqs, web_content の検索
  let dbInfo = ""

  // 1. manual_faqs検索
  let { data: faqs } = await supabase
    .from('manual_faqs')
    .select('answer,question')
    .ilike('question', `%${prompt}%`)
  if (faqs && faqs.length > 0) {
    dbInfo = `Q: ${faqs[0].question}\nA: ${faqs[0].answer}`
  } else {
    // 2. web_content検索
    let { data: contents } = await supabase
      .from('web_content')
      .select('content')
      .ilike('content', `%${prompt}%`)
      .limit(10); //
    if (contents && contents.length > 0) {
      dbInfo = contents.map(c => c.content).join('\n---\n');
    }
  }

  // プロンプト生成（カスタマイズしやすい）
  const aiPrompt = PROMPT_TEMPLATE(prompt, dbInfo)

  // Geminiへリクエスト
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + GEMINI_API_KEY
  try {
    const result = await axios.post(
      url,
      { contents: [{ parts: [{ text: aiPrompt }] }] }
    )
    const aiReply = result.data.candidates[0]?.content?.parts[0]?.text ?? 'No reply'
    res.status(200).json({ reply: aiReply })
  } catch (error) {
    res.status(500).json({
      message: error.message,
      detail: error.response?.data,
      env: GEMINI_API_KEY ? 'KEY_SET' : 'KEY_NOT_SET'
    })
  }
}
