// Public, no-key market-data adapter for Vietnam tickers on Yahoo Finance.
// The filename is retained to avoid breaking the original dashboard imports.
import { buildDataPerspective } from './technicals.mjs';

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function tickerFromSymbol(symbol = '') {
  return String(symbol).trim().toUpperCase().replace(/\.VN$/i, '');
}

function yahooSymbol(symbol = '') {
  const ticker = tickerFromSymbol(symbol);
  return ticker ? `${ticker}.VN` : '';
}

function option(args, name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] != null ? args[i + 1] : fallback;
}

function rangeForLimit(limit) {
  if (limit <= 7) return '5d';
  if (limit <= 31) return '1mo';
  if (limit <= 130) return '6mo';
  return '1y';
}

async function fetchChart(symbol, { range = '6mo', interval = '1d', timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${BASE_URL}${encodeURIComponent(yahooSymbol(symbol))}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&events=history`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 stock-dashboard/1.0' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Yahoo Finance HTTP ${response.status}`);
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const error = payload?.chart?.error;
    if (error) throw new Error(error.description || error.code || 'Yahoo Finance error');
    if (!result) throw new Error('Yahoo Finance returned no data for this ticker');
    return result;
  } finally {
    clearTimeout(timer);
  }
}

function chartRows(chart) {
  const quote = chart?.indicators?.quote?.[0] || {};
  const timestamps = chart?.timestamp || [];
  const rows = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = numberOrNull(quote.close?.[i]);
    if (close == null) continue;
    rows.push({
      timestamp: new Date(timestamps[i] * 1000).toISOString(),
      open: numberOrNull(quote.open?.[i]),
      high: numberOrNull(quote.high?.[i]),
      low: numberOrNull(quote.low?.[i]),
      close,
      volume: numberOrNull(quote.volume?.[i]) || 0
    });
  }
  return rows;
}

async function getOhlcv(symbol, { limit = 90, timeoutMs } = {}) {
  const chart = await fetchChart(symbol, { range: rangeForLimit(limit), timeoutMs });
  const rows = chartRows(chart);
  return { chart, rows: rows.slice(-limit) };
}

async function getQuote(symbol, timeoutMs) {
  const { chart, rows } = await getOhlcv(symbol, { limit: 5, timeoutMs });
  const latest = rows.at(-1);
  const previous = rows.at(-2);
  if (!latest) throw new Error(`Không có giá cho ${tickerFromSymbol(symbol)}`);
  const change = previous?.close == null ? null : latest.close - previous.close;
  const changePct = previous?.close ? (change / previous.close) * 100 : null;
  return {
    ticker: tickerFromSymbol(symbol),
    source: 'Yahoo Finance',
    currency: chart?.meta?.currency || 'VND',
    ...latest,
    price: latest.close,
    change,
    change_percent: changePct,
    total_volume: latest.volume,
    total_value: latest.volume * latest.close,
    previous_close: previous?.close ?? chart?.meta?.previousClose ?? null,
    day_high: latest.high,
    day_low: latest.low
  };
}

export async function safeFetch(args, { timeoutMs = 30000 } = {}) {
  try {
    const command = String(args?.[0] || '').toLowerCase();
    const symbol = args?.[1] || '';
    const limit = Math.max(1, Number(option(args, '--limit', 90)) || 90);

    if (command === 'quote') {
      return { rows: [await getQuote(symbol, timeoutMs)], source: 'Yahoo Finance' };
    }

    if (command === 'ohlcv') {
      const { rows } = await getOhlcv(symbol, { limit, timeoutMs });
      return { rows, source: 'Yahoo Finance' };
    }

    if (command === 'ta') {
      const { rows } = await getOhlcv(symbol, { limit: 130, timeoutMs });
      const perspective = buildDataPerspective(rows) || {};
      return { rows: [{ ticker: tickerFromSymbol(symbol), source: 'Yahoo Finance', ...perspective }], source: 'Yahoo Finance' };
    }

    if (command === 'stats') {
      const { rows } = await getOhlcv(symbol, { limit: 252, timeoutMs });
      const latest = rows.at(-1) || {};
      const highs = rows.map(r => r.high).filter(Number.isFinite);
      const lows = rows.map(r => r.low).filter(Number.isFinite);
      const avgVolume = rows.length ? rows.reduce((sum, r) => sum + (r.volume || 0), 0) / rows.length : null;
      return { rows: [{
        ticker: tickerFromSymbol(symbol), source: 'Yahoo Finance', close: latest.close ?? null,
        high_52w: highs.length ? Math.max(...highs) : null,
        low_52w: lows.length ? Math.min(...lows) : null,
        average_volume: avgVolume, latest_volume: latest.volume ?? null
      }], source: 'Yahoo Finance' };
    }

    if (command === 'risk') {
      const { rows } = await getOhlcv(symbol, { limit: 60, timeoutMs });
      const dp = buildDataPerspective(rows);
      const score = dp?.trend_status?.trend_score ?? null;
      return { rows: [{
        ticker: tickerFromSymbol(symbol), source: 'Technical rules',
        risk_level: score == null ? 'unknown' : score < 40 ? 'high' : score < 55 ? 'medium' : 'normal'
      }] };
    }

    // Yahoo's public chart endpoint has no reliable news or social-post feed.
    if (['news', 'social-post', 'search'].includes(command)) {
      return { rows: [], raw: '', source: 'Not available without a separate provider' };
    }

    return { error: `Unsupported market-data command: ${command}`, rows: [] };
  } catch (error) {
    return { error: `Yahoo Finance: ${error.message}`, rows: [] };
  }
}
