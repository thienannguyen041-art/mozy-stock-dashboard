# VN Stock Dashboard — No API Key

Dashboard theo dõi watchlist cổ phiếu Việt Nam chạy trên máy cá nhân. Phiên bản này dùng dữ liệu công khai từ Yahoo Finance và tín hiệu kỹ thuật theo quy tắc, vì vậy **không cần Mozyfin hay API key**.

> Dữ liệu có thể trễ, thiếu hoặc thay đổi theo nhà cung cấp. Chỉ dùng để theo dõi và nghiên cứu; luôn đối chiếu giá, công bố thông tin và phân tích cơ bản trước khi giao dịch.

## Yêu cầu

- Node.js 18 trở lên.
- Kết nối Internet khi chạy pipeline.

## Chạy trên Windows

Mở PowerShell hoặc Terminal trong VS Code tại thư mục dự án:

```powershell
npm install
copy config.example.json config.json
npm run pipeline:eod
npm start
```

Mở `http://127.0.0.1:7878`.

Trên macOS/Linux, thay lệnh `copy` bằng:

```bash
cp config.example.json config.json
```

## Tùy chỉnh watchlist

Mở `config.json` và chỉ nhập mã cơ sở, không cần hậu tố `.VN`:

```json
{
  "tickers": ["VCB", "MBB", "FPT", "HPG"]
}
```

## Pipeline

| Lệnh | Tác dụng |
|---|---|
| `npm run pipeline:intraday` | Làm mới giá và tín hiệu gần nhất. |
| `npm run pipeline:eod` | Làm mới OHLCV, chỉ báo kỹ thuật và watchlist review. |
| `npm run pipeline:all` | Chạy cả hai chế độ. |
| `npm start` | Mở dashboard tại cổng 7878. |

## Những gì được giữ lại

- Giá, OHLCV và biểu đồ.
- MA, RSI, MACD, hỗ trợ/kháng cự.
- Tín hiệu kỹ thuật theo quy tắc minh bạch.
- Lưu snapshot cục bộ bằng SQLite.

## Giới hạn của phương án không API key

- Không có dữ liệu cơ bản chuẩn hóa, tin tức hoặc social posts tích hợp.
- Yahoo Finance không phải nguồn giá chính thức; có thể trễ hoặc một số mã không khả dụng.
- Tín hiệu tự động không phải khuyến nghị mua/bán.
