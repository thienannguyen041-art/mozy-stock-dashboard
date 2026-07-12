// Deterministic decision dashboard built from price and technical data.
// This replaces the former Mozy AI call so the project has no API-key dependency.

function n(value, fallback = null) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function money(value) {
  const v = n(value);
  return v == null ? '—' : Math.round(v).toLocaleString('vi-VN');
}

function pct(value) {
  const v = n(value);
  return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export async function generateDecisionDashboard({ ticker, today = {}, dataPerspective = {}, ohlcvTail = [] }) {
  const trend = dataPerspective.trend_status || {};
  const position = dataPerspective.price_position || {};
  const indicators = dataPerspective.indicators || {};
  const price = n(today.close, n(position.current_price));
  const score = n(trend.trend_score, 50);
  const rsi = n(indicators.rsi_14);
  const support = n(position.support_level, price == null ? null : price * 0.95);
  const resistance = n(position.resistance_level, price == null ? null : price * 1.08);
  const overbought = rsi != null && rsi >= 70;
  const oversold = rsi != null && rsi <= 30;

  let operation = 'giữ';
  let decisionType = 'hold';
  let signal = '🟡 quan sát';
  let prediction = 'đi ngang';
  if (score >= 65 && !overbought) { operation = 'mua'; decisionType = 'buy'; signal = '🟢 mua'; prediction = 'tăng'; }
  else if (score >= 55) { operation = 'tích lũy'; decisionType = 'buy'; signal = '🟢 mua'; prediction = 'tăng'; }
  else if (score < 35 && !oversold) { operation = 'bán'; decisionType = 'sell'; signal = '🔴 bán'; prediction = 'giảm'; }
  else if (score < 45) { operation = 'giảm tỷ trọng'; decisionType = 'sell'; signal = '⚠️ rủi ro'; prediction = 'giảm'; }
  else if (overbought) { operation = 'quan sát'; signal = '🟡 quan sát'; prediction = 'đi ngang'; }

  const maNote = trend.ma_alignment === 'bullish' ? 'MA5 > MA10 > MA20, xu hướng ngắn hạn tích cực'
    : trend.ma_alignment === 'bearish' ? 'MA5 < MA10 < MA20, xu hướng ngắn hạn suy yếu'
      : 'Các đường MA chưa đồng thuận';
  const macdPositive = n(indicators.macd_histogram, 0) > 0;
  const stopLoss = price == null ? null : Math.min(support ?? price * 0.95, price * 0.95);
  const takeProfit = price == null ? null : Math.max(resistance ?? price * 1.08, price * 1.06);

  return {
    stock_name: ticker,
    sentiment_score: Math.round(score),
    trend_prediction: prediction,
    operation_advice: operation,
    decision_type: decisionType,
    confidence_level: ohlcvTail.length >= 30 ? 'trung bình' : 'thấp',
    dashboard: {
      core_conclusion: {
        one_sentence: `${ticker}: ${operation.toUpperCase()} theo tín hiệu kỹ thuật, quản trị rủi ro tại vùng ${money(stopLoss)}.`,
        signal_type: signal,
        time_sensitivity: operation === 'mua' || operation === 'bán' ? 'trong tuần' : 'không gấp',
        position_advice: {
          no_position: operation === 'mua' || operation === 'tích lũy' ? 'Giải ngân từng phần, không mua đuổi.' : 'Chờ tín hiệu rõ hơn trước khi mở vị thế.',
          has_position: operation === 'bán' || operation === 'giảm tỷ trọng' ? 'Ưu tiên hạ tỷ trọng nếu vi phạm ngưỡng rủi ro.' : 'Tiếp tục nắm giữ và tuân thủ điểm dừng lỗ.'
        }
      },
      data_perspective: {
        trend_summary: `${maNote}; RSI ${rsi == null ? '—' : rsi.toFixed(1)}; MACD histogram ${macdPositive ? 'dương' : 'âm'}.`,
        volume_meaning: 'Dữ liệu thanh khoản dùng để theo dõi xác nhận xu hướng; cần so sánh thêm với bình quân 20 phiên.',
        chip_health: score >= 60 ? 'khoẻ' : score < 40 ? 'cảnh báo' : 'bình thường',
        valuation_view: 'không đủ dữ liệu định giá từ nguồn miễn phí'
      },
      intelligence: {
        latest_news: 'Nguồn miễn phí này không tích hợp tin tức; cần đối chiếu công bố thông tin của doanh nghiệp.',
        risk_alerts: [overbought ? 'RSI ở vùng quá mua, rủi ro điều chỉnh tăng.' : 'Theo dõi điểm dừng lỗ và thanh khoản.', 'Tín hiệu kỹ thuật không thay thế phân tích cơ bản.'],
        positive_catalysts: [trend.ma_alignment === 'bullish' ? 'Cấu trúc MA đang ủng hộ xu hướng tăng.' : 'Chờ MA và MACD xác nhận xu hướng.', macdPositive ? 'MACD histogram dương.' : 'Cần chờ MACD cải thiện.'],
        earnings_outlook: 'Không có dữ liệu KQKD tích hợp trong nguồn miễn phí.',
        sentiment_summary: `Điểm kỹ thuật ${Math.round(score)}/100; biến động phiên gần nhất ${pct(today.change_percent)}.`
      },
      battle_plan: {
        sniper_points: {
          ideal_buy: money(support), secondary_buy: price == null ? '—' : money(price * 0.97),
          stop_loss: money(stopLoss), take_profit: money(takeProfit)
        },
        position_strategy: {
          suggested_position: operation === 'mua' ? 'tối đa 20–30% vốn' : 'duy trì tỷ trọng thận trọng',
          entry_plan: 'Chia lệnh, ưu tiên mua gần hỗ trợ; không mua đuổi khi giá tăng nóng.',
          risk_control: 'Cắt lỗ khi giá đóng cửa dưới ngưỡng dừng lỗ; không dùng tín hiệu này như khuyến nghị đầu tư cá nhân hóa.'
        },
        action_checklist: [
          `${trend.ma_alignment === 'bullish' ? '✅' : '⚠️'} ${maNote}`,
          `${macdPositive ? '✅' : '⚠️'} MACD histogram ${macdPositive ? 'dương' : 'âm'}`,
          `${overbought ? '⚠️' : '✅'} RSI ${rsi == null ? 'chưa đủ dữ liệu' : rsi.toFixed(1)}`,
          `⚠️ Điểm dừng lỗ: ${money(stopLoss)}`,
          '⚠️ Đối chiếu báo cáo tài chính và tin tức trước khi ra quyết định.'
        ]
      }
    },
    analysis_summary: `${ticker} có điểm tín hiệu kỹ thuật ${Math.round(score)}/100. ${maNote}. Dashboard sử dụng quy tắc MA, RSI và MACD từ dữ liệu Yahoo Finance; đây là công cụ theo dõi, không phải khuyến nghị đầu tư.`,
    risk_warning: 'Dữ liệu miễn phí có thể trễ hoặc thiếu; biến động thị trường có thể khiến tín hiệu mất hiệu lực.',
    buy_reason: operation === 'mua' || operation === 'tích lũy' ? 'Xu hướng và điểm kỹ thuật đang tương đối tích cực.' : 'Chưa có đủ xác nhận kỹ thuật để tăng tỷ trọng.',
    news_summary: 'Không có news feed tích hợp trong phương án không cần API key.'
  };
}
