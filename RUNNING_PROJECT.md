# Hướng dẫn chạy dự án

## Cài đặt lần đầu

```bash
# Cài dependencies cho root
npm install

# Cài dependencies cho server
npm install --prefix server

# Cài dependencies cho client
npm install --prefix client
```

## Chạy dự án (với Hot Reload)

Chạy từ thư mục gốc dự án:

```bash
npm start
```

hoặc

```bash
npm run dev
```

**Điều này sẽ:**
- Chạy server trên `http://localhost:3001`
- Chạy React dev server trên `http://localhost:3000`
- React dev server tự động proxy API requests đến server (port 3001)
- **Hot reload được bật tự động** - khi sửa code, web sẽ tự động cập nhật

## Cấu hình

### Server Configuration
- **File:** `server/.env`
- **Port:** 3001 (có thể thay đổi)
- **NODE_ENV:** development (tự động reload khi code thay đổi)

#### AI Configuration (tùy chọn)
- **GEMINI_API_KEY:** API key Google AI Studio (không được đưa lên GitHub)
- **GEMINI_MODEL:** mặc định `gemini-2.5-flash`
- **AI_PROVIDER:** `gemini` (khuyến nghị) hoặc `openai`

#### Google Login Configuration
- **Server (`server/.env`):** `GOOGLE_CLIENT_ID` (bat buoc), `GOOGLE_CLIENT_IDS` (tuy chon, danh sach cach nhau boi dau phay)
- **Client (`client/.env.local` hoac Vercel Env):** `REACT_APP_GOOGLE_CLIENT_ID`

Ví dụ:

```dotenv
# server/.env
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_IDS=
```

```dotenv
# client/.env.local
REACT_APP_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

### Khi deploy len Vercel/Render (fix Error 400: origin_mismatch)

Neu popup Google bao loi `Access blocked: Authorization Error` voi `Error 400: origin_mismatch`, nghia la domain frontend chua duoc khai bao trong Google Cloud Console.

Loi nay thuong xay ra khi ban cau hinh origin tren OAuth Client A, nhung frontend lai dang dung OAuth Client B.

Thuc hien theo checklist sau:

1. Tren Google Cloud Console:
   - Vao APIs & Services > Credentials > OAuth 2.0 Client IDs.
   - Mo dung **Web Client** ma frontend dang su dung.
   - Them vao Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://job-finder-smoky-two.vercel.app` (hoac domain production cua ban)
   - Save va cho 1-5 phut de cau hinh cap nhat.

2. Tren Vercel (frontend):
   - Dat `REACT_APP_GOOGLE_CLIENT_ID` = dung Web Client ID o tren.
   - Redeploy sau khi luu env (env chi ap dung cho build moi).

3. Tren backend (Render/Railway/VM):
   - Dat `GOOGLE_CLIENT_ID` = cung gia tri voi frontend.
   - (Tuy chon) Dat `GOOGLE_CLIENT_IDS` neu can ho tro them ID trong giai doan chuyen doi.
   - Dat `CORS_ORIGIN` chua domain frontend, vi du:

```dotenv
CORS_ORIGIN=http://localhost:3000,https://job-finder-smoky-two.vercel.app
```

4. Deploy lai ca frontend va backend sau khi doi env.

Luu y: URL preview cua Vercel co the thay doi theo moi lan deploy. Nen uu tien dung 1 domain production co dinh de tranh bi `origin_mismatch` lap lai.

Tạo/cập nhật `server/.env`:

```bash
# copy file mẫu
copy server\.env.example server\.env
```

Sau đó mở `server/.env` và thêm (khuyến nghị Gemini):

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Hoặc nếu dùng OpenAI:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Khởi động lại server để nhận biến môi trường.

### Client Configuration  
- **File:** `client/.env`
- **API Base URL:** http://localhost:3001
- Hot reload được bật tự động bởi `react-scripts`

## Cách sử dụng

1. Mở terminal từ thư mục gốc dự án
2. Chạy: `npm start`
3. Trình duyệt sẽ tự động mở trang `http://localhost:3000`
4. **Sửa code ở client hoặc server:**
   - Client: Sửa file `.js` trong `client/src/` → trang web tự động reload
   - Server: Sửa file `.js` trong `server/` → server tự động restart (nodemon)

## Chú ý

- Đảm bảo ports 3000 và 3001 không bị chiếm dụng
- Nếu gặp lỗi CORS, kiểm tra setupProxy.js có cấu hình đúng không
- Nếu server không restart, kiểm tra nodemon đã được cài hay chưa: `npm list nodemon --prefix server`

### Bảo mật
- Không dán API key vào code React (frontend) hoặc commit lên repo.
