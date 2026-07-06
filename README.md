# PDH2026 – Hệ thống Quản lý Thi đua & Tự đánh giá Rèn luyện

Ứng dụng web hỗ trợ nhà trường THCS quản lý học sinh, theo dõi vi phạm, chấm điểm rèn luyện theo tháng, và phê duyệt nhiều cấp (GVCN, Giám thị, BGH, Admin).

---

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Hướng dẫn chạy local](#hướng-dẫn-chạy-local)
- [Hướng dẫn cấu hình Firebase (CDN, không npm)](#hướng-dẫn-cấu-hình-firebase-cdn-không-npm)
- [Hướng dẫn Deploy với Netlify (CI/CD từ GitHub)](#hướng-dẫn-deploy-với-netlify-cicd-từ-github)
- [Luồng phân quyền người dùng](#luồng-phân-quyền-người-dùng)
- [Sao lưu và khôi phục dữ liệu](#sao-lưu-và-khôi-phục-dữ-liệu)
- [Định hướng phát triển](#định-hướng-phát-triển)
- [Giấy phép](#giấy-phép)

---

## Giới thiệu

**PDH2026** là hệ thống web một trang (SPA theo kiểu thuần JS) dùng để:

- Quản lý danh sách học sinh toàn trường.
- Quản lý vi phạm nề nếp và điểm thi đua.
- Học sinh tự đánh giá rèn luyện hàng tháng.
- Giáo viên/Giám thị/BGH/Admin phê duyệt và theo dõi báo cáo.

Hệ thống ưu tiên tính ổn định với cơ chế lưu cục bộ (IndexedDB) kết hợp đồng bộ Cloud (Firebase Firestore).

---

## Tính năng chính

### 1) Đăng nhập & xác thực
- **Học sinh**: đăng nhập bằng mã định danh 10 số.
- **Nhân sự** (GVCN/Giám thị/BGH/Admin): đăng nhập bằng email/mật khẩu Firebase Auth.
- Hỗ trợ quên mật khẩu qua email reset.

### 2) Phân quyền theo vai trò
- **Admin**: quản trị người dùng, mã lỗi, import dữ liệu, báo cáo toàn hệ thống.
- **Giám thị**: ghi vi phạm nhanh, tra cứu học sinh, nhật ký vi phạm.
- **GVCN**: duyệt phiếu rèn luyện lớp chủ nhiệm, quản lý tổ/chức vụ/lưu ý học sinh.
- **BGH**: phê duyệt và xem báo cáo thi đua tổng hợp.
- **Học sinh**: tự khai báo phiếu rèn luyện theo tháng.

### 3) Dữ liệu học sinh
- Import Excel (.xlsx/.xls), ánh xạ cột linh hoạt.
- CRUD học sinh.
- Tìm kiếm theo tên, lớp, SĐT, mã định danh.
- Lọc theo khối/lớp.

### 4) Vi phạm & thi đua
- Danh mục lỗi vi phạm (điểm trừ, nhóm lỗi).
- Ghi nhận vi phạm theo ngày/tuần/tháng/học kỳ.
- Sổ tay vi phạm có bộ lọc.
- Tự động cập nhật điểm phiếu đánh giá khi thêm/xóa vi phạm.

### 5) Phiếu tự đánh giá rèn luyện
- Điểm nền 100, trừ theo số lần vi phạm, cộng điểm thưởng.
- Có nhóm lỗi nghiêm trọng dẫn tới xếp loại “Chưa đạt”.
- Dashboard realtime hiển thị điểm và xếp loại.
- Nộp phiếu, duyệt phiếu, in phiếu.

### 6) Báo cáo & xuất dữ liệu
- Báo cáo danh sách học sinh.
- Báo cáo thi đua theo tuần/tháng/học kỳ.
- Xuất Excel và in ấn.

### 7) Ổn định dữ liệu
- Đồng bộ realtime với Firestore.
- Lưu dự phòng cục bộ IndexedDB.
- Backup/Restore JSON.

---

## Công nghệ sử dụng

- **HTML**
- **CSS**
- **JavaScript thuần (Vanilla JS)**

Thư viện/CDN đang dùng trong giao diện:
- TailwindCSS (CDN)
- Lucide Icons
- SheetJS (xlsx)

---

## Cấu trúc dự án

```text
PDH2026/
├─ Index.html      # Giao diện chính
├─ script.js       # Logic nghiệp vụ chính
├─ style.css       # CSS tùy biến
└─ (các file cấu hình/asset khác nếu có)
```

---

## Yêu cầu môi trường

- Trình duyệt hiện đại (Chrome/Edge/Firefox mới).
- Có kết nối Internet để tải CDN và kết nối Firebase.
- Không yêu cầu Node.js/npm khi chạy bản tĩnh.

---

## Hướng dẫn chạy local

Vì dự án là web tĩnh, có thể chạy nhanh bằng một local server:

### Cách 1: VS Code + Live Server
1. Mở thư mục dự án bằng VS Code.
2. Cài extension **Live Server**.
3. Click phải `Index.html` → **Open with Live Server**.

### Cách 2: Python HTTP server
```bash
python -m http.server 5500
```
Truy cập: `http://localhost:5500`

> Khuyến nghị chạy qua HTTP server thay vì mở trực tiếp `file://`.

---

## Hướng dẫn cấu hình Firebase (CDN, không npm)

Dự án hiện dùng Firebase qua CDN. Bạn có thể chọn **1 trong 2 cách** sau.

---

### Cách A — Firebase Modular CDN (khuyến nghị)

Trong `Index.html`, thêm cấu hình:

```html
<script>
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  };
  window.__firebase_config = firebaseConfig;
</script>
```

Sau đó import Firebase dạng module:

```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
  import {
    getAuth, signInAnonymously, signInWithEmailAndPassword,
    onAuthStateChanged, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail
  } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
  import {
    getFirestore, doc, setDoc, getDoc, collection, onSnapshot,
    getDocs, deleteDoc, updateDoc, query, where, addDoc, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

  // expose cho script.js dùng
  window.FirebaseSDK = {
    initializeApp,
    getAuth, signInAnonymously, signInWithEmailAndPassword,
    onAuthStateChanged, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail,
    getFirestore, doc, setDoc, getDoc, collection, onSnapshot,
    getDocs, deleteDoc, updateDoc, query, where, addDoc, serverTimestamp
  };

  window.dispatchEvent(new Event('firebase-sdk-ready'));
</script>
```

---

### Cách B — Firebase CDN truyền thống (compat)

Nếu không dùng module, có thể dùng bản compat:

```html
<script src="https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.6.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore-compat.js"></script>

<script>
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  };

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
</script>
```

> Lưu ý:
> - Với mô hình hiện tại của dự án, cách A đang phù hợp hơn.
> - Cần cấu hình đúng **Authentication** và **Firestore Rules** trên Firebase Console.

---

## Hướng dẫn Deploy với Netlify (CI/CD từ GitHub)

Mục tiêu: kết nối trực tiếp repo GitHub `DuyHuongHCM/PDH2026` để mỗi lần push code là Netlify tự build/deploy.

### Bước 1: Đăng nhập Netlify
- Truy cập: https://app.netlify.com
- Đăng nhập bằng GitHub (hoặc tài khoản khác).

### Bước 2: Import project từ GitHub
1. Chọn **Add new site** → **Import an existing project**.
2. Chọn **GitHub**.
3. Cấp quyền cho Netlify truy cập repo.
4. Chọn repo: `DuyHuongHCM/PDH2026`.

### Bước 3: Cấu hình build
Vì đây là web tĩnh:
- **Build command**: để trống (hoặc không dùng)
- **Publish directory**: `.` (thư mục gốc chứa `Index.html`)

### Bước 4: Deploy
- Nhấn **Deploy site**.
- Netlify tạo URL dạng `https://your-site-name.netlify.app`.

### Bước 5: Thiết lập auto deploy (CI/CD)
- Mặc định sau khi kết nối GitHub, mỗi lần push lên nhánh production (thường là `main`) Netlify sẽ tự deploy.
- Kiểm tra tại: **Site settings** → **Build & deploy** → **Continuous Deployment**.

### Bước 6 (khuyến nghị): Quản lý cấu hình Firebase
- Nếu muốn ẩn config khỏi mã nguồn, có thể chuyển sang inject bằng build/env (nâng cao).
- Với hiện trạng dự án (CDN + cấu hình trực tiếp), cần đảm bảo Firestore Rules an toàn.

---

## Luồng phân quyền người dùng

- `hocsinh`: tự đánh giá tháng, xem/in phiếu cá nhân.
- `gvcn`: duyệt phiếu lớp chủ nhiệm, quản lý thông tin lớp.
- `giamthi`: nhập vi phạm nhanh, theo dõi sổ vi phạm.
- `bgh`: theo dõi tổng hợp, phê duyệt cấp cao.
- `admin`: toàn quyền cấu hình tài khoản, hệ thống, mã lỗi, dữ liệu.

---

## Sao lưu và khôi phục dữ liệu

- **Backup**: xuất file JSON từ hệ thống.
- **Restore**: nhập lại JSON để phục hồi nhanh.
- Ngoài ra dữ liệu còn:
  - Lưu cục bộ IndexedDB.
  - Đồng bộ Firestore theo `syncChannelCode`.

---

## Định hướng phát triển

- Tách nhỏ `script.js` thành module theo domain (auth, students, violations, evaluations…).
- Bổ sung unit tests cho thuật toán tính điểm rèn luyện.
- Chuẩn hóa i18n và accessibility.
- Tăng cường audit log và versioning dữ liệu.

---

## Giấy phép

Hiện chưa khai báo license chính thức.  
Khuyến nghị thêm file `LICENSE` (MIT hoặc theo quy định đơn vị quản lý).
