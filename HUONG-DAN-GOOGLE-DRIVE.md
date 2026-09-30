# Kết nối Google Drive (làm một lần, khoảng 5 phút)

App dùng quyền `drive.file`: chỉ đọc và ghi **những file do chính app tạo**, không nhìn thấy các file khác trong Drive của bạn.

## Bước 1: Tạo project trên Google Cloud
1. Vào https://console.cloud.google.com, bấm chọn project ở thanh trên cùng, chọn **New Project**, đặt tên (ví dụ `nhat-ky`) rồi bấm **Create**.
2. Vào **APIs & Services → Library**, tìm **Google Drive API** và bấm **Enable**.

## Bước 2: Màn hình đồng ý (OAuth consent screen)
1. Vào **APIs & Services → OAuth consent screen** (bản mới gọi là **Google Auth Platform → Branding**).
2. Chọn User type là **External**, điền tên app (ví dụ `Nhật Ký Riêng`) và email của bạn.
3. Ở mục **Audience** (hoặc Test users), thêm Gmail của bạn vào **Test users**.
   - Để ở chế độ *Testing* là đủ dùng cho cá nhân. Lưu ý: ở chế độ này Google có thể bắt đăng nhập lại sau khoảng 7 ngày, bạn chỉ cần bấm đồng bộ lại.

## Bước 3: Tạo OAuth Client ID
1. Vào **APIs & Services → Credentials → Create credentials → OAuth client ID** (bản mới: **Clients → Create client**).
2. Application type: chọn **Web application**.
3. Ở **Authorized JavaScript origins**, thêm địa chỉ site của bạn, ví dụ `https://nhat-ky-cua-toi.netlify.app`. Không có dấu `/` ở cuối. Nếu có tên miền riêng thì thêm cả tên miền đó.
4. Bấm **Create** rồi copy **Client ID** (dạng `1234-abc.apps.googleusercontent.com`).

## Bước 4: Đưa Client ID vào app
Chọn một trong hai cách:
- Thêm biến `GOOGLE_CLIENT_ID` trên Netlify rồi deploy lại, **hoặc**
- Mở app, vào **Cài đặt → Google Drive → Google Client ID** và dán vào.

## Bước 5: Đồng bộ
Bấm **Đồng bộ lên Drive** rồi chọn tài khoản Google và đồng ý. Trên Drive sẽ xuất hiện thư mục:
```
Nhật Ký Riêng/
  nhat-ky-data.json          toàn bộ dữ liệu (dùng để khôi phục)
  Markdown theo tháng/
    2026-09.md               đọc được ngay trên Drive / điện thoại
  Ảnh/
    p….jpg                   ảnh gốc đã nén
```
- **Tự đồng bộ**: bật ô *Tự đồng bộ sau mỗi lần lưu*. Sau khi bạn đã bấm đồng bộ một lần trong phiên, mỗi lần lưu app sẽ tự đẩy lên Drive. Phiên Google kéo dài khoảng 1 giờ.
- **Khôi phục** (ví dụ khi dựng site mới): bấm **Khôi phục từ Drive**. App gộp dữ liệu theo nguyên tắc bản mới hơn thắng, nên không xoá gì hiện có, và tải lại những ảnh còn thiếu.

## Lỗi thường gặp
| Lỗi | Cách sửa |
|---|---|
| `redirect_uri_mismatch` / `origin_mismatch` | Kiểm tra lại Authorized JavaScript origins đúng địa chỉ site, không có `/` ở cuối |
| `access_denied` | Gmail của bạn chưa có trong danh sách Test users |
| Cửa sổ đăng nhập không hiện | Cho phép popup cho site trong trình duyệt |


## Kết nối cố định (không phải đăng nhập Google lại mỗi lần)
Nếu không làm phần này, Google chỉ cho app dùng quyền trong **1 giờ**. Mỗi lần mở lại app để nghe nhạc hay đồng bộ, bạn lại phải bấm cho phép. Làm một lần như sau:

1. **Lấy Client Secret:** vào Google Cloud → **Google Auth Platform → Clients**, bấm vào client đã tạo (ví dụ MYNOTE). Ở mục **Client secrets**, copy mã dạng `GOCSPX-...`. Nếu chưa có thì bấm **Add secret**.
2. **Khai báo trên Netlify:** vào **Project configuration → Environment variables** và thêm:
   - `GOOGLE_CLIENT_SECRET` = mã `GOCSPX-...` vừa copy
   - `GOOGLE_CLIENT_ID` = Client ID (dạng `...apps.googleusercontent.com`), nếu chưa có
   Sau đó vào **Deploys → Trigger deploy**.
3. **Đưa app sang chế độ chính thức** (quan trọng): ở chế độ *Testing*, Google tự huỷ kết nối sau **7 ngày**.
   - Vào **Google Auth Platform → Branding**, điền đủ các mục bắt buộc (App name, User support email, Developer contact).
   - Vào **Audience**, bấm **Publish app** rồi **Confirm**. Không cần gửi Google xác minh vì chỉ mình bạn dùng. Khi đăng nhập, Google sẽ báo "ứng dụng chưa được xác minh": bấm **Nâng cao → Đi tới … (không an toàn)**. Đây là app của chính bạn.
4. **Kết nối trong app:** vào **Cài đặt → ☁️ Google Drive → Kết nối Google Drive cố định**, chọn Gmail rồi bấm **Cho phép** (tích đủ các ô quyền).

Xong. Từ giờ nghe nhạc, đồng bộ và tự đồng bộ đều không phải đăng nhập Google lại. Máy chủ Netlify giữ "khoá làm mới" ở kho riêng, trình duyệt không đọc được. Muốn thu hồi thì bấm **Ngắt kết nối** trong app, hoặc vào https://myaccount.google.com/permissions.
