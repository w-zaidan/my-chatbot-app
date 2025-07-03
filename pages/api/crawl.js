import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ROOT_URL = 'https://yarukiouendan.or.jp/';
const VISITED_LIMIT = 50; // 安全のため最大ページ数制限

export default async function handler(req, res) {
  const visited = new Set();
  const queue = [ROOT_URL];

  let count = 0;
  while (queue.length > 0 && count < VISITED_LIMIT) {
    const url = queue.shift();
    if (visited.has(url)) continue;

    try {
      const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(html);
      const pageText = $('body').text().replace(/\s+/g, ' ').trim();

      // 保存（同じurlはupsertで上書き）
      await supabase.from('web_content').upsert([{
        url,
        content: pageText,
        updated_at: new Date().toISOString()
      }], { onConflict: ['url'] });

      visited.add(url);
      count++;

      // 内部リンクを発見して追加
      $('a[href]').each((_, el) => {
        let link = $(el).attr('href');
        if (!link) return;

        // 絶対URLでなければ補完
        if (link.startsWith('/')) link = ROOT_URL.replace(/\/$/, '') + link;
        // #アンカーやmailto:など除外
        if (link.startsWith('#') || link.startsWith('mailto:')) return;
        // 同一ドメインのみ
        if (link.startsWith(ROOT_URL) && !visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      });

    } catch (err) {
      // 404やその他エラーは無視して続行
      console.error(`[ERROR] ${url}: ${err.message}`);
      visited.add(url);
    }
  }
  res.status(200).json({ message: 'Crawling done', crawled: visited.size });
}
