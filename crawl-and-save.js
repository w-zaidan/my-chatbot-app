// crawl-and-save.js

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import cheerio from 'cheerio'

const baseUrl = 'https://yarukiouendan.or.jp/'

// Supabaseの認証情報（GitHub Actionsでは環境変数から受け取る）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const visited = new Set()
const results = []

async function crawl(url) {
  if (visited.has(url)) return
  visited.add(url)

  const { data } = await axios.get(url)
  const $ = cheerio.load(data)
  const content = $('body').text().trim().replace(/\s+/g, ' ')
  results.push({ url, content })

  $('a[href^="/"], a[href^="' + baseUrl + '"]').each((_, el) => {
    const href = $(el).attr('href')
    let nextUrl = href.startsWith('http') ? href : baseUrl.replace(/\/$/, '') + href
    // 同じサイト内だけ
    if (nextUrl.startsWith(baseUrl)) crawl(nextUrl)
  })
}

;(async () => {
  await crawl(baseUrl)
  // データを一旦全消ししてから追加
  await supabase.from('web_content').delete().neq('id', 0)
  for (const item of results) {
    await supabase.from('web_content').upsert({
      url: item.url,
      content: item.content,
      created_at: new Date().toISOString(),
    })
  }
  console.log('Crawl and save done')
})()
