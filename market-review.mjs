// Rule-based watchlist review with public Yahoo Finance data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeFetch } from './mozyfin.mjs';
import { buildDataPerspective } from './technicals.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function reviewFromScore(score) {
  if (score >= 65) return ['tích cực', 'Theo dõi điểm mua gần hỗ trợ.'];
  if (score >= 55) return ['trung lập', 'Có thể tích lũy từng phần khi thanh khoản xác nhận.'];
  if (score < 40) return ['tiêu cực', 'Hạn chế mở vị thế mới, ưu tiên quản trị rủi ro.'];
  return ['trung lập', 'Quan sát thêm xác nhận xu hướng.'];
}

export async function generateMarketReview() {
  const items = [];
  for (const ticker of config.tickers || []) {
    const [quote, ohlcv] = await Promise.all([
      safeFetch(['quote', `${ticker}.VN`]),
      safeFetch(['ohlcv', `${ticker}.VN`, '--limit', '90'])
    ]);
    if (quote.error || ohlcv.error) {
      items.push({ ticker, price: '—', change: '—', sentiment: 'trung lập', key_signals: ['Không lấy được dữ liệu.'], news_headlines: [], recommendation: 'Kiểm tra lại mã hoặc kết nối.' });
      continue;
    }
    const q = quote.rows?.[0] || {};
    const dp = buildDataPerspective(ohlcv.rows || []) || {};
    const score = dp.trend_status?.trend_score ?? 50;
    const [sentiment, recommendation] = reviewFromScore(score);
    items.push({
      ticker,
      price: q.close == null ? '—' : Number(q.close).toLocaleString('vi-VN'),
      change: q.change_percent == null ? '—' : `${q.change_percent >= 0 ? '+' : ''}${Number(q.change_percent).toFixed(2)}%`,
      sentiment,
      key_signals: [`Điểm kỹ thuật ${score}/100`, `MA: ${dp.trend_status?.ma_alignment || 'unknown'}`, `RSI: ${dp.indicators?.rsi_14 == null ? '—' : Number(dp.indicators.rsi_14).toFixed(1)}`],
      news_headlines: ['Không có news feed trong phương án không cần API key.'],
      recommendation
    });
  }
  const positive = items.filter(x => x.sentiment === 'tích cực').length;
  const negative = items.filter(x => x.sentiment === 'tiêu cực').length;
  return {
    headline: `Watchlist: ${positive} mã tín hiệu tích cực, ${negative} mã cần thận trọng.`,
    watchlist: items,
    overall_sentiment: positive > negative ? 'Tín hiệu kỹ thuật của watchlist nghiêng tích cực.' : negative > positive ? 'Watchlist đang thiên về phòng thủ.' : 'Tín hiệu watchlist đang phân hóa.',
    risk_alerts: ['Dữ liệu Yahoo Finance có thể trễ hoặc thiếu.', 'Cần đối chiếu thông tin doanh nghiệp và định giá trước khi giao dịch.'],
    outlook: 'Theo dõi tín hiệu kỹ thuật theo ngày; không dùng dashboard thay cho khuyến nghị đầu tư cá nhân hóa.'
  };
}
