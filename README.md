# Nhật Ký Riêng: hệ sinh thái ghi chép cá nhân trên Netlify

App gồm các phần:

- **Nhật ký**: 7 loại ghi chép (Nhật ký, Bài học, Ghi chú, Link hay, Địa điểm, Ý tưởng, Mục tiêu). Mỗi mục có thể kèm tâm trạng, ảnh, vị trí, link (tự lấy tiêu đề và ảnh xem trước) và thẻ. Có mẫu viết sẵn cho từng loại, nhập bằng giọng nói tiếng Việt, tìm kiếm, lọc theo loại và thẻ, và mục **Ngày này năm xưa**.
- **Kho link (📚)**: lưu link Facebook, YouTube, TikTok, Instagram hay bài báo. Dán link vào là lưu ngay: app tự lấy tiêu đề, ảnh và tên kênh. Bạn ghi chú *link này nói gì, vì sao lưu* (gõ hoặc nói) và chọn chủ đề: Khoa học, Công nghệ & AI, Tài chính & Đầu tư, Sức khỏe, Tâm lý, Lịch sử… Chủ đề riêng thêm được trong Cài đặt. AI có thể **gợi ý chủ đề** nhưng chỉ dựa vào tiêu đề, không xem video, không đọc trang nên rất nhẹ; tắt được trong Cài đặt.
  - Mỗi link có trạng thái 📌 Xem sau, ✅ Đã xem hoặc ⭐ Yêu thích. Lọc được theo chủ đề, nguồn và trạng thái, tìm được theo tiêu đề, ghi chú hoặc kênh. Video YouTube phát được ngay trong app.
  - **Lưu nhanh**: dán một hay nhiều link (mỗi dòng một link). Trên **Android**, sau khi cài app ra màn hình chính, bạn bấm *Chia sẻ → Nhật Ký* ngay trong Facebook hoặc YouTube. Trên **máy tính**, dùng nút dấu trang "📚 Lưu vào Nhật Ký" (xem Cài đặt).
- **Thư mục mẹ – con & nhật ký con**: tạo thư mục lồng nhau (ví dụ Công việc → Dự án A), trong một nhật ký thêm nhiều **mục con**. Có 2 chế độ xem: **📅 Theo ngày** và **📁 Theo thư mục** (dạng cây, mở/thu gọn).
- **🎵 Trình phát nhạc**: nghe file nhạc (MP3, M4A…) có sẵn trong Google Drive ngay trong app. Có danh sách theo thư mục, tìm kiếm, phát trộn, lặp lại, điều khiển trên màn hình khoá, và gắn bài đang nghe vào nhật ký. Lần đầu dùng, Google sẽ hỏi thêm quyền *chỉ đọc* file Drive.
- **🔐 Bảo mật**: mở khoá bằng **Face ID / vân tay** (passkey, máy chủ xác minh thật), **tự khoá** sau 5 phút đến 12 giờ không dùng, **đăng nhập bằng Gmail** (chỉ tài khoản đã liên kết), **danh sách thiết bị** kèm nút đăng xuất từng máy hoặc tất cả (có hiệu lực ngay), và chặn dò mật khẩu (sai 5 lần thì khoá 15 phút).
- **Trang chủ thân thiện**: lời chào theo giờ, chọn tâm trạng bằng 1 chạm, 8 ô thao tác nhanh (Viết, Nói, Ảnh, Check-in, Bài học, Lưu link, Nghe nhạc, Hỏi AI), mỗi ngày một câu gợi ý viết, hiệu ứng mừng khi giữ chuỗi ngày viết, và màu riêng cho từng loại ghi chép.
- **Ghi nhanh bằng AI**: bạn kể lung tung một đoạn, AI tách thành một hoặc nhiều mục có tiêu đề, loại, thẻ, tâm trạng và thời điểm (hiểu được "hôm qua", "8h tối").
- **Bản đồ kỷ niệm**: mọi mục có vị trí hiện trên bản đồ OpenStreetMap, kèm danh sách các nơi bạn hay tới.
- **Thư viện ảnh**: ảnh được nén trước khi tải lên (tối đa 1800px) và có thêm bản thu nhỏ để trang tải nhanh.
- **Trợ lý AI (Gemini)**: đọc toàn bộ nhật ký để trả lời câu hỏi của bạn. Có sẵn các nút Tổng kết tuần, Tổng kết tháng, Bài học lặp lại, Điều gì làm tôi vui, Tôi đã đi đâu, Mục tiêu tháng tới, Link đã lưu. Câu trả lời lưu lại được thành ghi chú.
- **AI phản hồi từng mục**: đồng cảm, rút ra bài học, đặt câu hỏi để bạn nghĩ thêm, và liên hệ với các mục cũ cùng thẻ.
- **Âm lịch**: mỗi mục hiện ngày âm (thuật toán Hồ Ngọc Đức, giờ Việt Nam). Tìm được theo ngày âm, ví dụ gõ `âm 15/8`. Mục **Ngày này năm xưa** so cả ngày dương lẫn ngày âm. Thẻ **Hôm nay** cho biết ngày âm, can chi, giờ hoàng đạo, cùng đại vận, tiểu hạn và lưu nguyệt của bạn.
- **Tử vi**: nhập ngày giờ sinh (dương hoặc âm lịch) để app tự an lá số theo Tử Vi Đẩu Số. Lá số gồm 12 cung, 14 chính tinh kèm miếu/vượng/đắc/bình/hãm, khoảng 30 phụ tinh, Tứ Hoá, Tuần/Triệt, vòng Tràng Sinh, vòng Lộc Tồn, cục, bản mệnh, đại vận và tiểu hạn. AI có thể **luận tổng quan và 12 cung**, **luận riêng từng cung** (có xét tam phương tứ chính) và **đối chiếu nhật ký với lá số**: mỗi mục được gắn đại vận, tiểu hạn và lưu nguyệt tương ứng, rồi AI chỉ ra chỗ khớp và chỗ không khớp. Bài luận lưu lại được vào nhật ký.
- **Thống kê**: lịch ghi chép 12 tháng, biểu đồ tâm trạng 90 ngày, chuỗi ngày viết liên tiếp, chủ đề nhiều nhất, và nút *Nhờ AI đọc các con số này*.
- **Google Drive**: đồng bộ file dữ liệu JSON, bản Markdown theo tháng (đọc ngay trên Drive) và toàn bộ ảnh. Khôi phục được sang máy hoặc site mới.
- Xuất và nhập JSON, xuất Markdown, giao diện sáng/tối, cài được lên màn hình điện thoại như một app.

Dữ liệu nằm trên **Netlify Blobs** nên mở từ máy nào cũng thấy. App được khoá bằng **mật khẩu**, dùng cookie HttpOnly.

---

## 1. Lấy Gemini API key
Vào https://aistudio.google.com/apikey và tạo key (có gói miễn phí).

## 2. Deploy lên Netlify

> Kéo thả thư mục vào Netlify Drop **không** chạy được Functions. Hãy dùng cách A hoặc B.

**Cách A: qua GitHub (khuyên dùng)**
1. Tạo repo **Private** trên GitHub rồi upload toàn bộ thư mục này, giữ nguyên cấu trúc.
2. Vào https://app.netlify.com, chọn **Add new site → Import an existing project → GitHub**, rồi chọn repo.
3. Để nguyên cấu hình (đã có trong `netlify.toml`) và bấm **Deploy**.

**Cách B: dùng Netlify CLI**
```bash
cd nhat-ky-app
npm install
npx netlify-cli login
npx netlify-cli deploy --prod
```

## 3. Khai báo biến môi trường
Vào **Site configuration → Environment variables**:

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `APP_PASSWORD` | **Có** | Mật khẩu mở nhật ký. Nên đặt mật khẩu dài |
| `GEMINI_API_KEY` | Nên có | Key Gemini; thiếu key thì các tính năng AI không chạy |
| `GEMINI_MODEL` | Không | Mặc định `gemini-2.5-flash`. Đổi được ngay trong Cài đặt của app |
| `GOOGLE_CLIENT_ID` | Cho Drive | Xem `HUONG-DAN-GOOGLE-DRIVE.md` |
| `AUTH_SECRET` | Không | Chuỗi ngẫu nhiên. Đổi chuỗi này, hoặc đổi mật khẩu, thì mọi thiết bị bị đăng xuất |

Sau khi thêm biến, vào **Deploys → Trigger deploy → Deploy site** để biến có hiệu lực.

## 4. Cài thành app riêng (điện thoại / máy tính)
App là PWA, có biểu tượng PNG và service worker nên cài được như một app thật:
- **Android (Chrome):** mở site → thanh "📲 Cài Nhật Ký thành app" hiện lên → **Cài**. Nếu không thấy, bấm ⋮ → **Cài đặt ứng dụng**. Sau khi cài, nút *Chia sẻ* trong Facebook/YouTube sẽ có mục **Nhật Ký**.
- **iPhone (Safari):** bấm **Chia sẻ → Thêm vào MH chính**.
- **Máy tính (Chrome/Edge):** bấm biểu tượng cài đặt ở cuối thanh địa chỉ, hoặc vào **Cài đặt → 📲 Cài app** trong app.
- Nếu mở link từ Zalo/Messenger/Facebook, app sẽ chạy trong trình duyệt riêng của các ứng dụng đó và không cài được. Hãy chọn **Mở bằng trình duyệt** trước.

## 5. Khi mất điện thoại
1. Mở app trên máy khác, vào **Cài đặt → 🔐 Bảo mật & thiết bị** và bấm **Đăng xuất** ở máy bị mất. Máy đó bị đăng xuất ngay.
2. Nếu không còn máy nào đang đăng nhập: vào Netlify đổi `APP_PASSWORD` rồi deploy lại. Mọi máy sẽ bị đăng xuất.
3. Nên bật trước **Face ID / vân tay** và **Tự khoá**, để người nhặt được điện thoại (dù đã mở khoá máy) cũng không mở được nhật ký.

## 6. Cấu trúc code
```
public/                  Giao diện (index.html, app.css, app.js)
netlify/functions/
  auth.mjs               Đăng nhập (mật khẩu, Face ID/passkey, Google), thiết bị, tự khoá
  (public/tuvi.js         Âm lịch + an sao tử vi, chạy trên trình duyệt)
  entries.mjs            Các mục nhật ký (Netlify Blobs, gộp theo updatedAt)
  photos.mjs             Lưu và đọc ảnh
  kv.mjs                 Cài đặt, lịch sử chat, bản đồ file trên Drive
  unfurl.mjs             Lấy tiêu đề và ảnh xem trước của link
netlify/edge-functions/
  ai.js                  Gọi Gemini, stream câu trả lời (không bị giới hạn 10 giây)
netlify/lib/token.mjs    Ký và kiểm tra dữ liệu (HMAC)
netlify/lib/session.mjs  Phiên đăng nhập theo thiết bị, tự khoá, đăng xuất từ xa
public/vendor/webauthn.js  Thư viện passkey (@simplewebauthn/browser)
public/sw.js             Service worker (cài thành app)
```

## 6. Quyền riêng tư và giới hạn
- Tử vi: lá số an theo cách phổ biến ở Việt Nam. Bảng miếu/hãm, Khôi/Việt năm Canh, Tân và Tứ Hoá năm Canh, Nhâm có khác nhau giữa các trường phái. Người sinh tháng nhuận được tính như sau: từ ngày 1 đến 15 dùng tháng đó, từ ngày 16 trở đi dùng tháng sau. Nên so với một lá số lập ở nơi khác. Phần luận chỉ để tham khảo.
- Nhật ký nằm trong Netlify Blobs của site bạn. Khi bạn dùng tính năng AI, nội dung liên quan được gửi tới Google Gemini để xử lý. Gói miễn phí của Gemini có thể dùng dữ liệu để cải thiện dịch vụ; nếu lo ngại, hãy bật billing (gói trả phí không dùng dữ liệu như vậy).
- Tên địa điểm lấy từ OpenStreetMap Nominatim, nên thỉnh thoảng có thể chậm.
- Facebook: nhiều bài đăng cần đăng nhập nên app có thể chỉ lấy được tiêu đề chung. Khi đó bạn tự sửa tiêu đề và ghi chú.
- Nhập bằng giọng nói chạy tốt nhất trên Chrome. Trên iPhone, dùng nút mic của bàn phím.
- Mỗi ảnh tối đa khoảng 5MB sau khi nén; app đã tự nén nên thực tế không bị chạm ngưỡng này.
