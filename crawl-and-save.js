// crawl-and-save.js

const cheerio = require('cheerio');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const baseUrl = 'https://yarukiouendan.or.jp/'

// 除外する拡張子リスト
const EXCLUDE_EXTS = [
  '.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.csv'
];

function isExcluded(url) {
  return EXCLUDE_EXTS.some(ext => url.toLowerCase().split('?')[0].endsWith(ext));
}

// Supabaseの認証情報
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const visited = new Set()
const results = []

async function crawl(url) {
  if (visited.has(url) || isExcluded(url)) return
  visited.add(url)

  let data;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    data = res.data;
  } catch (err) {
    console.error('Failed to fetch:', url, err.message);
    return;
  }

  const $ = cheerio.load(data)
  // 本文を抜き出す優先順（うまくいかない場合は順次追加/調整OK）
  let content =
    $('.post-content').text().trim() ||
    $('.entry-content').text().trim() ||
    $('.post').text().trim() ||
    $('.content').text().trim() ||
    $('main').text().trim() ||
    $('article').text().trim();

  if (!content) {
    content = $('body').text().trim();
  }

results.push({ url, content });

  $('a[href^="/"], a[href^="' + baseUrl + '"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return;
    let nextUrl = href.startsWith('http') ? href : baseUrl.replace(/\/$/, '') + href
    // サイト内かつバイナリ拡張子でない場合のみ
    if (nextUrl.startsWith(baseUrl) && !isExcluded(nextUrl)) crawl(nextUrl)
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
