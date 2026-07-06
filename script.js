// script.js - Trich xuat tu Index.html

    let students = [];
    let violations = [];
    let evaluations = []; // Lưu danh sách phiếu đánh giá tháng của học sinh

    // Vai trò phân quyền (role từ Firestore /users/{uid})
    // 'admin' | 'bgh' | 'giamthi' | 'gvcn' | 'hocsinh'
    let currentRole = null;
    let loggedInUser = null; // Firestore user profile object
    let staffAuthUser = null; // Firebase Auth user (chỉ dùng cho staff)
    let passcodes = {}; // Legacy: giữ lại để tránh ReferenceError trong IndexedDB cũ

    // Định nghĩa danh mục quy chế lỗi & điểm trừ tự động
    let violationTypes = [
      { id: 'rule_1', name: 'Nói tục, chửi thề, lời lẽ thiếu văn hóa.', points: 5, category: 'Nề nếp', keyword: 'nói tục' },
      { id: 'rule_2', name: 'Không thực hiện theo yêu cầu của giáo viên/giám thị liên quan rèn luyện học sinh.', points: 10, category: 'Học tập', keyword: 'không thực hiện' },
      { id: 'rule_3', name: 'Vô lễ, xúc phạm cán bộ, giáo viên, nhân viên.', points: 15, category: 'Đạo đức', keyword: 'vô lễ' },
      { id: 'rule_4', name: 'Xúc phạm nhân phẩm, danh dự bạn bè. Gây mất đoàn kết trong/ngoài trường.', points: 15, category: 'Đạo đức', keyword: 'xúc phạm' },
      { id: 'rule_5', name: 'Có hành vi, thái độ phản cảm, mất trật tự trường học.', points: 15, category: 'Nề nếp', keyword: 'phản cảm' },
      { id: 'rule_6', name: 'Mặc đồng phục, tác phong không đúng quy định.', points: 5, category: 'Đồng phục', keyword: 'đồng phục' },
      { id: 'rule_7', name: 'Bỏ rác không đúng quy định. Hộc bàn, chỗ đứng xếp hàng có rác.', points: 2, category: 'Nề nếp', keyword: 'bỏ rác' },
      { id: 'rule_8', name: 'Mang chất gây nghiện (thuốc lá, rượu bia...) nhưng chưa sử dụng.', points: 20, category: 'Đạo đức', keyword: 'chất gây nghiện' },
      { id: 'rule_9', name: 'Vắng không phép hoặc đi trễ không xin giấy.', points: 5, category: 'Chuyên cần', keyword: 'vắng không phép' },
      { id: 'rule_10', name: 'Sử dụng điện thoại không được sự cho phép của giáo viên.', points: 20, category: 'Nề nếp', keyword: 'điện thoại' },
      { id: 'rule_11', name: 'Không xếp hàng, trốn giờ chơi ở hộc bàn/nhà vệ sinh.', points: 5, category: 'Nề nếp', keyword: 'không xếp hàng' },
      { id: 'rule_12', name: 'Phá hoại tài sản trường lớp; viết, vẽ lên bàn, lên tường.', points: 10, category: 'Nề nếp', keyword: 'phá hoại' },
      { id: 'rule_13', name: 'Mang vật dụng không phục vụ học tập (đồ nguy hiểm...).', points: 5, category: 'Nề nếp', keyword: 'mang vật dụng' },
      { id: 'rule_14', name: 'Mang trà sữa, nước ngọt, đồ có ga vào lớp học.', points: 2, category: 'Nề nếp', keyword: 'mang trà sữa' }
    ];

    // Cấu hình phiếu tự đánh giá hàng tháng (theo Phieu_danh_gia_ren_luyen.docx)
    const EVAL_RULES = {
      section1: [
        { id: 's1_1', name: 'Nói tục, chửi thề, lời lẽ thiếu văn hóa.', points: 5, label: '-5đ', keywords: ['nói tục', 'chửi thề', 'văn hóa'] },
        { id: 's1_2', name: 'Không thực hiện theo yêu cầu của giáo viên/giám thị có liên quan đến việc học tập, rèn luyện của học sinh.', points: 10, label: '-10đ', keywords: ['không thực hiện', 'yêu cầu của giáo viên'] },
        { id: 's1_3', name: 'Vô lễ, xúc phạm cán bộ, giáo viên, nhân viên (có cơ sở).', points: 15, label: '-15đ', keywords: ['vô lễ', 'xúc phạm cán bộ'] },
        { id: 's1_4', name: 'Xúc phạm nhân phẩm, danh dự bạn bè. Gây mất đoàn kết trong và ngoài trường kể cả trên mạng xã hội.', points: 15, label: '-15đ', keywords: ['danh dự bạn bè', 'mất đoàn kết'] },
        { id: 's1_5', name: 'Có hành vi, thái độ phản cảm, không phù hợp môi trường học đường. Gây sự chú ý, mất trật tự.', points: 15, label: '-15đ', keywords: ['phản cảm', 'gây sự chú ý'] },
        { id: 's1_6', name: 'Mặc đồng phục, tác phong không đúng quy định.', points: 5, label: '-5đ', keywords: ['đồng phục', 'tác phong', 'phù hiệu', 'bảng tên'] },
        { id: 's1_7', name: 'Bỏ rác không đúng nơi quy định. Hộc bàn, chỗ ngồi, chỗ đứng xếp hàng có rác.', points: 2, label: '-2đ', keywords: ['bỏ rác', 'hộc bàn có rác'] },
        { id: 's1_8', name: 'Mang chất gây nghiện (thuốc lá, đồ uống có cồn, chất kích thích...) nhưng chưa sử dụng.', points: 20, label: '-20đ', keywords: ['mang chất gây nghiện'] },
        { id: 's1_9', name: 'Vắng không phép hoặc đi trễ không trình giám thị hoặc không có giấy vào lớp.', points: 5, label: '-5đ', keywords: ['vắng không phép', 'không có giấy vào lớp'] },
        { id: 's1_10', name: 'Đi trễ có giấy vào lớp. (01 - 03 lần: -1đ/lần; từ lần thứ 04 trở đi: -5đ/lần)', points: 1, label: '-1đ hoặc -5đ', isDynamic: true, keywords: ['đi trễ có giấy', 'đi học muộn'] },
        { id: 's1_11', name: 'Sử dụng điện thoại không có sự cho phép của giáo viên.', points: 20, label: '-20đ', keywords: ['sử dụng điện thoại'] },
        { id: 's1_12', name: 'Không xếp hàng, không xuống sân giờ chơi. Trốn ở lớp, phòng chức năng, nhà vệ sinh…', points: 5, label: '-5đ', keywords: ['không xếp hàng', 'trốn ở lớp'] },
        { id: 's1_13', name: 'Phá hoại tài sản trường/lớp; viết, vẽ lên bàn, lên tường. (Yêu cầu phục hồi hiện trạng)', points: 10, label: '-10đ', keywords: ['phá hoại', 'viết vẽ lên bàn'] },
        { id: 's1_14', name: 'Mang vật dụng không phục vụ học tập (vật nguy hiểm, đồ cồng kềnh...).', points: 5, label: '-5đ', keywords: ['không phục vụ học tập', 'vật nguy hiểm'] },
        { id: 's1_15', name: 'Mang trà sữa, nước ngọt, thức uống có ga vào lớp học (trừ nước suối).', points: 2, label: '-2đ', keywords: ['trà sữa', 'nước ngọt', 'đồ uống có ga'] }
      ],
      section2: [
        { id: 's2_1', name: 'Gây gổ đánh nhau trong và ngoài nhà trường.', score: 'Chưa đạt', keywords: ['đánh nhau', 'gây gổ'] },
        { id: 's2_2', name: 'Leo trèo lên bàn ghế, lan can…', score: 'Chưa đạt', keywords: ['leo trèo', 'lan can'] },
        { id: 's2_3', name: 'Trốn ra khỏi cổng trường.', score: 'Chưa đạt', keywords: ['trốn ra khỏi cổng'] },
        { id: 's2_4', name: 'Sử dụng chất gây nghiện (thuốc lá, rượu bia, chất kích thích...).', score: 'Chưa đạt', keywords: ['sử dụng chất gây nghiện', 'hút thuốc'] },
        { id: 's2_5', name: 'Tổ chức, tham gia các trò chơi mang tính chất cờ bạc, cá độ ăn tiền.', score: 'Chưa đạt', keywords: ['cờ bạc', 'cá độ'] },
        { id: 's2_6', name: 'Lấy cắp tài sản.', score: 'Chưa đạt', keywords: ['lấy cắp', 'trộm đồ'] },
        { id: 's2_7', name: 'Gian lận trong các kỳ kiểm tra.', score: 'Chưa đạt', keywords: ['gian lận', 'quay cóp'] },
        { id: 's2_8', name: 'Vi phạm an toàn giao thông.', score: 'Chưa đạt', keywords: ['an toàn giao thông', 'xe máy'] }
      ]
    };

    let currentGradeFilter = 0;
    let currentWorkbook = null;
    let currentRows = [];
    
    let searchLimit = 40; 
    let filteredCache = [];

    // State indications
    let isCloudMode = false;
    let db = null;
    let auth = null;
    let userId = null;
    const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

    let confirmCallback = null;
    let syncUnsubscribe = null;
    let syncChannelCode = localStorage.getItem("find_hs_sync_channel") || "PDH_2026";

    // Dynamic cache active review sheet
    let activeApprovedId = null;
    
    // Track auto-filled violations to lock inputs
    let autoFilledViolations = { sec1: {}, sec2: {} };

    // ----------------------------------------------------
    // LOCAL STORAGE FOR HIGH STABILITY (INDEXEDDB)
    // ----------------------------------------------------
    const DB_NAME = "PDH_Emulation_SelfEval_DB";
    const STORE_NAME = "main_state";

    function getLocalDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(req.error);
      });
    }

    async function setLocalItem(key, val) {
      try {
        const db = await getLocalDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(val, key);
      } catch (err) { console.warn("IndexedDB Write Warn:", err); }
    }

    async function getLocalItem(key) {
      try {
        const db = await getLocalDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
      } catch (e) { return null; }
    }

    // ----------------------------------------------------
    // FIREBASE SYNC CONTROLLER (RULE 1, 2, 3 COMPLIANCE)
    // ----------------------------------------------------
    async function initFirebase() {
      const modeText = document.getElementById('system-mode-text');
      await loadFromLocalIndexedDB();

      if (typeof window.FirebaseSDK === 'undefined' || typeof window.__firebase_config === 'undefined' || !window.__firebase_config) {
        isCloudMode = false;
        if (modeText) modeText.innerHTML = `<span class="text-amber-400 font-bold flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span> Ngoại tuyến</span>`;
        initGlobalDropdowns();
        return;
      }

      try {
        let firebaseConfig = typeof window.__firebase_config === 'string' ? JSON.parse(window.__firebase_config) : window.__firebase_config;
        const app = window.FirebaseSDK.initializeApp(firebaseConfig);
        auth = window.FirebaseSDK.getAuth(app);
        db = window.FirebaseSDK.getFirestore(app);

        // Lắng nghe thay đổi trạng thái auth
        window.FirebaseSDK.onAuthStateChanged(auth, async (user) => {
          if (user) {
            userId = user.uid;

            if (user.isAnonymous) {
              // Anonymous session: chỉ dùng để sync dữ liệu, không route
              isCloudMode = true;
              if (modeText) modeText.innerHTML = `<span class="text-sky-400 font-bold flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9] animate-pulse"></span> Đám mây (${syncChannelCode})</span>`;
              startRealtimeSync();
              initGlobalDropdowns();
            } else {
              // Email/Password authenticated staff
              staffAuthUser = user;
              isCloudMode = true;
              if (modeText) modeText.innerHTML = `<span class="text-sky-400 font-bold flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9] animate-pulse"></span> Đám mây (${syncChannelCode})</span>`;
              startRealtimeSync();

              // Chỉ route nếu chưa đăng nhập (tránh route lại khi dữ liệu sync cập nhật)
              if (!loggedInUser) {
                const profile = await fetchUserProfile(user.uid);
                if (profile) {
                  routeByRole(profile);
                } else {
                  showToast('❌ Tài khoản chưa được cấu hình trong hệ thống! Liên hệ Admin.');
                  await window.FirebaseSDK.signOut(auth);
                  await window.FirebaseSDK.signInAnonymously(auth);
                }
              }
            }
          }
        });

        // Khởi động bằng anonymous auth để đọc dữ liệu trường (không cần tài khoản)
        await window.FirebaseSDK.signInAnonymously(auth);

      } catch (err) {
        isCloudMode = false;
        if (modeText) modeText.innerHTML = `<span class="text-amber-400 font-bold text-xs flex items-center gap-1"><i data-lucide="wifi-off" class="w-3.5 h-3.5"></i> Offline</span>`;
        initGlobalDropdowns();
        console.warn("Firebase Init fallback:", err);
      }
    }

    function startRealtimeSync() {
      if (!db || !isCloudMode) return;
      if (syncUnsubscribe) syncUnsubscribe();

      // Rule 1: Strict paths
      const docRef = window.FirebaseSDK.doc(db, 'artifacts', appId, 'public', 'data', 'emulation_saves', syncChannelCode);
      
      syncUnsubscribe = window.FirebaseSDK.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.updatedAt) {
            let hasChanged = false;
            
            if (JSON.stringify(students) !== JSON.stringify(data.students || [])) {
              students = data.students || [];
              precalculateKeys(students);
              hasChanged = true;
            }
            if (JSON.stringify(violations) !== JSON.stringify(data.violations || [])) {
              violations = data.violations || [];
              hasChanged = true;
            }
            if (JSON.stringify(violationTypes) !== JSON.stringify(data.violationTypes || [])) {
              violationTypes = data.violationTypes || [];
              hasChanged = true;
            }
            if (JSON.stringify(evaluations) !== JSON.stringify(data.evaluations || [])) {
              evaluations = data.evaluations || [];
              hasChanged = true;
            }
            // passcodes không còn được dùng trong hệ thống mới (Firebase Auth)

            if (hasChanged) {
              updateStats();
              doSearch(document.getElementById('search-input')?.value || '');
              initGlobalDropdowns();
              renderRules();
              renderViolationLogs();
              renderEvaluationsList();
              generateReportPreview();
              populateLoginDropdowns();
              lucide.createIcons();
            }
          }
        } else {
          if (students.length > 0) saveAutosaveToCloud();
        }
      }, (err) => {
        console.error("Realtime connection error:", err);
      });
    }

    async function loadFromLocalIndexedDB() {
      try {
        const stored = await getLocalItem("autosave_state_emu_v3");
        if (stored) {
          students = stored.students || [];
          violations = stored.violations || [];
          violationTypes = stored.violationTypes || violationTypes;
          evaluations = stored.evaluations || [];
          // passcodes không còn nạp từ IndexedDB
          
          precalculateKeys(students);
          updateStats();
          renderRules();
          renderViolationLogs();
          populateLoginDropdowns();
        }
      } catch (e) { console.error("Local load failed:", e); }
    }

    async function saveAutosaveToCloud() {
      const nowStr = new Date().toISOString();
      const cleanStudents = students.map(s => {
        const { sortKey, nameLower, nameClean, classLower, phoneClean, phone2Clean, grade, ...rest } = s;
        return rest;
      });

      try {
        await setLocalItem("autosave_state_emu_v3", {
          students: cleanStudents,
          violations: violations,
          violationTypes: violationTypes,
          evaluations: evaluations,
          updatedAt: nowStr
        });
      } catch (e) { console.error("IndexedDB backup error:", e); }

      if (!isCloudMode || !db) return;
      try {
        const docRef = window.FirebaseSDK.doc(db, 'artifacts', appId, 'public', 'data', 'emulation_saves', syncChannelCode);
        await window.FirebaseSDK.setDoc(docRef, {
          students: cleanStudents,
          violations: violations,
          violationTypes: violationTypes,
          evaluations: evaluations,
          updatedAt: nowStr
        });
      } catch (err) { console.error("Cloud write rejected:", err); }
    }

    // ====================================================
    // NEW AUTH SYSTEM: LOGIN PORTAL & ROLE ROUTING
    // ====================================================

    // Switch login mode tab (student / staff)
    function setLoginMode(mode) {
      const studentForm = document.getElementById('form-student');
      const staffForm = document.getElementById('form-staff');
      const btnStudent = document.getElementById('btn-mode-student');
      const btnStaff = document.getElementById('btn-mode-staff');
      if (!studentForm || !staffForm) return;

      if (mode === 'student') {
        studentForm.classList.remove('hidden');
        staffForm.classList.add('hidden');
        btnStudent.className = "flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 bg-sky-600 text-white shadow-md flex items-center justify-center gap-1.5";
        btnStaff.className = "flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5";
        const loginError = document.getElementById('login-error');
        if (loginError) loginError.classList.add('hidden');
      } else {
        staffForm.classList.remove('hidden');
        studentForm.classList.add('hidden');
        btnStaff.className = "flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 bg-indigo-600 text-white shadow-md flex items-center justify-center gap-1.5";
        btnStudent.className = "flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5";
      }
      lucide.createIcons();
    }

    // Đăng nhập học sinh bằng mã định danh 10 số
    function handleStudentLogin() {
      const idInput = document.getElementById('login-student-id').value.trim();
      if (!idInput) { showToast('❌ Vui lòng nhập Mã định danh!'); return; }
      if (students.length === 0) {
        showToast('❌ Hệ thống chưa nạp danh sách học sinh. Liên hệ giáo viên quản trị.');
        return;
      }
      const match = students.find(s => String(s.studentId).trim() === idInput);
      if (!match) { showToast('❌ Mã định danh không tồn tại trong hệ thống!'); return; }
      currentRole = 'hocsinh';
      loggedInUser = { ...match, role: 'hocsinh', displayName: match.name };
      enterApplication();
    }

    // Đăng nhập giáo viên/BGH/Admin bằng Firebase Email/Password Auth
    async function handleStaffLogin() {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const loginError = document.getElementById('login-error');
      const loginLoading = document.getElementById('login-loading');
      const btn = document.getElementById('btn-staff-login');

      if (!email || !password) {
        showLoginError('Vui lòng nhập đầy đủ email và mật khẩu!'); return;
      }
      if (!auth) {
        showLoginError('Hệ thống chưa kết nối Firebase. Vui lòng tải lại trang.'); return;
      }

      if (loginError) loginError.classList.add('hidden');
      if (loginLoading) loginLoading.classList.remove('hidden');
      if (btn) btn.disabled = true;

      try {
        await window.FirebaseSDK.signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged sẽ xử lý routing sau khi xác thực thành công
      } catch (err) {
        let msg = 'Email hoặc mật khẩu không chính xác!';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = 'Tài khoản không tồn tại hoặc mật khẩu sai!';
        else if (err.code === 'auth/wrong-password') msg = 'Mật khẩu không chính xác!';
        else if (err.code === 'auth/too-many-requests') msg = 'Đăng nhập quá nhiều lần. Vui lòng thử lại sau!';
        else if (err.code === 'auth/network-request-failed') msg = 'Lỗi kết nối mạng!';
        else if (err.code === 'auth/invalid-email') msg = 'Địa chỉ email không hợp lệ!';
        showLoginError(msg);
      } finally {
        if (loginLoading) loginLoading.classList.add('hidden');
        if (btn) btn.disabled = false;
      }
    }

    function showLoginError(msg) {
      const loginError = document.getElementById('login-error');
      const loginErrorMsg = document.getElementById('login-error-msg');
      if (loginError && loginErrorMsg) {
        loginErrorMsg.textContent = msg;
        loginError.classList.remove('hidden');
      } else { showToast('❌ ' + msg); }
    }

    // Gửi email đặt lại mật khẩu cho chức năng Quên mật khẩu
    async function handleForgotPassword() {
      const email = document.getElementById('login-email').value.trim();
      if (!email) {
        showLoginError('Vui lòng nhập địa chỉ email vào ô Email đăng nhập trước!');
        document.getElementById('login-email').focus();
        return;
      }
      if (!auth) {
        showLoginError('Hệ thống chưa kết nối Firebase. Vui lòng tải lại trang.');
        return;
      }

      // Disable button nếu có
      const forgotBtn = document.querySelector('[onclick="handleForgotPassword()"]');
      if (forgotBtn) forgotBtn.disabled = true;

      try {
        // Firebase v9 Modular — gọi qua window.FirebaseSDK (proxy từ import)
        await window.FirebaseSDK.sendPasswordResetEmail(auth, email);
        showToast(`✓ Link đặt lại mật khẩu đã gửi tới ${email}. Vui lòng kiểm tra hộp thư!`);
        console.log('[Auth] Password reset email sent to:', email);
      } catch (err) {
        // Xử lý mã lỗi Firebase Auth chi tiết để chẩn đoán
        let userMsg = 'Đã xảy ra lỗi. Vui lòng thử lại sau!';
        let debugInfo = `[Auth Error] code=${err.code} | msg=${err.message}`;

        switch (err.code) {
          case 'auth/user-not-found':
            userMsg = 'Không tìm thấy tài khoản với email này trong hệ thống!';
            break;
          case 'auth/invalid-email':
            userMsg = 'Địa chỉ email không hợp lệ!';
            break;
          case 'auth/too-many-requests':
            userMsg = 'Quá nhiều yêu cầu. Vui lòng đợi vài phút và thử lại!';
            break;
          case 'auth/network-request-failed':
            userMsg = 'Lỗi kết nối mạng. Kiểm tra internet và thử lại!';
            break;
          case 'auth/missing-android-pkg-name':
          case 'auth/missing-continue-uri':
          case 'auth/unauthorized-continue-uri':
            userMsg = 'Cấu hình Firebase Console chưa được thiết lập đúng cho tính năng này.';
            debugInfo += ' | Kiểm tra: Authentication > Templates > Password reset > Action URL.';
            break;
          default:
            userMsg = `Lỗi: ${err.message}`;
        }

        console.error(debugInfo);
        showLoginError(userMsg); // Hiển thị trong UI đăng nhập (không dùng alert)
      } finally {
        if (forgotBtn) forgotBtn.disabled = false;
      }
    }

    // Trả về user profile từ Firestore /users/{uid}
    async function fetchUserProfile(uid) {
      if (!db) return null;
      try {
        const docRef = window.FirebaseSDK.doc(db, 'users', uid);
        const docSnap = await window.FirebaseSDK.getDoc(docRef);
        if (docSnap.exists()) return { uid, ...docSnap.data() };
        return null;
      } catch (err) {
        console.error('Error fetching user profile:', err);
        return null;
      }
    }

    // Điều hướng giao diện sau khi xác thực
    function routeByRole(userProfile) {
      currentRole = userProfile.role;
      loggedInUser = userProfile;
      enterApplication();
    }

    // ----- Legacy aliases (giữ tương thích nếu HTML cũ còn tồn tại) -----
    function loginAsStudent() { handleStudentLogin(); }
    function loginAsTeacher() { handleStaffLogin(); }

    // Toggle hiển/ẩn mật khẩu
    function togglePasswordVisibility(inputId) {
      const input = document.getElementById(inputId);
      const icon = document.getElementById(inputId + '-eye');
      if (!input || !icon) return;

      if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
      } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
      }
      lucide.createIcons();
    }

    // Cập nhật lookupStudentById cho UI mới (chỉ hiển thị result box)
    function lookupStudentById(val) {
      const idInput = val.trim();
      const resultBox = document.getElementById('student-lookup-result');
      const nameDisplay = document.getElementById('login-display-name');
      const classDisplay = document.getElementById('login-display-class');

      if (!idInput || idInput.length < 10) {
        if (resultBox) resultBox.classList.add('hidden');
        return;
      }
      const match = students.find(s => String(s.studentId).trim() === idInput);
      if (match) {
        if (nameDisplay) nameDisplay.textContent = match.name;
        if (classDisplay) classDisplay.textContent = match.class;
        if (resultBox) resultBox.classList.remove('hidden');
      } else {
        if (resultBox) resultBox.classList.add('hidden');
      }
    }

    function enterApplication() {
      document.getElementById('login-portal').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');

      // Setup user identity badge theo role mới
      const badge = document.getElementById('user-badge');
      const roleLabels = {
        'hocsinh':  { text: `HS: ${loggedInUser?.name || ''} (${loggedInUser?.class || ''})`, cls: 'bg-sky-600' },
        'gvcn':     { text: `GVCN: ${loggedInUser?.displayName || ''} — Lớp ${loggedInUser?.assignedClass || ''}`, cls: 'bg-emerald-600' },
        'giamthi':  { text: `GIÁM THỊ: ${loggedInUser?.displayName || ''}`, cls: 'bg-teal-600' },
        'bgh':      { text: `BGH: ${loggedInUser?.displayName || ''}`, cls: 'bg-purple-600' },
        'admin':    { text: `ADMIN: ${loggedInUser?.displayName || loggedInUser?.email || ''}`, cls: 'bg-rose-700' },
      };
      const rl = roleLabels[currentRole] || { text: currentRole, cls: 'bg-slate-600' };
      if (badge) {
        badge.textContent = rl.text;
        badge.className = `${rl.cls} px-3 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-wide shadow-md`;
      }

      buildRoleTabs();
      lucide.createIcons();
    }

    // Đăng xuất — gọi Firebase signOut cho staff, reset UI
    async function logOut() {
      try {
        if (auth && currentRole !== 'hocsinh' && staffAuthUser) {
          await window.FirebaseSDK.signOut(auth);
          staffAuthUser = null;
          // Re-init anonymous auth để giữ kết nối Firestore
          await window.FirebaseSDK.signInAnonymously(auth);
        }
      } catch (e) { console.warn('Sign out error:', e); }

      currentRole = null;
      loggedInUser = null;

      document.getElementById('app').classList.add('hidden');
      document.getElementById('login-portal').classList.remove('hidden');

      // Reset student form
      const sid = document.getElementById('login-student-id');
      if (sid) { sid.value = ''; sid.type = 'password'; }
      const eyeIcon = document.getElementById('login-student-id-eye');
      if (eyeIcon) { eyeIcon.setAttribute('data-lucide', 'eye'); }
      const resultBox = document.getElementById('student-lookup-result');
      if (resultBox) resultBox.classList.add('hidden');

      // Reset staff form
      const emailEl = document.getElementById('login-email');
      const passEl = document.getElementById('login-password');
      if (emailEl) emailEl.value = '';
      if (passEl) { passEl.value = ''; passEl.type = 'password'; }
      const loginError = document.getElementById('login-error');
      if (loginError) loginError.classList.add('hidden');
      const passEyeIcon = document.getElementById('login-password-eye');
      if (passEyeIcon) { passEyeIcon.setAttribute('data-lucide', 'eye'); }

      lucide.createIcons();
    }

    // Dynamic tabs navigation generator based on permission levels (5 role)
    function buildRoleTabs() {
      const nav = document.getElementById('app-nav');
      nav.innerHTML = '';

      // Ẩn tất cả panel trước
      ['panel-admin','panel-giamthi','panel-student-self','panel-approval',
       'panel-import','panel-search','panel-logs','panel-report','panel-rules']
        .forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });

      if (currentRole === 'hocsinh') {
        nav.innerHTML = `
          <button onclick="switchTab('student-self')" id="tab-student-self"
            class="flex-1 py-4 px-6 text-sm font-bold text-sky-400 border-b-2 border-sky-400 transition flex items-center justify-center whitespace-nowrap bg-slate-800/80">
            <i data-lucide="clipboard-signature" class="inline w-5 h-5 mr-2"></i>Tự Đánh Giá Rèn Luyện
          </button>`;
        switchTab('student-self');

      } else if (currentRole === 'giamthi') {
        const tabs = [
          { id: 'giamthi', name: 'Ghi Vi Phạm Nhanh', icon: 'zap' },
          { id: 'logs',    name: 'Sổ Vi Phạm',       icon: 'history' },
          { id: 'search',  name: 'Tra Cứu HS',       icon: 'search' },
        ];
        _renderTabs(nav, tabs, 'rose');
        switchTab(tabs[0].id);

      } else if (currentRole === 'gvcn') {
        const tabs = [
          { id: 'approval', name: 'Duyệt Đánh Giá', icon: 'check-square' },
          { id: 'class-manage', name: 'Quản Lý Lớp Phụ Trách', icon: 'users' },
          { id: 'logs',     name: 'Sổ Vi Phạm',    icon: 'history' },
          { id: 'search',   name: 'Tra Cứu HS',    icon: 'search' },
        ];
        _renderTabs(nav, tabs, 'emerald');
        switchTab(tabs[0].id);

      } else if (currentRole === 'bgh') {
        const tabs = [
          { id: 'approval', name: 'Duyệt Đánh Giá',      icon: 'check-square' },
          { id: 'report',   name: 'Báo Cáo & Thi Đua', icon: 'award' },
          { id: 'search',   name: 'Tra Cứu HS',       icon: 'search' },
          { id: 'logs',     name: 'Sổ Vi Phạm',       icon: 'history' },
        ];
        _renderTabs(nav, tabs, 'purple');
        switchTab(tabs[0].id);

      } else if (currentRole === 'admin') {
        const tabs = [
          { id: 'admin',    name: 'Quản Trị Tài Khoản', icon: 'users-round' },
          { id: 'approval', name: 'Duyệt Đánh Giá',       icon: 'check-square' },
          { id: 'search',   name: 'Tra Cứu HS',        icon: 'search' },
          { id: 'logs',     name: 'Sổ Vi Phạm',        icon: 'history' },
          { id: 'report',   name: 'Báo Cáo & Thi Đua',  icon: 'award' },
          { id: 'rules',    name: 'Mã Lỗi',             icon: 'shield-alert' },
          { id: 'import',   name: 'Hệ Thống',           icon: 'settings' },
        ];
        _renderTabs(nav, tabs, 'rose');
        switchTab(tabs[0].id);
        // Load danh sách user ngay khi vào admin panel
        setTimeout(renderAdminUserList, 200);
      }

      lucide.createIcons();
    }

    function _renderTabs(nav, tabs, color) {
      const activeClass = `text-${color}-400 border-b-2 border-${color}-400 bg-slate-800/80`;
      nav.innerHTML = tabs.map((t, idx) => `
        <button onclick="switchTab('${t.id}')" id="tab-${t.id}"
          class="flex-1 min-w-[110px] py-3.5 px-4 text-xs font-bold ${
            idx === 0
              ? `text-${color}-400 border-b-2 border-${color}-400 bg-slate-800/80`
              : 'text-slate-400 border-b-2 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
          } transition-all flex items-center justify-center whitespace-nowrap">
          <i data-lucide="${t.icon}" class="inline w-4 h-4 mr-1.5"></i>${t.name}
        </button>`).join('');
    }

    // ====================================================
    // ADMIN PANEL: QUẢN TRỊ TÀI KHOẢN NHÂN SỰ
    // ====================================================

    // Lấy danh sách lớp học duy nhất từ students
    function getUniqueClasses() {
      return [...new Set(students.map(s => s.class).filter(Boolean))].sort();
    }

    // Lấy class filter cho GVCN (chỉ thấy lớp mình)
    function getEffectiveClassFilter() {
      if (currentRole === 'gvcn' && loggedInUser?.assignedClass) {
        return loggedInUser.assignedClass;
      }
      return null; // null = xem tất cả
    }

    async function renderAdminUserList() {
      if (!db) return;
      const tbody = document.getElementById('admin-users-tbody');
      const emptyView = document.getElementById('admin-users-empty');
      const tableWrap = document.getElementById('admin-users-table-wrap');
      const loading = document.getElementById('admin-users-loading');
      if (!tbody) return;

      try {
        const usersRef = window.FirebaseSDK.collection(db, 'users');
        const snap = await window.FirebaseSDK.getDocs(usersRef);
        const usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (loading) loading.classList.add('hidden');

        if (usersList.length === 0) {
          if (emptyView) emptyView.classList.remove('hidden');
          if (tableWrap) tableWrap.classList.add('hidden');
          return;
        }

        if (emptyView) emptyView.classList.add('hidden');
        if (tableWrap) tableWrap.classList.remove('hidden');

        const roleNames = { admin: 'Admin', bgh: 'BGH', giamthi: 'Giám thị', gvcn: 'GVCN' };
        const roleColors = { admin: 'bg-rose-700', bgh: 'bg-purple-700', giamthi: 'bg-teal-700', gvcn: 'bg-emerald-700' };

        tbody.innerHTML = usersList.map(u => `
          <tr class="hover:bg-slate-750 transition-colors">
            <td class="py-3 px-4 font-semibold text-slate-100">${u.displayName || '—'}</td>
            <td class="py-3 px-4 text-slate-400">${u.email || '—'}</td>
            <td class="py-3 px-3 text-center">
              <span class="${roleColors[u.role] || 'bg-slate-700'} text-white text-[10px] font-bold px-2 py-1 rounded-full">
                ${roleNames[u.role] || u.role}
              </span>
            </td>
            <td class="py-3 px-3 text-center text-slate-400">${u.assignedClass || '—'}</td>
            <td class="py-3 px-3 text-center text-slate-350">${u.note || '—'}</td>
            <td class="py-3 px-3 text-center">
              <span class="${u.isActive !== false ? 'text-emerald-400' : 'text-rose-400'} font-bold text-xs">
                ${u.isActive !== false ? 'Hoạt động' : 'Đã khóa'}
              </span>
            </td>
            <td class="py-3 px-3 text-center">
              <div class="flex items-center justify-center gap-1.5">
                <button onclick="adminSendPasswordReset('${u.email}')"
                  class="bg-sky-700 hover:bg-sky-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold transition" title="Gửi email đặt lại mật khẩu">
                  <i data-lucide="mail" class="w-3 h-3"></i>
                </button>
                <button onclick="adminToggleUserStatus('${u.id}', ${u.isActive !== false})"
                  class="${u.isActive !== false ? 'bg-rose-800 hover:bg-rose-700' : 'bg-emerald-800 hover:bg-emerald-700'} text-white px-2 py-1 rounded-lg text-[10px] font-bold transition">
                  ${u.isActive !== false ? 'Khóa' : 'Mở'}
                </button>
              </div>
            </td>
          </tr>
        `).join('');

        lucide.createIcons();
      } catch (err) {
        console.error('Error loading users:', err);
        if (loading) loading.innerHTML = '<p class="text-rose-400 text-xs text-center py-4">Lỗi tải danh sách tài khoản. Kiểm tra quyền Firestore.</p>';
      }
    }

    function openCreateUserModal() {
      // Điền danh sách lớp vào select
      const classSelect = document.getElementById('new-user-class');
      if (classSelect) {
        const classes = getUniqueClasses();
        classSelect.innerHTML = '<option value="">-- Chọn lớp --</option>' +
          classes.map(c => `<option value="${c}">${c}</option>`).join('');
      }
      const errEl = document.getElementById('create-user-error');
      if (errEl) errEl.classList.add('hidden');
      // Reset fields
      ['new-user-name','new-user-email','new-user-password','new-user-note'].forEach(id => {
        const el = document.getElementById(id); if(el) el.value = '';
      });
      document.getElementById('create-user-modal').classList.remove('hidden');
      onNewUserRoleChange();
    }

    function closeCreateUserModal() {
      document.getElementById('create-user-modal').classList.add('hidden');
    }

    function onNewUserRoleChange() {
      const role = document.getElementById('new-user-role').value;
      const classWrap = document.getElementById('new-user-class-wrap');
      if (classWrap) {
        classWrap.style.display = role === 'gvcn' ? '' : 'none';
      }
    }

    async function adminCreateUser() {
      const name = document.getElementById('new-user-name').value.trim();
      const email = document.getElementById('new-user-email').value.trim();
      let password = document.getElementById('new-user-password').value;
      const role = document.getElementById('new-user-role').value;
      const assignedClass = document.getElementById('new-user-class')?.value || null;
      const note = document.getElementById('new-user-note').value.trim();

      if (!name || !email) {
        showCreateUserError('Vui lòng điền đầy đủ họ tên và email!');
        return;
      }
      if (role === 'gvcn' && !assignedClass) {
        showCreateUserError('GVCN phải chọn lớp chủ nhiệm!');
        return;
      }

      // Tự sinh mật khẩu an toàn ngẫu nhiên nếu để trống (Phù hợp phương thức 2)
      if (!password) {
        password = Math.random().toString(36).slice(-8) + 'P@1';
      }

      const btn = document.getElementById('btn-create-user');
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-t-2 border-white mx-auto"></div>'; }

      try {
        // Tạo secondary Firebase app để không ảnh hưởng session admin
        let firebaseConfig = typeof window.__firebase_config === 'string'
          ? JSON.parse(window.__firebase_config)
          : window.__firebase_config;

        const secondaryApp = window.FirebaseSDK.initializeApp(firebaseConfig, 'secondary-' + Date.now());
        const secondaryAuth = window.FirebaseSDK.getAuth(secondaryApp);

        const cred = await window.FirebaseSDK.createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUid = cred.user.uid;

        // Gửi liên kết thiết lập mật khẩu ngay lập tức bằng secondaryAuth trước khi signOut
        let emailSentSuccessfully = false;
        try {
          await window.FirebaseSDK.sendPasswordResetEmail(secondaryAuth, email);
          emailSentSuccessfully = true;
        } catch (mailErr) {
          console.warn("Auto-send password reset failed using secondaryAuth:", mailErr);
        }

        await window.FirebaseSDK.signOut(secondaryAuth);

        // Lưu profile vào Firestore (lưu cả note)
        const userRef = window.FirebaseSDK.doc(db, 'users', newUid);
        await window.FirebaseSDK.setDoc(userRef, {
          uid: newUid,
          email: email,
          displayName: name,
          role: role,
          assignedClass: role === 'gvcn' ? assignedClass : null,
          note: note || null,
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: loggedInUser?.uid || 'admin'
        });

        if (emailSentSuccessfully) {
          showToast(`✓ Đã tạo và tự động gửi link đặt mật khẩu đến: ${email}`);
        } else {
          showToast(`✓ Đã tạo tài khoản cho ${name} nhưng gặp lỗi gửi email đặt lại mật khẩu tự động.`);
        }

        closeCreateUserModal();
        renderAdminUserList();
      } catch (err) {
        let msg = err.message;
        if (err.code === 'auth/email-already-in-use') msg = 'Email này đã được đăng ký trong hệ thống!';
        else if (err.code === 'auth/weak-password') msg = 'Mật khẩu quá yếu (tối thiểu 6 ký tự)!';
        else if (err.code === 'auth/invalid-email') msg = 'Địa chỉ email không hợp lệ!';
        showCreateUserError(msg);
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Tạo Tài Khoản'; lucide.createIcons(); }
      }
    }

    function showCreateUserError(msg) {
      const errEl = document.getElementById('create-user-error');
      const errMsg = document.getElementById('create-user-error-msg');
      if (errEl && errMsg) { errMsg.textContent = msg; errEl.classList.remove('hidden'); }
    }

    async function adminSendPasswordReset(email) {
      showConfirm(
        'Gửi email đặt lại mật khẩu',
        `Xác nhận gửi email đặt lại mật khẩu đến: ${email}?`,
        async () => {
          try {
            await window.FirebaseSDK.sendPasswordResetEmail(auth, email);
            showToast(`✓ Đã gửi email đặt lại mật khẩu đến ${email}!`);
          } catch (err) {
            showToast(`❌ Lỗi: ${err.message}`);
          }
        }
      );
    }

    async function adminToggleUserStatus(uid, isCurrentlyActive) {
      const action = isCurrentlyActive ? 'khóa' : 'mở khóa';
      showConfirm(
        `Xác nhận ${action} tài khoản`,
        `Bạn muốn ${action} tài khoản này?`,
        async () => {
          try {
            const userRef = window.FirebaseSDK.doc(db, 'users', uid);
            await window.FirebaseSDK.updateDoc(userRef, { isActive: !isCurrentlyActive });
            showToast(`✓ Đã ${action} tài khoản!`);
            renderAdminUserList();
          } catch (err) {
            showToast(`❌ Lỗi: ${err.message}`);
          }
        }
      );
    }

    // ====================================================
    // GIÁM THỊ: TÌM KIẾM HỌC SINH NHANH (MOBILE-FIRST)
    // ====================================================

    function gtSearchStudents(query) {
      const resultsEl = document.getElementById('gt-search-results');
      const emptyEl = document.getElementById('gt-empty-state');
      if (!resultsEl) return;

      const q = query.trim().toLowerCase();
      if (!q || q.length < 2) {
        resultsEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
      }

      if (emptyEl) emptyEl.classList.add('hidden');

      const classFilter = getEffectiveClassFilter();
      const results = students.filter(s => {
        if (classFilter && s.class !== classFilter) return false;
        
        const studentNameLower = (s.name || '').toLowerCase().trim();
        const studentNameClean = removeVietnameseTones(studentNameLower);
        const queryClean = removeVietnameseTones(q);

        const matchName = studentNameLower.endsWith(q) || studentNameClean.endsWith(queryClean);
        const matchClass = (s.class || '').toLowerCase().includes(q);
        const matchId = String(s.studentId || '').toLowerCase().includes(q);

        return matchName || matchClass || matchId;
      }).slice(0, 15);

      if (results.length === 0) {
        resultsEl.innerHTML = `<div class="text-center py-8 text-slate-500 text-sm">Không tìm thấy học sinh nào</div>`;
        return;
      }

      resultsEl.innerHTML = results.map((s, idx) => `
        <div class="flex items-center justify-between bg-slate-900 border border-slate-700 hover:border-rose-500/50 rounded-xl p-4 transition-colors cursor-pointer"
          onclick="gtSelectStudentForViolation(${idx})">
          <div>
            <div class="font-bold text-white text-base leading-tight">${s.name}</div>
            <div class="text-rose-300 text-sm font-semibold mt-0.5">Lớp ${s.class}</div>
            ${s.studentId ? `<div class="text-slate-500 text-xs mt-0.5">Mã: ${s.studentId}</div>` : ''}
          </div>
          <button
            onclick="event.stopPropagation(); openViolationModal(${students.indexOf(s)})"
            class="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95 flex items-center gap-2 shrink-0 giamthi-btn">
            <i data-lucide="zap" class="w-4 h-4"></i> Phạt lỗi
          </button>
        </div>
      `).join('');

      lucide.createIcons();
    }

    function gtSelectStudentForViolation(localIdx) {
      // Tìm trong students array
      const s = students[localIdx];
      if (s) openViolationModal(localIdx);
    }

    // populateLoginDropdowns - giữ lại để tránh lỗi nếu vẫn còn reference
    function populateLoginDropdowns() {}
    function onLoginClassChange() {}


    
    function switchEvalTab(tabId) {
      document.getElementById('eval-tab-sec1').classList.add('hidden');
      document.getElementById('eval-tab-sec2').classList.add('hidden');
      document.getElementById('eval-tab-sec3').classList.add('hidden');
      
      document.getElementById('tab-eval-sec1').className = "flex-1 py-3 px-4 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors";
      document.getElementById('tab-eval-sec2').className = "flex-1 py-3 px-4 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors";
      document.getElementById('tab-eval-sec3').className = "flex-1 py-3 px-4 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors";
      
      document.getElementById(`eval-tab-${tabId}`).classList.remove('hidden');
      document.getElementById(`tab-eval-${tabId}`).className = "flex-1 py-3 px-4 text-xs font-bold border-b-2 border-sky-400 text-sky-400 whitespace-nowrap bg-slate-800/50 transition-colors";
    }

    function buildEvalInputs(section1Counts, section2Checks) {
      const sec1Container = document.getElementById('eval-sec1-container');
      sec1Container.innerHTML = EVAL_RULES.section1.map((item, idx) => {
        const autoCount = autoFilledViolations.sec1[item.id] || 0;
        const currentVal = Math.max(autoCount, section1Counts[item.id] || 0); // User input must be >= autoCount
        
        return `
          <div class="flex items-center justify-between p-3 rounded-lg border ${autoCount > 0 ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900/50 border-slate-700/50'} hover:border-slate-500 transition-colors group">
            <div class="flex-1 pr-4">
              <span class="text-xs text-slate-300 font-medium group-hover:text-slate-100 transition-colors">${idx + 1}. ${item.name}</span>
              ${autoCount > 0 ? `<div class="text-[10px] text-red-400 mt-1 flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Hệ thống khóa ${autoCount} lần vi phạm</div>` : ''}
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-xs font-bold text-rose-400 w-12 text-right">${item.label}</span>
              <input type="number" id="input-${item.id}" min="${autoCount}" value="${currentVal}" oninput="recalculateLiveScore()" class="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-center text-white text-sm font-bold focus:outline-none focus:border-sky-500 transition-colors ${autoCount > 0 ? 'border-red-500/50' : ''}">
            </div>
          </div>
        `;
      }).join('');

      const sec2Container = document.getElementById('eval-sec2-container');
      sec2Container.innerHTML = EVAL_RULES.section2.map((item, idx) => {
        const isAutoChecked = autoFilledViolations.sec2[item.id] || false;
        const isChecked = isAutoChecked || section2Checks[item.id] || false;
        
        return `
          <label class="flex items-start gap-3 p-3 rounded-lg border ${isAutoChecked ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900/50 border-slate-700/50'} cursor-pointer hover:border-slate-500 transition-colors group">
            <input type="checkbox" id="check-${item.id}" onchange="recalculateLiveScore()" ${isChecked ? 'checked' : ''} ${isAutoChecked ? 'disabled' : ''} class="mt-0.5 w-4 h-4 rounded border-slate-600 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 bg-slate-800">
            <div class="flex-1">
              <span class="text-xs text-slate-300 font-medium group-hover:text-slate-100 transition-colors">${idx + 1}. ${item.name}</span>
              ${isAutoChecked ? `<div class="text-[10px] text-red-400 mt-1 flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> Hệ thống đã ghi nhận lỗi này</div>` : ''}
            </div>
          </label>
        `;
      }).join('');
      
      lucide.createIcons();
    }

    function loadStudentEvalForm() {
      if (currentRole !== 'student' || !loggedInUser) return;
      
      const month = document.getElementById('student-eval-month').value;
      const s = loggedInUser;

      // 1. Lọc toàn bộ vi phạm của học sinh này trong tháng được chọn
      const stViolations = violations.filter(v => v.studentName === s.name && v.studentClass === s.class && String(v.month) === String(month));
      
      // Hiển thị lịch sử vi phạm tháng lên UI
      const violContainer = document.getElementById('student-active-violations');
      if (stViolations.length === 0) {
        violContainer.innerHTML = `<div class="text-xs text-emerald-400 font-semibold italic p-2 bg-emerald-950/20 rounded">Không có vi phạm nào bị ghi nhận trong tháng này.</div>`;
      } else {
        violContainer.innerHTML = stViolations.map(v => `
          <div class="bg-red-950/30 border border-red-500/20 p-2.5 rounded-lg flex justify-between items-center mb-1.5">
            <div>
              <span class="font-bold text-red-400 text-xs">${v.ruleName}</span>
              <span class="text-slate-400 text-[10px] block mt-0.5"><i data-lucide="calendar" class="w-3 h-3 inline pb-0.5"></i> ${new Date(v.date).toLocaleDateString('vi-VN')} (Tuần ${v.week})</span>
            </div>
            <strong class="text-red-400 font-black shrink-0 bg-red-500/10 px-2 py-1 rounded">-${v.points}đ</strong>
          </div>
        `).join('');
      }

      // 2. Tính toán lỗi tự động do hệ thống ép buộc
      autoFilledViolations = { sec1: {}, sec2: {} };
      EVAL_RULES.section1.forEach(item => { autoFilledViolations.sec1[item.id] = 0; });
      EVAL_RULES.section2.forEach(item => { autoFilledViolations.sec2[item.id] = false; });

      stViolations.forEach(v => {
        EVAL_RULES.section1.forEach(item => {
          if (item.keywords.some(k => v.ruleName.toLowerCase().includes(k))) {
            autoFilledViolations.sec1[item.id]++;
          }
        });
        EVAL_RULES.section2.forEach(item => {
          if (item.keywords.some(k => v.ruleName.toLowerCase().includes(k))) {
            autoFilledViolations.sec2[item.id] = true;
          }
        });
      });

      // 3. Đọc lại phiếu đã lưu nếu có (để lấy số liệu tự khai báo của HS)
      const savedEval = evaluations.find(ev => ev.studentId === s.studentId && String(ev.month) === String(month));
      
      let userSec1Counts = {};
      let userSec2Checks = {};
      
      if (savedEval) {
        document.getElementById('student-eval-note').value = savedEval.studentNote || '';
        for (let i = 1; i <= 5; i++) {
          document.getElementById(`reward-${i}`).value = savedEval.rewards?.[`r${i}`] || 0;
        }
        userSec1Counts = savedEval.section1Counts || {};
        userSec2Checks = savedEval.section2Checks || {};
      } else {
        document.getElementById('student-eval-note').value = '';
        for (let i = 1; i <= 5; i++) document.getElementById(`reward-${i}`).value = 0;
        userSec1Counts = { ...autoFilledViolations.sec1 };
        userSec2Checks = { ...autoFilledViolations.sec2 };
      }
      
      // Build Inputs
      buildEvalInputs(userSec1Counts, userSec2Checks);
      
      // Calculate and update dashboard
      recalculateLiveScore();
      
      // Đăng ký event cho các trường reward
      for (let i = 1; i <= 5; i++) {
        document.getElementById(`reward-${i}`).oninput = recalculateLiveScore;
      }
      
      lucide.createIcons();
    }

    function recalculateLiveScore() {
      if (currentRole !== 'student' || !loggedInUser) return;
      
      let section1Counts = {};
      let section2Checks = {};

      // Lấy giá trị từ các input người dùng đã nhập, đảm bảo không thấp hơn autoFill
      EVAL_RULES.section1.forEach(item => { 
        const inputEl = document.getElementById(`input-${item.id}`);
        let val = parseInt(inputEl?.value) || 0;
        const autoCount = autoFilledViolations.sec1[item.id] || 0;
        if (val < autoCount) {
          val = autoCount;
          if(inputEl) inputEl.value = autoCount; // Force reset if user tries to lower
        }
        section1Counts[item.id] = val; 
      });
      
      EVAL_RULES.section2.forEach(item => { 
        const checkEl = document.getElementById(`check-${item.id}`);
        let checked = checkEl?.checked || false;
        if (autoFilledViolations.sec2[item.id]) {
          checked = true; // Force true if auto-filled
          if(checkEl) checkEl.checked = true;
        }
        section2Checks[item.id] = checked; 
      });

      let rewards = {};
      for (let i = 1; i <= 5; i++) {
        rewards[`r${i}`] = parseInt(document.getElementById(`reward-${i}`).value) || 0;
      }

      const calc = computeEvaluationScore(section1Counts, section2Checks, rewards);
      
      // Check for saved status
      const month = document.getElementById('student-eval-month').value;
      const s = loggedInUser;
      const savedEval = evaluations.find(ev => ev.studentId === s.studentId && String(ev.month) === String(month));
      let statusStr = savedEval ? savedEval.status : "Đang soạn thảo";
      
      updateLiveScoreView(calc.totalScore, calc.rating, calc.totalPenalty, calc.rewardSum, statusStr);
    }

    function updateLiveScoreView(score, rating, penalty, reward, status) {
      const scoreEl = document.getElementById('student-eval-live-score');
      
      // Animate score count
      let currentVal = parseInt(scoreEl.textContent) || 0;
      if (currentVal !== score) {
         scoreEl.textContent = score;
         scoreEl.classList.add('scale-125', 'text-amber-300');
         setTimeout(() => {
           scoreEl.classList.remove('scale-125', 'text-amber-300');
         }, 300);
      }
      
      // Update Circle SVG Dash
      const circle = document.getElementById('eval-score-circle');
      if (circle) {
         const radius = circle.r.baseVal.value;
         const circumference = radius * 2 * Math.PI;
         // score 0 = dashoffset = circumference. score 100 = dashoffset = 0
         const offset = circumference - (score / 100) * circumference;
         circle.style.strokeDashoffset = offset;
         
         if (score < 50) circle.classList.replace('text-sky-500', 'text-rose-500') || circle.classList.add('text-rose-500');
         else if (score < 75) circle.classList.replace('text-rose-500', 'text-amber-500') || circle.classList.replace('text-sky-500', 'text-amber-500') || circle.classList.add('text-amber-500');
         else circle.classList.replace('text-rose-500', 'text-sky-500') || circle.classList.replace('text-amber-500', 'text-sky-500') || circle.classList.add('text-sky-500');
      }

      const rBadge = document.getElementById('student-eval-live-rating');
      rBadge.textContent = rating.toUpperCase();
      
      if (rating === 'Chưa đạt') {
        rBadge.className = "px-6 py-2 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 font-black text-sm tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all";
      } else if (rating === 'Tốt') {
        rBadge.className = "px-6 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-black text-sm tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all";
      } else {
        rBadge.className = "px-6 py-2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 font-black text-sm tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all";
      }

      document.getElementById('student-eval-live-penalty').textContent = `-${penalty}đ`;
      document.getElementById('student-eval-live-reward').textContent = `+${reward}đ`;

      let statusColor = 'text-amber-400 animate-pulse';
      if (status === 'Đã duyệt') statusColor = 'text-emerald-400';
      if (status === 'Chờ duyệt') statusColor = 'text-sky-400';
      document.getElementById('student-eval-status-view').className = `font-bold uppercase tracking-wider text-xs ${statusColor}`;
      document.getElementById('student-eval-status-view').textContent = status;
    }

    // Thuật toán cốt lõi tính toán điểm và phân loại rèn luyện hàng tháng
    function computeEvaluationScore(sec1Counts, sec2Checks, rewards) {
      let base = 100;
      let totalPenalty = 0;

      // 1. Tính toán điểm trừ cho Mục I
      EVAL_RULES.section1.forEach(item => {
        const count = sec1Counts[item.id] || 0;
        if (count > 0) {
          if (item.isDynamic && item.id === 's1_10') {
            // Quy chế đi trễ có giấy: 1-3 lần: -1đ/lần; từ lần 4 trở đi: -5đ/lần
            let pts = 0;
            if (count <= 3) {
              pts = count * 1;
            } else {
              pts = (3 * 1) + ((count - 3) * 5);
            }
            totalPenalty += pts;
          } else {
            totalPenalty += count * item.points;
          }
        }
      });

      // 2. Tính toán điểm thưởng Mục III
      let rewardSum = 0;
      const rewardConfig = [5, 5, 10, 20, 10]; // điểm thưởng cố định
      for (let i = 1; i <= 5; i++) {
        const count = rewards[`r${i}`] || 0;
        rewardSum += count * rewardConfig[i - 1];
      }

      const totalScore = Math.max(0, Math.min(100, base - totalPenalty + rewardSum));

      // 3. Xếp loại rèn luyện (Ưu tiên Mục II lỗi nghiêm trọng xếp loại "Chưa đạt" ngay)
      let rating = 'Tốt';
      
      const hasSection2Violation = Object.values(sec2Checks).some(val => val === true);
      
      if (hasSection2Violation || totalScore < 50) {
        rating = 'Chưa đạt';
      } else if (totalScore >= 90) {
        rating = 'Tốt';
      } else if (totalScore >= 75) {
        rating = 'Khá';
      } else {
        rating = 'Đạt';
      }

      return { totalScore, rating, totalPenalty, rewardSum, hasSection2Violation };
    }

    // Submit student's self evaluation form to Cloud/Local
    async function submitStudentEvaluation() {
      if (currentRole !== 'student' || !loggedInUser) return;
      const s = loggedInUser;
      const month = document.getElementById('student-eval-month').value;

      showConfirm(
        "Nộp phiếu rèn luyện",
        "Xác nhận gửi phiếu rèn luyện này? Bạn cam kết các thông tin tự đánh giá là hoàn toàn trung thực.",
        async () => {
          let section1Counts = {};
          let section2Checks = {};

          EVAL_RULES.section1.forEach(item => { 
            const inputEl = document.getElementById(`input-${item.id}`);
            section1Counts[item.id] = parseInt(inputEl?.value) || 0; 
          });
          
          EVAL_RULES.section2.forEach(item => { 
            const checkEl = document.getElementById(`check-${item.id}`);
            section2Checks[item.id] = checkEl?.checked || false; 
          });

          let rewards = {};
          for (let i = 1; i <= 5; i++) {
            rewards[`r${i}`] = parseInt(document.getElementById(`reward-${i}`).value) || 0;
          }

          const calc = computeEvaluationScore(section1Counts, section2Checks, rewards);

          // Loại bỏ phần tử trùng tháng cũ của học sinh
          evaluations = evaluations.filter(ev => !(ev.studentId === s.studentId && String(ev.month) === String(month)));

          const newEval = {
            id: 'ev_' + Date.now() + '_' + s.studentId,
            studentId: s.studentId,
            studentName: s.name,
            studentClass: s.class,
            month: String(month),
            section1Counts,
            section2Checks,
            rewards,
            totalScore: calc.totalScore,
            rating: calc.rating,
            studentNote: document.getElementById('student-eval-note').value.trim(),
            status: "Chờ duyệt",
            approvedBy: { gvcn: false, gt: false, bgh: false },
            updatedAt: new Date().toISOString()
          };

          evaluations.push(newEval);
          await saveAutosaveToCloud();
          showToast("✓ Đã nộp phiếu rèn luyện thành công!");
          loadStudentEvalForm(); // Reload form to show saved status
        }
      );
    }

    // Student previews self evaluation print layout
    function previewSelfEvaluationSheet() {
      if (currentRole !== 'student' || !loggedInUser) return;
      const month = document.getElementById('student-eval-month').value;
      const s = loggedInUser;

      const evalData = evaluations.find(ev => ev.studentId === s.studentId && String(ev.month) === String(month));
      if (!evalData) {
        showToast("⚠ Vui lòng bấm Nộp phiếu rèn luyện trước khi tiến hành xem bản in!");
        return;
      }

      openEvalApprovalModal(evalData.id);
    }

    // ----------------------------------------------------
    // EVALUATIONS APPROVAL CONSOLE (FOR TEACHERS & ADMIN)
    // ----------------------------------------------------
    function renderEvaluationsList() {
      const tbody = document.getElementById('approval-table-body');
      const emptyView = document.getElementById('approval-empty-view');
      const filterMonth = document.getElementById('approve-filter-month').value;
      let filterClass = document.getElementById('approve-filter-class').value;
      const filterStatus = document.getElementById('approve-filter-status').value;

      if (currentRole === 'gvcn' && loggedInUser?.assignedClass) {
        filterClass = loggedInUser.assignedClass;
        const classSelect = document.getElementById('approve-filter-class');
        if (classSelect) {
          classSelect.value = loggedInUser.assignedClass;
          classSelect.disabled = true;
        }
      }

      if (!tbody) return;

      let filtered = evaluations.filter(ev => {
        const matchMonth = (filterMonth === 'all') || (String(ev.month) === filterMonth);
        const matchClass = (filterClass === 'all') || (ev.studentClass === filterClass);
        const matchStatus = (filterStatus === 'all') || (ev.status === filterStatus);
        return matchMonth && matchClass && matchStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyView.classList.remove('hidden');
        return;
      }
      emptyView.classList.add('hidden');

      filtered.sort((a,b) => {
        const classComp = a.studentClass.localeCompare(b.studentClass, 'vi', { numeric: true });
        if (classComp !== 0) return classComp;
        return a.studentName.localeCompare(b.studentName, 'vi');
      });

      tbody.innerHTML = filtered.map(ev => {
        let statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
        if (ev.status === "Đã duyệt") {
          statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
        }
        
        let ratingColor = "text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded";
        if (ev.rating === "Chưa đạt") ratingColor = "text-rose-400 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded";
        else if (ev.rating === "Khá") ratingColor = "text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded";

        // Hiển thị thay đổi điểm so với điểm gốc (100)
        const scoreChange = ev.totalScore - 100;
        let changeBadge = '';
        if (ev._scoreChanged) {
          // Điểm vừa được cập nhật - hiển thị nổi bật
          const delta = ev._scoreDelta || 0;
          const deltaClass = delta >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30';
          changeBadge = `<span class="score-changed px-1.5 py-0.5 rounded border text-[10px] font-black ${deltaClass}">${delta >= 0 ? '+' : ''}${delta}đ ↺</span>`;
        } else if (scoreChange !== 0) {
          const deltaClass = scoreChange >= 0 ? 'text-emerald-400' : 'text-rose-400';
          changeBadge = `<span class="${deltaClass} text-[10px] font-bold">${scoreChange >= 0 ? '+' : ''}${scoreChange}đ</span>`;
        } else {
          changeBadge = `<span class="text-slate-500 text-[10px]">–</span>`;
        }

        const isGvcnCrossClass = currentRole === 'gvcn' && loggedInUser?.assignedClass && ev.studentClass !== loggedInUser.assignedClass;
        const rowClass = isGvcnCrossClass 
          ? "hover:bg-slate-700/50 transition-colors opacity-40 pointer-events-none select-none filter grayscale" 
          : "hover:bg-slate-700/50 transition-colors";
        const btnDisabled = isGvcnCrossClass ? "disabled" : "";

        return `
          <tr class="${rowClass}" id="approval-row-${ev.id}">
            <td class="py-3 px-4 font-bold text-slate-100">${ev.studentName}</td>
            <td class="py-3 px-3 text-center">
              <span class="bg-indigo-500/20 text-indigo-300 font-bold px-2 py-1 rounded text-xs">${ev.studentClass}</span>
            </td>
            <td class="py-3 px-3 text-center text-slate-400 font-medium">T.${ev.month}</td>
            <td class="py-3 px-3 text-center font-black text-sky-400 text-sm" id="approval-score-${ev.id}">${ev.totalScore}đ</td>
            <td class="py-3 px-3 text-center" id="approval-delta-${ev.id}">${changeBadge}</td>
            <td class="py-3 px-3 text-center" id="approval-rating-${ev.id}">
              <span class="${ratingColor}">${ev.rating}</span>
            </td>
            <td class="py-3 px-4 text-slate-400 text-xs italic max-w-[150px] truncate" title="${ev.studentNote || ''}">${ev.studentNote || '-'}</td>
            <td class="py-3 px-3 text-center">
              <span class="px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase ${statusColor}">${ev.status}</span>
            </td>
            <td class="py-3 px-3 text-center">
              <div class="flex justify-center">
                <button onclick="openEvalApprovalModal('${ev.id}')" ${btnDisabled} class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md active:scale-95">
                  <i data-lucide="eye" class="w-4 h-4"></i> Xem / Duyệt
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
      lucide.createIcons();
    }

    // ----------------------------------------------------
    // POPULATE SINGLE DOCUMENT PRINT PREVIEW (MẪU WORD CHUẨN)
    // ----------------------------------------------------
    function openEvalApprovalModal(evalId) {
      const ev = evaluations.find(item => item.id === evalId);
      if (!ev) return;

      activeApprovedId = evalId;
      document.getElementById('eval-detail-modal').classList.remove('hidden');

      // Setup approval panel buttons visibility according to role permissions
      document.getElementById('btn-approve-gvcn').classList.toggle('hidden', currentRole === 'student');
      document.getElementById('btn-approve-gt').classList.toggle('hidden', currentRole === 'student');
      document.getElementById('btn-approve-bgh').classList.toggle('hidden', currentRole !== 'admin');

      // Update approved check status dynamically on buttons
      document.getElementById('btn-approve-gvcn').innerHTML = ev.approvedBy?.gvcn ? "<i data-lucide='check-square' class='w-5 h-5'></i> ✓ Đã Ký Phê Duyệt" : "<i data-lucide='square' class='w-5 h-5'></i> Duyệt Với Vai Trò GVCN";
      document.getElementById('btn-approve-gt').innerHTML = ev.approvedBy?.gt ? "<i data-lucide='check-square' class='w-5 h-5'></i> ✓ Giám Thị Đã Duyệt" : "<i data-lucide='square' class='w-5 h-5'></i> Duyệt Với Vai Trò Giám Thị";
      document.getElementById('btn-approve-bgh').innerHTML = ev.approvedBy?.bgh ? "<i data-lucide='check-square' class='w-5 h-5'></i> ✓ BGH Đã Phê Duyệt" : "<i data-lucide='square' class='w-5 h-5'></i> Duyệt Với Vai Trò BGH";

      document.getElementById('eval-active-status-view').textContent = ev.status;
      if (ev.status === "Đã duyệt") {
          document.getElementById('eval-active-status-view').className = "p-3 bg-emerald-500/10 rounded-lg text-center font-bold text-sm text-emerald-400 border border-emerald-500/30 mb-4";
      } else {
          document.getElementById('eval-active-status-view').className = "p-3 bg-amber-500/10 rounded-lg text-center font-bold text-sm text-amber-400 border border-amber-500/30 mb-4 animate-pulse";
      }

      document.getElementById('eval-active-score').textContent = `${ev.totalScore}đ`;
      document.getElementById('eval-active-rating').textContent = ev.rating.toUpperCase();
      
      const ratingEl = document.getElementById('eval-active-rating');
      if (ev.rating === 'Chưa đạt') ratingEl.className = 'text-rose-400 text-lg font-black';
      else if (ev.rating === 'Tốt') ratingEl.className = 'text-emerald-400 text-lg font-black';
      else ratingEl.className = 'text-amber-400 text-lg font-black';

      // Render standard document matching Phieu_danh_gia_ren_luyen.docx layout
      const paperHtml = generateSingleEvaluationPaperHtml(ev);
      document.getElementById('eval-paper-preview').innerHTML = paperHtml;
      
      lucide.createIcons();
    }

    function closeEvalDetailModal() {
      document.getElementById('eval-detail-modal').classList.add('hidden');
      activeApprovedId = null;
    }

    // Render HTML Sheet for a single Evaluation Paper matching Microsoft Word design
    function generateSingleEvaluationPaperHtml(ev) {
      let dateStr = `Tháng ${ev.month}`;
      
      // Calculate Section I dynamic row content
      let sec1RowsHtml = EVAL_RULES.section1.map((item, idx) => {
        const count = ev.section1Counts?.[item.id] || 0;
        let pointsDeducted = 0;
        
        if (count > 0) {
          if (item.isDynamic && item.id === 's1_10') {
            pointsDeducted = count <= 3 ? count * 1 : (3 * 1) + ((count - 3) * 5);
          } else {
            pointsDeducted = count * item.points;
          }
        }

        return `
          <tr style="border: 1px solid #475569;">
            <td style="border: 1px solid #475569; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: left;">${item.name}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: center; font-weight: 500;">${item.label}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: center; font-weight: bold;">${count > 0 ? count + ' lần' : '-'}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: center; font-weight: bold; color: ${count > 0 ? '#b91c1c' : 'inherit'}">${count > 0 ? '-' + pointsDeducted + 'đ' : '-'}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: left; font-size: 8px; color: #475569;">${item.id === 's1_13' ? 'Phục hồi ban đầu' : ''}</td>
          </tr>
        `;
      }).join('');

      // Section II dynamic row content
      let sec2RowsHtml = EVAL_RULES.section2.map((item, idx) => {
        const violated = ev.section2Checks?.[item.id] || false;
        return `
          <tr style="border: 1px solid #475569;">
            <td style="border: 1px solid #475569; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: left;">${item.name}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: center; font-weight: 500; color: #b91c1c;">Chưa đạt ngay</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: center; font-weight: bold;">${violated ? 'Vi phạm' : '-'}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: center; font-weight: bold; color: #b91c1c;">${violated ? 'Chưa Đạt' : '-'}</td>
            <td style="border: 1px solid #475569; padding: 6px; text-align: left; font-size: 8px; color: #475569;">Hồ sơ lưu trữ</td>
          </tr>
        `;
      }).join('');

      // Section III reward listing
      const r1 = ev.rewards?.['r1'] || 0;
      const r2 = ev.rewards?.['r2'] || 0;
      const r3 = ev.rewards?.['r3'] || 0;
      const r4 = ev.rewards?.['r4'] || 0;
      const r5 = ev.rewards?.['r5'] || 0;

      return `
        <div style="font-family: 'Be Vietnam Pro', sans-serif; color: #000; padding: 20px; line-height: 1.4;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <div style="text-align: center;">
              <div style="font-size: 10px; font-weight: 600; text-transform: uppercase">ỦY BAN NHÂN DÂN PHƯỜNG BÌNH TIÊN</div>
              <div style="font-size: 12px; font-weight: 900; color: #1e3a8a; text-transform: uppercase">TRƯỜNG THCS PHẠM ĐÌNH HỔ</div>
              <div style="margin-top: 2px; width: 60%; height: 1px; background-color: #000; margin-left: auto; margin-right: auto;"></div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 10px; font-weight: 900;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-size: 10px; font-weight: 700; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
            </div>
          </div>

          <!-- Document Title -->
          <div style="text-align: center; margin-top: 15px; margin-bottom: 15px;">
            <h2 style="font-size: 14px; font-weight: 900; margin: 0; text-transform: uppercase;">PHIẾU ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN THEO ĐỢT BÁO ĐIỂM</h2>
            <h3 style="font-size: 12px; font-weight: 800; margin: 4px 0 0 0; text-transform: uppercase;">THÁNG ${ev.month} (NĂM HỌC 2025 - 2026)</h3>
            <p style="font-size: 9px; font-style: italic; color: #475569; margin: 4px 0 0 0;">(Kèm theo Quyết định số: .../QĐ-PĐH, ngày tháng 09 năm 2026 của trường THCS Phạm Đình Hổ)</p>
          </div>

          <!-- Student Meta Data -->
          <div style="font-size: 11px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 6px; border: 1px dashed #94a3b8; padding: 10px; background-color: #f8fafc; border-radius: 6px;">
            <div style="display: flex; gap: 40px;">
              <span>Họ và tên học sinh: <strong style="font-size: 12px; text-transform: uppercase">${ev.studentName}</strong></span>
              <span>Mã định danh (BGD): <strong>${ev.studentId}</strong></span>
            </div>
            <div style="display: flex; gap: 40px;">
              <span>Lớp học: <strong>${ev.studentClass}</strong></span>
              <span>Giáo viên chủ nhiệm: .................................................</span>
            </div>
          </div>

          <!-- Section I Table -->
          <div style="margin-bottom: 15px;">
            <h4 style="font-size: 11px; font-weight: 900; margin-bottom: 6px; text-transform: uppercase; color: #1e3a8a;">I. PHẨM CHẤT ĐẠO ĐỨC, TÁC PHONG HỌC SINH (Chuẩn gốc: 100đ)</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background-color: #f1f5f9; font-weight: bold; border: 1px solid #475569;">
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 5%;">STT</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: left; width: 45%;">Nội dung quy định</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 15%;">Định mức trừ</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 12%;">Số lần vi phạm</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 11%;">Điểm bị trừ</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: left; width: 12%;">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                ${sec1RowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Section II Table -->
          <div style="margin-bottom: 15px; page-break-inside: avoid;">
            <h4 style="font-size: 11px; font-weight: 900; margin-bottom: 6px; text-transform: uppercase; color: #b91c1c;">II. CÁC TRƯỜNG HỢP XẾP LOẠI KẾT QUẢ RÈN LUYỆN CHƯA ĐẠT NGAY</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background-color: #fee2e2; font-weight: bold; border: 1px solid #475569;">
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 5%;">STT</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: left; width: 45%;">Các vi phạm đặc biệt nghiêm trọng</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 15%;">Hình thức xử lý</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 12%;">Hiện trạng</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: center; width: 11%;">Kết quả</th>
                  <th style="border: 1px solid #475569; padding: 8px 6px; text-align: left; width: 12%;">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                ${sec2RowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Section III Reward points listing -->
          <div style="margin-bottom: 15px; page-break-inside: avoid; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; background-color: #f0fdf4;">
            <h4 style="font-size: 11px; font-weight: 900; margin-bottom: 6px; text-transform: uppercase; color: #166534;">III. CÁC HOẠT ĐỘNG ĐƯỢC GHI NHẬN ĐIỂM THƯỞNG (CỘNG THÊM)</h4>
            <div style="font-size: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>- Báo cáo sai phạm với giáo viên, BGH (+5đ): <strong>${r1} lần</strong></div>
              <div>- Nhặt được của rơi trả lại người mất (+5đ): <strong>${r2} lần</strong></div>
              <div>- Đạt giải cuộc thi/phong trào cấp trường (+10đ): <strong>${r3} lần</strong></div>
              <div>- Đạt giải cuộc thi/phong trào cấp trên (+20đ): <strong>${r4} lần</strong></div>
              <div>- Tham gia tốt Đội Sao Đỏ xuất sắc (+10đ): <strong>${r5} lần</strong></div>
            </div>
          </div>

          <!-- Section IV Final results rating summary -->
          <div style="page-break-inside: avoid; border: 2px solid #1e40af; padding: 15px; border-radius: 6px; background-color: #eff6ff; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 12px; font-weight: 900; margin: 0; text-transform: uppercase; color: #1e40af;">IV. KẾT QUẢ TỰ PHÂN LOẠI & TỔNG ĐIỂM</h4>
              <p style="font-size: 9px; color: #475569; margin: 4px 0 0 0;">(Tốt: >=90đ | Khá: 75-89đ | Đạt: 50-74đ | Chưa đạt: <50đ hoặc dính lỗi Mục II)</p>
            </div>
            <div style="text-align: right; display: flex; gap: 20px;">
              <div>
                <span style="font-size: 10px; color: #475569; display: block; font-weight: bold;">TỔNG ĐIỂM:</span>
                <strong style="font-size: 18px; color: #1e40af;">${ev.totalScore} điểm</strong>
              </div>
              <div>
                <span style="font-size: 10px; color: #475569; display: block; font-weight: bold;">XẾP LOẠI:</span>
                <strong style="font-size: 18px; color: #b91c1c; text-transform: uppercase;">${ev.rating}</strong>
              </div>
            </div>
          </div>

          <!-- Note Area -->
          <div style="margin-top: 15px; font-size: 10px; font-style: italic; color: #334155;">
             * Lời tự nhận xét, hứa hẹn của học sinh: <strong>"${ev.studentNote || 'Không có ghi chú'}"</strong>
          </div>

          <!-- Signature Blocks -->
          <div style="margin-top: 25px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; font-size: 10px; page-break-inside: avoid;">
            <div>
              <p style="font-weight: 900; text-transform: uppercase; margin: 0;">CHA MẸ HỌC SINH</p>
              <p style="font-style: italic; color: #475569; margin: 4px 0 0 0;">(Ký và ghi rõ họ tên)</p>
              <div style="height: 60px;"></div>
            </div>
            <div>
              <p style="font-weight: 900; text-transform: uppercase; margin: 0;">HỌC SINH TỰ ĐÁNH GIÁ</p>
              <p style="font-style: italic; color: #475569; margin: 4px 0 0 0;">(Ký và ghi rõ họ tên)</p>
              <div style="height: 60px;"></div>
              <p style="font-weight: bold; margin: 0; text-transform: uppercase;">${ev.studentName}</p>
            </div>
            <div>
              <p style="font-weight: 900; text-transform: uppercase; margin: 0;">GIÁO VIÊN CHỦ NHIỆM</p>
              <p style="font-style: italic; color: #475569; margin: 4px 0 0 0;">(Ký, ghi rõ họ tên)</p>
              <div style="height: 60px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #16a34a;">
                ${ev.approvedBy?.gvcn ? "✓ ĐÃ DUYỆT ONLINE" : ""}
              </div>
            </div>
            <div>
              <p style="font-weight: 900; text-transform: uppercase; margin: 0;">BAN GIÁM HIỆU / GT</p>
              <p style="font-style: italic; color: #475569; margin: 4px 0 0 0;">(Ký tên và phê duyệt)</p>
              <div style="height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #9333ea;">
                ${ev.approvedBy?.gt ? "✓ GT ĐÃ DUYỆT" : ""}
                <div style="height: 5px;"></div>
                ${ev.approvedBy?.bgh ? "✓ BGH ĐÃ DUYỆT" : ""}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Approve monthly evaluation by respective roles
    async function approveActiveEvaluation(roleType) {
      if (!activeApprovedId) return;
      const ev = evaluations.find(item => item.id === activeApprovedId);
      if (!ev) return;

      if (!ev.approvedBy) ev.approvedBy = { gvcn: false, gt: false, bgh: false };

      ev.approvedBy[roleType] = !ev.approvedBy[roleType]; // Đảo trạng thái ký duyệt

      // Cập nhật trạng thái duyệt chung của phiếu
      if (ev.approvedBy.bgh || (ev.approvedBy.gvcn && ev.approvedBy.gt)) {
        ev.status = "Đã duyệt";
      } else {
        ev.status = "Chờ duyệt";
      }

      await saveAutosaveToCloud();
      showToast(`✓ Đã cập nhật trạng thái phê duyệt!`);
      openEvalApprovalModal(activeApprovedId); // Reload modal
      renderEvaluationsList(); // Reload table
    }

    // Print active detailed evaluation paper instantly
    function printActiveEvaluation() {
      const paperHtml = document.getElementById('eval-paper-preview').innerHTML;
      document.getElementById('print-content').innerHTML = paperHtml;
      window.print();
    }

    // Expose batch printing layout with pagebreaks
    function triggerBatchPrint() {
      const filterMonth = document.getElementById('approve-filter-month').value;
      const filterClass = document.getElementById('approve-filter-class').value;
      const filterStatus = document.getElementById('approve-filter-status').value;

      let filtered = evaluations.filter(ev => {
        const matchMonth = (filterMonth === 'all') || (String(ev.month) === filterMonth);
        const matchClass = (filterClass === 'all') || (ev.studentClass === filterClass);
        const matchStatus = (filterStatus === 'all') || (ev.status === filterStatus);
        return matchMonth && matchClass && matchStatus;
      });

      if (filtered.length === 0) {
        showToast("❌ Không tìm thấy phiếu rèn luyện nào trùng khớp để in hàng loạt!");
        return;
      }

      showConfirm(
        "In rèn luyện hàng loạt",
        `Xác nhận in toàn bộ ${filtered.length} phiếu tự rèn luyện của học sinh đã chọn (mỗi phiếu tự động sang 1 trang in A4)?`,
        () => {
          const batchHtml = filtered.map(ev => `
            <div class="page-break" style="padding: 10px; max-width: 800px; margin: 0 auto; background: white; color: black;">
              ${generateSingleEvaluationPaperHtml(ev)}
            </div>
          `).join('');

          document.getElementById('print-content').innerHTML = batchHtml;
          window.print();
        }
      );
    }

    async function deleteActiveEvaluationPrompt() {
      if (!activeApprovedId) return;
      showConfirm(
        "Từ chối phiếu tự đánh giá",
        "Xác nhận xóa phiếu tự đánh giá tháng này của học sinh để họ làm lại bản mới?",
        async () => {
          evaluations = evaluations.filter(ev => ev.id !== activeApprovedId);
          await saveAutosaveToCloud();
          closeEvalDetailModal();
          renderEvaluationsList();
          showToast("✓ Đã gỡ bỏ phiếu tự đánh giá thành công!");
        }
      );
    }

    // ----------------------------------------------------
    // ORIGINAL LOGGING, SEARCH & EMULATION JOURNAL CODES
    // ----------------------------------------------------
    function removeVietnameseTones(str) {
      if (!str) return '';
      str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");
      str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ẽ/g,"e");
      str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i");
      str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");
      str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");
      str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");
      str = str.replace(/đ/g,"d");
      str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
      str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
      str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
      str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
      str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
      str = str.replace(/Y|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
      str = str.replace(/Đ/g, "D");
      str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0323/g, ""); 
      str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
      return str;
    }

    function getVietnameseSortKey(fullName) {
      if (!fullName) return { firstName: "", lastName: "" };
      const cleaned = fullName.trim().normalize('NFC');
      const parts = cleaned.split(/\s+/);
      const firstName = parts.pop() || ""; 
      const lastName = parts.join(" ");   
      return { firstName, lastName };
    }

    function compareVietnameseNames(a, b) {
      const compFirst = a.sortKey.firstName.localeCompare(b.sortKey.firstName, 'vi', { sensitivity: 'accent' });
      if (compFirst !== 0) return compFirst;
      return a.sortKey.lastName.localeCompare(b.sortKey.lastName, 'vi', { sensitivity: 'accent' });
    }

    function precalculateKeys(list) {
      const len = list.length;
      for (let i = 0; i < len; i++) {
        const s = list[i];
        s.sortKey = getVietnameseSortKey(s.name);
        s.nameLower = s.name.normalize('NFC').toLowerCase();
        s.nameClean = removeVietnameseTones(s.nameLower);
        s.classLower = s.class.normalize('NFC').toLowerCase();
        s.phoneClean = String(s.phone || '').trim();
        s.phone2Clean = String(s.phone2 || '').trim();
        s.grade = getGrade(s.class);
        
        // Tạo Mã định danh 10 số mô phỏng nếu file Excel chưa có
        if (!s.studentId || String(s.studentId).trim() === '') {
          // Sinh số ngẫu nhiên 10 số bắt đầu bằng mã thế kỷ/tỉnh
          const randomID = '079' + Math.floor(1000000 + Math.random() * 9000000);
          s.studentId = randomID;
        }
      }
    }

    function showProgressLoader(show, percent = 0, title = "Đang xử lý dữ liệu...", subtitle = "Vui lòng đợi giây lát") {
      const overlay = document.getElementById('loading-overlay');
      const percentText = document.getElementById('loading-percent');
      const progressBar = document.getElementById('loading-progress-bar');
      const titleText = document.getElementById('loading-title');
      const subText = document.getElementById('loading-subtitle');
      
      if (show) {
        overlay.classList.remove('hidden');
        percentText.textContent = `${percent}%`;
        progressBar.style.width = `${percent}%`;
        titleText.textContent = title;
        subText.textContent = subtitle;
      } else {
        overlay.classList.add('hidden');
      }
    }

    function initGlobalDropdowns() {
      const selects = ['violation-week', 'log-filter-week'];
      selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        const origVal = el.value;
        el.innerHTML = id === 'log-filter-week' ? '<option value="all">Tất cả tuần</option>' : '';
        for (let w = 1; w <= 37; w++) {
          const opt = document.createElement('option');
          opt.value = w;
          opt.textContent = `Tuần ${w}`;
          el.appendChild(opt);
        }
        if (origVal) el.value = origVal;
      });

      const ruleSelect = document.getElementById('violation-type-select');
      if (ruleSelect) {
        ruleSelect.innerHTML = '';
        violationTypes.forEach(rule => {
          const opt = document.createElement('option');
          opt.value = rule.id;
          opt.textContent = `[${rule.category}] ${rule.name} (-${rule.points}đ)`;
          ruleSelect.appendChild(opt);
        });
      }

      // Populate approvals filter class selector
      const approveClassSel = document.getElementById('approve-filter-class');
      if (approveClassSel) {
        approveClassSel.innerHTML = '<option value="all">Tất cả lớp</option>';
        let classes = [...new Set(students.map(s => s.class))];
        classes.sort((a,b) => a.localeCompare(b, 'vi', { numeric: true }));
        classes.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = `Lớp ${c}`;
          approveClassSel.appendChild(opt);
        });
      }
    }

    function calculateSchoolParams(dateStr) {
      const d = new Date(dateStr);
      if (isNaN(d)) return { week: 1, month: 9, semester: 'Học kỳ I' };
      
      const month = d.getMonth() + 1;
      let semester = 'Học kỳ I';
      if (month >= 1 && month <= 5) semester = 'Học kỳ II';
      
      const year = d.getFullYear();
      let schoolStart = new Date(year, 8, 1);
      if (month < 8) schoolStart = new Date(year - 1, 8, 1);
      
      const diffTime = Math.abs(d - schoolStart);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let week = Math.ceil(diffDays / 7);
      if (week < 1) week = 1;
      if (week > 37) week = 37;
      
      return { week, month, semester };
    }

    function onViolationDateChange(val) {
      if (!val) return;
      const params = calculateSchoolParams(val);
      document.getElementById('violation-week').value = params.week;
      document.getElementById('violation-month').value = params.month;
      document.getElementById('violation-semester').value = params.semester;
    }

    // =====================================================
    // VIOLATION MODAL - CASCADE FORM (HK → Tháng → Tuần → Ngày T2-T6)
    // =====================================================
    const SEMESTER_MONTHS = {
      'Học kỳ I': [9, 10, 11, 12],
      'Học kỳ II': [1, 2, 3, 4, 5]
    };

    function onViolSemesterChange() {
      const sem = document.getElementById('violation-semester').value;
      const monthSel = document.getElementById('violation-month');
      const months = SEMESTER_MONTHS[sem] || [];
      monthSel.innerHTML = '<option value="">-- Chọn tháng --</option>';
      months.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `Tháng ${m}`;
        monthSel.appendChild(opt);
      });
      // Reset tuần và lịch
      document.getElementById('violation-week').innerHTML = '<option value="">-- Chọn tuần --</option>';
      document.getElementById('violation-calendar-wrap').classList.add('hidden');
      document.getElementById('violation-date').value = '';
      document.getElementById('violation-selected-date-label').textContent = '';
    }

    function onViolMonthChange() {
      const monthVal = parseInt(document.getElementById('violation-month').value);
      const sem = document.getElementById('violation-semester').value;
      const weekSel = document.getElementById('violation-week');

      if (!monthVal) {
        weekSel.innerHTML = '<option value="">-- Chọn tuần --</option>';
        document.getElementById('violation-calendar-wrap').classList.add('hidden');
        return;
      }

      // Tính các tuần thuộc tháng này
      weekSel.innerHTML = '<option value="">-- Chọn tuần --</option>';
      const year = getCurrentSchoolYear(monthVal);
      const weeksInMonth = getWeeksForMonth(year, monthVal);
      weeksInMonth.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.weekNum;
        opt.textContent = `Tuần ${w.weekNum} (${formatDateShort(w.start)} - ${formatDateShort(w.end)})`;
        weekSel.appendChild(opt);
      });
      document.getElementById('violation-calendar-wrap').classList.add('hidden');
      document.getElementById('violation-date').value = '';
      document.getElementById('violation-selected-date-label').textContent = '';
    }

    function onViolWeekChange() {
      const weekNum = parseInt(document.getElementById('violation-week').value);
      const monthVal = parseInt(document.getElementById('violation-month').value);
      if (!weekNum || !monthVal) {
        document.getElementById('violation-calendar-wrap').classList.add('hidden');
        return;
      }
      const year = getCurrentSchoolYear(monthVal);
      const weeksInMonth = getWeeksForMonth(year, monthVal);
      const weekData = weeksInMonth.find(w => w.weekNum === weekNum);
      if (!weekData) return;

      document.getElementById('violation-calendar-wrap').classList.remove('hidden');
      document.getElementById('violation-date').value = '';
      document.getElementById('violation-selected-date-label').textContent = 'Chưa chọn ngày';
      renderWeekCalendar(weekData, monthVal, year);
    }

    function getCurrentSchoolYear(month) {
      // Tháng 9-12: năm học bắt đầu là năm hiện tại (2025)
      // Tháng 1-5: năm học bắt đầu là năm trước + 1 (2026)
      const now = new Date();
      const currentYear = now.getFullYear();
      return (month >= 9) ? currentYear : currentYear;
    }

    function getWeeksForMonth(year, month) {
      // Tìm tất cả tuần học (T2-T6) có ít nhất 1 ngày trong tháng/năm đó
      // Trường bắt đầu từ 01/09 của năm học
      const schoolStart = new Date(month >= 9 ? year : year - 1, 8, 1); // 1 tháng 9
      const weeks = [];
      let weekNum = 1;
      let d = new Date(schoolStart);
      // Đẩy về thứ 2 đầu tiên của tuần 1 (tuần chứa ngày 1/9)
      const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...
      if (dayOfWeek === 0) { d.setDate(d.getDate() + 1); } // Sun -> Mon
      else if (dayOfWeek > 1) { d.setDate(d.getDate() - dayOfWeek + 1); } // về thứ 2

      for (let w = 0; w < 37; w++) {
        const mon = new Date(d);
        const fri = new Date(d);
        fri.setDate(fri.getDate() + 4);

        // Kiểm tra tuần này có ngày nào trong tháng/năm không
        const monMonth = mon.getMonth() + 1;
        const friMonth = fri.getMonth() + 1;
        const monYear = mon.getFullYear();
        const friYear = fri.getFullYear();

        if ((monMonth === month && monYear === year) ||
            (friMonth === month && friYear === year) ||
            (mon <= new Date(year, month - 1, 1) && fri >= new Date(year, month - 1, 1))) {
          weeks.push({ weekNum, start: new Date(mon), end: new Date(fri) });
        }

        d.setDate(d.getDate() + 7);
        weekNum++;
        if (weekNum > 37) break;
      }
      return weeks;
    }

    function formatDateShort(d) {
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    }

    function renderWeekCalendar(weekData, month, year) {
      const calEl = document.getElementById('violation-week-calendar');
      const monthLabel = document.getElementById('violation-cal-month-label');

      // Tiêu đề lịch
      monthLabel.textContent = `Tháng ${month}/${year} — Tuần ${weekData.weekNum} (${formatDateShort(weekData.start)} → ${formatDateShort(weekData.end)})`;

      const headers = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const today = new Date();
      today.setHours(0,0,0,0);

      let html = headers.map(h => `<div class="cal-header">${h}</div>`).join('');

      // Hiển thị ngày T2 đến CN của tuần đó
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekData.start);
        day.setDate(day.getDate() + i);
        const dayOfWeek = day.getDay(); // 0=Sun, 1=Mon, 6=Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = day.getTime() === today.getTime();
        const dayNum = day.getDate();
        const isoStr = day.toISOString().split('T')[0];
        const inCurrentMonth = (day.getMonth() + 1) === month;

        let classes = 'cal-day';
        if (!inCurrentMonth) classes += ' other-month';
        if (isToday) classes += ' today-marker';

        if (isWeekend) {
          classes += ' weekend-day disabled-day';
          html += `<div class="${classes}" title="Không chọn ngày T7/CN" onclick="violCalDayError()">${dayNum}</div>`;
        } else {
          classes += ' valid-day';
          html += `<div class="${classes}" data-date="${isoStr}" onclick="selectViolCalDay(this, '${isoStr}')">${dayNum}</div>`;
        }
      }

      calEl.innerHTML = html;

      // Khôi phục ngày đã chọn nếu có
      const curDate = document.getElementById('violation-date').value;
      if (curDate) {
        const selEl = calEl.querySelector(`[data-date="${curDate}"]`);
        if (selEl) selEl.classList.add('selected-day');
      }
    }

    function selectViolCalDay(el, dateStr) {
      // Bỏ chọn ngày cũ
      document.querySelectorAll('#violation-week-calendar .selected-day')
        .forEach(e => e.classList.remove('selected-day'));
      el.classList.add('selected-day');

      document.getElementById('violation-date').value = dateStr;
      const d = new Date(dateStr);
      const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];
      document.getElementById('violation-selected-date-label').textContent =
        `✓ ${dayNames[d.getDay()]} ngày ${formatDateShort(d)}/${d.getFullYear()}`;

      // Xóa thông báo lỗi nếu có
      document.getElementById('violation-date-error').classList.add('hidden');
    }

    function violCalDayError() {
      const errEl = document.getElementById('violation-date-error');
      errEl.querySelector('span').textContent = 'Không được chọn Thứ 7 hoặc Chủ Nhật! Vui lòng chọn ngày từ Thứ 2 đến Thứ 6.';
      errEl.classList.remove('hidden');
      setTimeout(() => errEl.classList.add('hidden'), 3500);
    }

    // =====================================================
    // AUTO RECALCULATE EVALUATION SCORE AFTER VIOLATION CHANGE
    // =====================================================
    /**
     * Tự động quét lại phiếu đánh giá của học sinh trong tháng cho trước,
     * tính lại điểm dựa trên violations mới nhất, cập nhật object evaluations[],
     * và làm tươi bảng Phê duyệt ngay lập tức (không cần lưu thủ công).
     * @param {string} studentName - Tên học sinh
     * @param {string} studentClass - Lớp học
     * @param {string|number} month - Tháng cần cập nhật
     */
    async function autoRecalcEvalForStudent(studentName, studentClass, month) {
      // Tìm phiếu đánh giá của học sinh này trong tháng
      const evIdx = evaluations.findIndex(ev =>
        ev.studentName === studentName &&
        ev.studentClass === studentClass &&
        String(ev.month) === String(month)
      );
      if (evIdx === -1) return; // Chưa có phiếu, bỏ qua

      const ev = evaluations[evIdx];

      // Lấy toàn bộ vi phạm của học sinh này trong tháng (dữ liệu mới nhất)
      const stViolations = violations.filter(v =>
        v.studentName === studentName &&
        v.studentClass === studentClass &&
        String(v.month) === String(month)
      );

      // Tính lại autoFilledViolations từ danh sách vi phạm mới
      const newAutoSec1 = {};
      const newAutoSec2 = {};
      EVAL_RULES.section1.forEach(item => { newAutoSec1[item.id] = 0; });
      EVAL_RULES.section2.forEach(item => { newAutoSec2[item.id] = false; });

      stViolations.forEach(v => {
        EVAL_RULES.section1.forEach(item => {
          if (item.keywords.some(k => v.ruleName.toLowerCase().includes(k))) {
            newAutoSec1[item.id]++;
          }
        });
        EVAL_RULES.section2.forEach(item => {
          if (item.keywords.some(k => v.ruleName.toLowerCase().includes(k))) {
            newAutoSec2[item.id] = true;
          }
        });
      });

      // Cập nhật section1Counts: đảm bảo giá trị tự khai của HS >= số lần bị phạt mới
      const mergedSec1 = {};
      EVAL_RULES.section1.forEach(item => {
        const auto = newAutoSec1[item.id] || 0;
        const userInput = ev.section1Counts?.[item.id] || 0;
        mergedSec1[item.id] = Math.max(auto, userInput);
      });

      // Cập nhật section2Checks: nếu auto = true thì override
      const mergedSec2 = {};
      EVAL_RULES.section2.forEach(item => {
        mergedSec2[item.id] = newAutoSec2[item.id] || (ev.section2Checks?.[item.id] || false);
      });

      // Tính lại điểm
      const oldScore = ev.totalScore;
      const oldRating = ev.rating;
      const calc = computeEvaluationScore(mergedSec1, mergedSec2, ev.rewards || {});

      // Đánh dấu thay đổi
      const delta = calc.totalScore - oldScore;
      evaluations[evIdx] = {
        ...ev,
        section1Counts: mergedSec1,
        section2Checks: mergedSec2,
        totalScore: calc.totalScore,
        rating: calc.rating,
        updatedAt: new Date().toISOString(),
        _scoreChanged: delta !== 0 || oldRating !== calc.rating,
        _scoreDelta: delta
      };

      // Nếu điểm thay đổi → cập nhật trực tiếp cell trên bảng Phê duyệt (không re-render toàn bảng)
      if (delta !== 0 || oldRating !== calc.rating) {
        const scoreCell = document.getElementById(`approval-score-${ev.id}`);
        const deltaCell = document.getElementById(`approval-delta-${ev.id}`);
        const ratingCell = document.getElementById(`approval-rating-${ev.id}`);
        const rowEl = document.getElementById(`approval-row-${ev.id}`);

        if (scoreCell) {
          scoreCell.innerHTML = `<span class="score-changed ${delta < 0 ? 'score-down' : 'score-up'}">${calc.totalScore}đ</span>`;
        }
        if (deltaCell) {
          const deltaClass = delta >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30';
          deltaCell.innerHTML = `<span class="score-changed px-1.5 py-0.5 rounded border text-[10px] font-black ${deltaClass}">${delta >= 0 ? '+' : ''}${delta}đ ↺</span>`;
        }
        if (ratingCell) {
          let ratingColor = "text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded";
          if (calc.rating === "Chưa đạt") ratingColor = "text-rose-400 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded";
          else if (calc.rating === "Khá") ratingColor = "text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded";
          ratingCell.innerHTML = `<span class="score-changed ${ratingColor}">${calc.rating}</span>`;
        }
        if (rowEl) {
          rowEl.style.outline = delta < 0 ? '2px solid rgba(248,113,113,0.5)' : '2px solid rgba(52,211,153,0.4)';
          setTimeout(() => { if(rowEl) rowEl.style.outline = ''; }, 3000);
        }

        // Hiển thị toast thông báo thay đổi
        showToast(`🔄 Đã cập nhật điểm ${studentName} T.${month}: ${oldScore}đ → ${calc.totalScore}đ (${calc.rating})`);
      }

      // Nếu modal chi tiết đang mở cho phiếu này, reload lại
      if (activeApprovedId === ev.id) {
        openEvalApprovalModal(ev.id);
      }

      return evaluations[evIdx];
    }

    // loadSampleData() đã bị xóa theo yêu cầu đảm bảo môi trường sản xuất


    function downloadBackup() {
      if (students.length === 0 && violations.length === 0) {
        showToast('❌ Không có dữ liệu để thực hiện sao lưu!');
        return;
      }
      try {
        const backupData = {
          app: "Find_HS_Boarding_Emulation",
          version: "3.1_Dashboard",
          backupDate: new Date().toISOString(),
          students: students.map(s => {
            const { sortKey, nameLower, nameClean, classLower, phoneClean, phone2Clean, grade, ...rest } = s;
            return rest;
          }),
          violations: violations,
          violationTypes: violationTypes,
          evaluations: evaluations,
          passcodes: passcodes
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_HocSinh_Thidua_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('✓ Tải file Sao lưu (.json) thành công!');
      } catch (e) {
        showToast('❌ Lỗi khi đóng gói bản sao lưu!');
      }
    }

    function handleJsonRestore(e) {
      const file = e.target.files[0];
      if (!file) return;

      showProgressLoader(true, 10, "Đang chuẩn bị phục hồi...", "Đọc cấu trúc tệp dữ liệu");
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed) {
            showProgressLoader(true, 40, "Đang ánh xạ danh sách học sinh...", "Phân loại dữ liệu");
            
            if (Array.isArray(parsed.students)) {
              students = parsed.students;
              precalculateKeys(students);
            }
            if (Array.isArray(parsed.violationTypes)) violationTypes = parsed.violationTypes;
            if (Array.isArray(parsed.violations)) violations = parsed.violations;
            if (Array.isArray(parsed.evaluations)) evaluations = parsed.evaluations;
            if (parsed.passcodes) passcodes = parsed.passcodes;
            
            showProgressLoader(true, 80, "Biên dịch lại từ khóa...", "Tối ưu hóa bộ nhớ");
            
            const status = document.getElementById('import-status');
            if (status) {
              status.classList.remove('hidden');
              status.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i> Đã phục hồi dữ liệu thành công!`;
            }
            
            await saveAutosaveToCloud();
            showPreview(false);
            updateStats();
            doSearch('');
            initGlobalDropdowns();
            onReportTargetChange();
            renderRules();
            renderViolationLogs();
            renderEvaluationsList();
            populateLoginDropdowns();
            showProgressLoader(false);
            lucide.createIcons();
            showToast('✓ Khôi phục dữ liệu sao lưu thành công!');
          }
        } catch (err) {
          showProgressLoader(false);
          showToast('❌ Định dạng file sao lưu JSON bị lỗi!');
        }
      };
      reader.readAsText(file);
    }

    function switchTab(tab) {
      const allPanels = ['admin', 'giamthi', 'import', 'search', 'rules', 'logs', 'report', 'approval', 'student-self', 'class-manage'];
      
      let activeColor = 'indigo';
      if (currentRole === 'hocsinh') activeColor = 'sky';
      else if (currentRole === 'gvcn') activeColor = 'emerald';
      else if (currentRole === 'giamthi') activeColor = 'teal';
      else if (currentRole === 'bgh') activeColor = 'purple';
      else if (currentRole === 'admin') activeColor = 'rose';

      allPanels.forEach(t => {
        const panel = document.getElementById(`panel-${t}`);
        if (panel) panel.classList.toggle('hidden', t !== tab);
        
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
          // Xóa tất cả các màu hover/active để tránh chồng chéo màu sắc giữa các role
          btn.classList.remove(
            'text-indigo-400', 'border-indigo-400', 
            'text-sky-400', 'border-sky-400', 
            'text-emerald-400', 'border-emerald-400', 
            'text-rose-755', 'border-rose-755', 
            'text-teal-400', 'border-teal-400',
            'text-purple-400', 'border-purple-400', 
            'text-rose-700', 'border-rose-700',
            'bg-slate-800/80', 'text-slate-400', 'border-transparent'
          );
          
          if (t === tab) {
            btn.classList.add(`text-${activeColor}-400`, `border-${activeColor}-400`, 'bg-slate-800/80');
          } else {
            btn.classList.add('text-slate-400', 'border-transparent');
          }
        }
      });

      if (tab === 'report') {
        updateStats();
        onReportTargetChange();
      }
      if (tab === 'search') {
        currentGradeFilter = 0;
        document.getElementById('search-input').value = '';
        updateFilterButtons();
        
        const isGvcn = (currentRole === 'gvcn');
        const inputWrap = document.getElementById('search-input-wrap');
        const filterWrap = document.getElementById('search-filter-wrap');
        
        if (inputWrap) inputWrap.classList.toggle('hidden', isGvcn);
        if (filterWrap) filterWrap.classList.toggle('hidden', isGvcn);
        
        const addStudentBtn = document.getElementById('btn-add-student-search');
        if (addStudentBtn) {
          addStudentBtn.classList.toggle('hidden', currentRole !== 'admin');
        }
        doSearch('');
      }
      if (tab === 'rules') renderRules();
      if (tab === 'logs') renderViolationLogs();
      if (tab === 'approval') {
        const classSelect = document.getElementById('approve-filter-class');
        const approveBatchBtn = document.getElementById('btn-approve-batch-class');
        const exportExcelBtn = document.getElementById('btn-export-excel-class');
        
        if (currentRole === 'gvcn' && loggedInUser?.assignedClass) {
          if (classSelect) {
            classSelect.value = loggedInUser.assignedClass;
            classSelect.disabled = true;
          }
          if (approveBatchBtn) approveBatchBtn.classList.remove('hidden');
          if (exportExcelBtn) exportExcelBtn.classList.remove('hidden');
        } else {
          if (classSelect) {
            classSelect.disabled = false;
          }
          if (approveBatchBtn) approveBatchBtn.classList.add('hidden');
          if (exportExcelBtn) {
            exportExcelBtn.classList.toggle('hidden', !['admin', 'bgh'].includes(currentRole));
          }
        }
        renderEvaluationsList();
      }
      if (tab === 'student-self') loadStudentEvalForm();
      if (tab === 'admin') renderAdminUserList();
      if (tab === 'class-manage') renderClassManagement();
    }

    function handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      showProgressLoader(true, 10, "Đang kết nối tệp Excel...", "Đang phân tích cấu trúc cột");
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          currentWorkbook = wb;
          
          const sheetSelector = document.getElementById('sheet-selector');
          sheetSelector.innerHTML = '';
          
          wb.SheetNames.forEach(sheetName => {
            const opt = document.createElement('option');
            opt.value = sheetName;
            opt.textContent = sheetName;
            sheetSelector.appendChild(opt);
          });
          
          document.getElementById('mapping-card').classList.remove('hidden');
          onSheetSelected();
          showProgressLoader(false);
          showToast('✓ Đọc tệp Excel thành công!');
        } catch (err) {
          showProgressLoader(false);
          showToast('❌ Lỗi định dạng tệp Excel không hợp lệ!');
        }
      };
      reader.readAsBinaryString(file);
    }

    function onSheetSelected() {
      if (!currentWorkbook) return;
      const sheetSelector = document.getElementById('sheet-selector');
      const ws = currentWorkbook.Sheets[sheetSelector.value];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      currentRows = rows;
      if (rows.length === 0) {
        showToast('⚠ Sheet đã chọn không chứa bất kỳ dữ liệu nào!');
        return;
      }
      
      const headers = rows[0] || [];
      const mappingSelects = ['map-name', 'map-class', 'map-gender', 'map-birth', 'map-phone', 'map-phone2', 'map-boarding', 'map-studentid'];
      
      mappingSelects.forEach(selId => {
        const sel = document.getElementById(selId);
        sel.innerHTML = '<option value="-1">-- Không có / Bỏ qua --</option>';
        headers.forEach((h, idx) => {
          const option = document.createElement('option');
          option.value = idx;
          option.textContent = `Cột ${getColumnName(idx)}: "${String(h).trim()}"`;
          sel.appendChild(option);
        });
      });

      autoGuessColumns(headers);
    }

    function getColumnName(index) {
      let label = "";
      while (index >= 0) {
        label = String.fromCharCode((index % 26) + 65) + label;
        index = Math.floor(index / 26) - 1;
      }
      return label;
    }

    function autoGuessColumns(headers) {
      const mappings = {
        'map-name': ['tên', 'họ tên', 'hoten', 'ho ten', 'name', 'học sinh', 'hoc sinh', 'fullname'],
        'map-class': ['lớp', 'lop', 'class', 'mã lớp', 'malop'],
        'map-gender': ['giới tính', 'gioitinh', 'gioi tinh', 'nam/nữ', 'nam/nu', 'gender', 'phái', 'phai'],
        'map-birth': ['năm sinh', 'nam sinh', 'namsinh', 'birth', 'ngày sinh', 'ngay sinh', 'yob'],
        'map-phone': ['sđt', 'sdt', 'điện thoại', 'dien thoai', 'phone', 'liên hệ', 'tel', 'sđt 1', 'sđt chính'],
        'map-phone2': ['sđt 2', 'sđt dự phòng', 'sđt dp', 'điện thoại dự phòng', 'phone 2', 'sđt phụ', 'sdt2'],
        'map-boarding': ['bán trú', 'ban tru', 'boarding', 'đăng ký bán trú', 'ăn bán trú', 'bantru'],
        'map-studentid': ['mã định danh', 'ma dinh danh', 'mã số', 'mã hs', 'ma hs', 'mã học sinh', 'id', 'student id', 'mã bgd']
      };

      for (let key in mappings) {
        const sel = document.getElementById(key);
        let foundIdx = -1;
        
        for (let i = 0; i < headers.length; i++) {
          const title = String(headers[i] || '').toLowerCase().trim();
          if (mappings[key].some(keyword => title.includes(keyword))) {
            foundIdx = i;
            break;
          }
        }
        
        if (foundIdx !== -1) {
          sel.value = foundIdx;
        } else {
          if (key === 'map-name') sel.value = 0;
          else if (key === 'map-class') sel.value = 1;
          else if (key === 'map-studentid') sel.value = -1;
          else sel.value = -1;
        }
      }
    }

    function confirmImport() {
      if (currentRows.length < 2) {
        showToast('⚠ Dữ liệu quá ngắn để phân tích!');
        return;
      }

      const mapName = parseInt(document.getElementById('map-name').value);
      const mapClass = parseInt(document.getElementById('map-class').value);
      const mapGender = parseInt(document.getElementById('map-gender').value);
      const mapBirth = parseInt(document.getElementById('map-birth').value);
      const mapPhone = parseInt(document.getElementById('map-phone').value);
      const mapPhone2 = parseInt(document.getElementById('map-phone2').value);
      const mapBoarding = parseInt(document.getElementById('map-boarding').value);
      const mapStudentId = parseInt(document.getElementById('map-studentid').value);

      if (mapName === -1 || mapClass === -1) {
        showToast('❌ Bắt buộc phải có cột "Họ và tên" và "Lớp học"!');
        return;
      }

      students = [];
      const totalRows = currentRows.length - 1;
      let currentIndex = 1;
      const chunkSize = 200; 

      showProgressLoader(true, 0, "Bắt đầu phân tích Excel...", `Tổng số hàng: ${totalRows}`);

      function importChunk() {
        const endLimit = Math.min(currentIndex + chunkSize, currentRows.length);
        
        for (let i = currentIndex; i < endLimit; i++) {
          const r = currentRows[i];
          if (!r || r.length === 0) continue;
          
          const name = mapName !== -1 && r[mapName] !== undefined ? String(r[mapName]).trim() : '';
          const cls = mapClass !== -1 && r[mapClass] !== undefined ? String(r[mapClass]).trim() : '';
          
          if (!name && !cls) continue;

          const gender = mapGender !== -1 && r[mapGender] !== undefined ? String(r[mapGender]).trim() : 'N/A';
          const birthYear = mapBirth !== -1 && r[mapBirth] !== undefined ? String(r[mapBirth]).trim() : 'N/A';
          const phone = mapPhone !== -1 && r[mapPhone] !== undefined ? String(r[mapPhone]).trim() : 'N/A';
          const phone2 = mapPhone2 !== -1 && r[mapPhone2] !== undefined ? String(r[mapPhone2]).trim() : 'N/A';
          let studentId = mapStudentId !== -1 && r[mapStudentId] !== undefined ? String(r[mapStudentId]).trim() : '';
          
          // Xóa khoảng trắng thừa hoặc ký tự ẩn từ Excel nếu có
          if(studentId) {
             studentId = studentId.replace(/\s+/g, '');
          }

          let boarding = 'Không';
          if (mapBoarding !== -1 && r[mapBoarding] !== undefined) {
            const rawBoarding = String(r[mapBoarding]).trim().toLowerCase();
            if (['có', 'co', 'yes', 'y', 'x', '1', 'true', 'bán trú', 'ban tru'].includes(rawBoarding)) boarding = 'Có';
          }

          students.push({ name, class: cls, gender, birthYear, phone, phone2, boarding, studentId });
        }

        currentIndex = endLimit;
        const progressPercent = Math.round(((currentIndex - 1) / totalRows) * 100);
        showProgressLoader(true, progressPercent, `Đang nạp dữ liệu... (${currentIndex - 1}/${totalRows})`);

        if (currentIndex < currentRows.length) {
          setTimeout(importChunk, 1);
        } else {
          showProgressLoader(true, 95, "Đang đồng bộ hóa khóa tìm kiếm...");
          setTimeout(async () => {
            precalculateKeys(students);
            
            const status = document.getElementById('import-status');
            if (status) {
              status.classList.remove('hidden');
              status.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i> Đã nạp thành công <strong>${students.length} học sinh</strong>!`;
            }
            
            await saveAutosaveToCloud();
            showPreview(false);
            updateStats();
            doSearch('');
            onReportTargetChange();
            populateLoginDropdowns();
            showProgressLoader(false);
            lucide.createIcons();
            showToast('✓ Đồng bộ dữ liệu Excel thành công!');
          }, 50);
        }
      }

      setTimeout(importChunk, 1);
    }

    function getGrade(cls) {
      const m = String(cls).match(/(\d+)/);
      return m ? parseInt(m[1]) : 0;
    }

    function gradeClass(cls) {
      const g = getGrade(cls);
      if (g === 6) return 'grade-6';
      if (g === 7) return 'grade-7';
      if (g === 8) return 'grade-8';
      if (g === 9) return 'grade-9';
      return 'bg-slate-800 text-slate-200 border-l-4 border-slate-500';
    }

    function showPreview(isSample = false) {
      const section = document.getElementById('preview-section');
      const list = document.getElementById('preview-list');
      if (!section || !list) return;

      section.classList.remove('hidden');
      list.innerHTML = students.slice(0, 5).map(s => `
        <div class="${gradeClass(s.class)} rounded-xl p-4 text-slate-900 shadow-lg border border-slate-200/50">
          <div class="font-black truncate text-sm text-slate-800">${s.name}</div>
          <div class="text-xs font-semibold mt-1">Lớp: ${s.class}</div>
          <div class="text-2xs font-mono mt-1 text-indigo-700 bg-white/50 inline-block px-1.5 py-0.5 rounded">ID: ${s.studentId || 'N/A'}</div>
        </div>
      `).join('');

      if (students.length > 5) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'col-span-1 md:col-span-2 lg:col-span-5 text-center py-3 bg-slate-800 rounded-xl text-slate-400 text-sm font-semibold border border-slate-700 shadow-inner';
        moreDiv.textContent = `... và ${students.length - 5} học sinh khác đã nạp.`;
        list.appendChild(moreDiv);
      }
      lucide.createIcons();
    }

    function filterGrade(grade) {
      currentGradeFilter = grade;
      updateFilterButtons();
      doSearch(document.getElementById('search-input')?.value || '');
    }

    function updateFilterButtons() {
      for (let g of [0, 6, 7, 8, 9]) {
        const btn = document.getElementById(`filter-${g}`);
        if (!btn) continue;
        if (currentGradeFilter === g) {
          btn.className = "px-5 py-2 rounded-lg text-white text-xs font-bold transition shadow-lg";
          if (g === 0) btn.classList.add('bg-indigo-600');
          else if (g === 6) btn.classList.add('bg-sky-600');
          else if (g === 7) btn.classList.add('bg-emerald-600');
          else if (g === 8) btn.classList.add('bg-amber-600');
          else if (g === 9) btn.classList.add('bg-pink-600');
        } else {
          btn.className = "px-5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-colors shadow-inner";
        }
      }
    }

    function onSearchInput(val) {
      searchLimit = 40; 
      doSearch(val);
    }

    function showMoreSearchResults() {
      searchLimit += 40; 
      doSearch(document.getElementById('search-input')?.value || '');
    }

    function doSearch(q) {
      const originalQuery = q.trim().normalize('NFC');
      const lowerQuery = originalQuery.toLowerCase();
      const toneRemovedQuery = removeVietnameseTones(lowerQuery);
      
      const searchResults = document.getElementById('search-results');
      const count = document.getElementById('search-count');
      const loadMoreBtn = document.getElementById('search-more-container');
      
      if (!searchResults) return;

      if (students.length === 0) {
        count.innerHTML = '<span class="text-rose-400">Danh sách trống! Hãy nạp file Excel.</span>';
        searchResults.innerHTML = '';
        loadMoreBtn?.classList.add('hidden');
        return;
      }

      filteredCache = students.filter(s => {
        // GVCN chỉ thấy học sinh của lớp mình chủ nhiệm
        if (currentRole === 'gvcn' && loggedInUser?.assignedClass) {
          if (s.class !== loggedInUser.assignedClass) return false;
        }

        if (!originalQuery) return currentGradeFilter === 0 || s.grade === currentGradeFilter;

        const matchName = s.nameLower.endsWith(lowerQuery) || s.nameClean.endsWith(toneRemovedQuery);
        const matchClass = s.classLower.includes(lowerQuery);
        const matchPhone = s.phoneClean.includes(lowerQuery) || s.phone2Clean.includes(lowerQuery);
        const matchId = String(s.studentId).toLowerCase().includes(lowerQuery);

        return (matchName || matchClass || matchPhone || matchId) && (currentGradeFilter === 0 || s.grade === currentGradeFilter);
      });

      if (filteredCache.length === 0) {
        count.textContent = '0 kết quả';
        searchResults.innerHTML = `
          <div class="col-span-full py-16 text-center text-slate-500 space-y-3 bg-slate-800 rounded-xl border border-slate-700">
            <div class="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-2">
              <i data-lucide="search-x" class="w-8 h-8 text-slate-600"></i>
            </div>
            <p class="font-semibold text-slate-400">Không tìm thấy học sinh phù hợp</p>
          </div>
        `;
        loadMoreBtn?.classList.add('hidden');
        return;
      }

      filteredCache.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        const classComp = a.class.localeCompare(b.class, 'vi', { numeric: true });
        if (classComp !== 0) return classComp;
        return compareVietnameseNames(a, b);
      });

      count.innerHTML = `Tìm thấy <strong class="text-indigo-400">${filteredCache.length}</strong> học sinh`;

      const paginated = filteredCache.slice(0, searchLimit);
      if (filteredCache.length > searchLimit) loadMoreBtn?.classList.remove('hidden');
      else loadMoreBtn?.classList.add('hidden');
      
      searchResults.innerHTML = paginated.map((s) => {
        const realIdx = students.indexOf(s);
        const stViolations = violations.filter(v => v.studentName === s.name && v.studentClass === s.class);
        const totalDeducted = stViolations.reduce((sum, v) => sum + parseFloat(v.points || 0), 0);
        
        // Admin và BGH được sửa toàn bộ; GVCN chỉ được sửa học sinh lớp phụ trách
        const canEdit = (currentRole === 'admin' || currentRole === 'bgh') || 
                        (currentRole === 'gvcn' && loggedInUser?.assignedClass && s.class === loggedInUser.assignedClass);
        // Chỉ admin mới có quyền xóa học sinh
        const canDelete = (currentRole === 'admin');

        return `
        <div class="${gradeClass(s.class)} rounded-xl p-4 text-slate-900 shadow-md hover:-translate-y-1 transition-transform flex items-center justify-between border border-slate-200">
          <div class="flex-1 min-w-0 pr-2">
            <div class="flex items-center gap-2 mb-1">
              <div class="font-black text-base truncate flex-1">${s.name}</div>
              ${s.classRole ? `<span class="bg-indigo-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">${s.classRole}</span>` : ''}
            </div>
            <div class="flex flex-wrap items-center gap-1.5 mb-2">
              <span class="bg-white/80 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Lớp ${s.class}</span>
              ${s.boarding === 'Có' ? `<span class="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Bán Trú</span>` : ''}
              ${s.groupNumber ? `<span class="bg-amber-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Tổ ${s.groupNumber}</span>` : ''}
              ${totalDeducted > 0 ? `<span class="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">-${totalDeducted}đ</span>` : ''}
            </div>
            <div class="text-[10px] font-mono text-slate-600 truncate bg-white/50 inline-block px-1.5 py-0.5 rounded">
              ID: ${s.studentId || 'Chưa có mã ĐD'}
            </div>
          </div>
          <div class="flex flex-col gap-2 shrink-0">
            <button onclick="openViolationModal(${realIdx})" class="bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg transition-transform active:scale-95">
              <i data-lucide="shield-alert" class="w-4 h-4"></i> Phạt
            </button>
            ${(canEdit || canDelete) ? `
            <div class="flex gap-1">
              ${canEdit ? `
              <button onclick="openStudentModal(${realIdx})" class="flex-1 bg-indigo-700/80 hover:bg-indigo-600 text-white px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95" title="Sửa thông tin">
                <i data-lucide="pencil" class="w-3 h-3"></i> Sửa
              </button>` : ''}
              ${canDelete ? `
              <button onclick="deleteStudentPrompt(${realIdx})" class="bg-slate-700/80 hover:bg-rose-700 text-slate-300 hover:text-white px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95" title="Xóa học sinh">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
              </button>` : ''}
            </div>` : ''}
          </div>
        </div>
      `;
      }).join('');
      lucide.createIcons();
    }

    // ================================================================
    // STUDENT CRUD MODAL: Thêm / Sửa học sinh thủ công
    // ================================================================

    let _studentEditIdx = null; // null = thêm mới, số = sửa

    function openStudentModal(idx) {
      _studentEditIdx = idx;
      const modal = document.getElementById('student-modal');
      const title = document.getElementById('student-modal-title');
      const errBox = document.getElementById('student-modal-error');
      errBox.classList.add('hidden');

      if (idx === null || idx === undefined) {
        // Thêm mới
        title.innerHTML = '<i data-lucide="user-plus" class="w-5 h-5"></i> Thêm Học Sinh Mới';
        document.getElementById('sm-name').value = '';
        document.getElementById('sm-class').value = '';
        document.getElementById('sm-gender').value = 'Nam';
        document.getElementById('sm-birthyear').value = '';
        document.getElementById('sm-boarding').value = 'Không';
        document.getElementById('sm-phone').value = '';
        document.getElementById('sm-phone2').value = '';
        document.getElementById('sm-studentid').value = '';
        document.getElementById('sm-parent-info').value = '';
        document.getElementById('sm-parent-job').value = '';
        document.getElementById('sm-group-number').value = '';
        document.getElementById('sm-class-role').value = '';
        document.getElementById('sm-special-notes').value = '';
      } else {
        // Sửa học sinh hiện có
        const s = students[idx];
        title.innerHTML = `<i data-lucide="pencil" class="w-5 h-5"></i> Sửa thông tin: ${s.name}`;
        document.getElementById('sm-name').value = s.name || '';
        document.getElementById('sm-class').value = s.class || '';
        document.getElementById('sm-gender').value = s.gender || 'Nam';
        document.getElementById('sm-birthyear').value = s.birthYear || '';
        document.getElementById('sm-boarding').value = s.boarding || 'Không';
        document.getElementById('sm-phone').value = s.phone && s.phone !== 'N/A' ? s.phone : '';
        document.getElementById('sm-phone2').value = s.phone2 && s.phone2 !== 'N/A' ? s.phone2 : '';
        document.getElementById('sm-studentid').value = s.studentId || '';
        document.getElementById('sm-parent-info').value = s.parentInfo || '';
        document.getElementById('sm-parent-job').value = s.parentJob || '';
        document.getElementById('sm-group-number').value = s.groupNumber || '';
        document.getElementById('sm-class-role').value = s.classRole || '';
        document.getElementById('sm-special-notes').value = s.specialNotes || '';
      }

      modal.classList.remove('hidden');
      lucide.createIcons();
      document.getElementById('sm-name').focus();
    }

    function closeStudentModal() {
      document.getElementById('student-modal').classList.add('hidden');
      _studentEditIdx = null;
    }

    async function saveStudentModal() {
      const name = document.getElementById('sm-name').value.trim();
      const cls  = document.getElementById('sm-class').value.trim();
      const errBox = document.getElementById('student-modal-error');
      const errMsg = document.getElementById('student-modal-error-msg');

      // Validate bắt buộc
      if (!name) {
        errMsg.textContent = 'Vui lòng nhập họ và tên học sinh!';
        errBox.classList.remove('hidden');
        document.getElementById('sm-name').focus();
        return;
      }
      if (!cls) {
        errMsg.textContent = 'Vui lòng nhập lớp học!';
        errBox.classList.remove('hidden');
        document.getElementById('sm-class').focus();
        return;
      }

      const studentIdRaw = document.getElementById('sm-studentid').value.replace(/\s+/g, '');
      if (studentIdRaw && !/^\d{10}$/.test(studentIdRaw)) {
        errMsg.textContent = 'Mã định danh phải là 10 chữ số (hoặc để trống)!';
        errBox.classList.remove('hidden');
        document.getElementById('sm-studentid').focus();
        return;
      }

      // Kiểm tra trùng mã định danh (nếu có)
      if (studentIdRaw) {
        const dupIdx = students.findIndex((s, i) =>
          s.studentId === studentIdRaw && (_studentEditIdx === null || i !== _studentEditIdx)
        );
        if (dupIdx !== -1) {
          errMsg.textContent = `Mã định danh ${studentIdRaw} đã tồn tại cho học sinh: ${students[dupIdx].name} (${students[dupIdx].class})!`;
          errBox.classList.remove('hidden');
          return;
        }
      }

      errBox.classList.add('hidden');

      const newData = {
        name,
        class: cls,
        gender:       document.getElementById('sm-gender').value || 'Nam',
        birthYear:    document.getElementById('sm-birthyear').value.trim() || 'N/A',
        phone:        document.getElementById('sm-phone').value.trim() || 'N/A',
        phone2:       document.getElementById('sm-phone2').value.trim() || 'N/A',
        boarding:     document.getElementById('sm-boarding').value || 'Không',
        studentId:    studentIdRaw || '',
        parentInfo:   document.getElementById('sm-parent-info').value.trim(),
        parentJob:    document.getElementById('sm-parent-job').value.trim(),
        groupNumber:  document.getElementById('sm-group-number').value.trim(),
        classRole:    document.getElementById('sm-class-role').value,
        specialNotes: document.getElementById('sm-special-notes').value.trim(),
      };

      // Lưu vào mảng students
      if (_studentEditIdx === null) {
        students.push(newData);
        showToast(`✓ Đã thêm học sinh: ${name} (${cls})`);
      } else {
        // Giữ nguyên các trường search-cache của object cũ
        students[_studentEditIdx] = { ...students[_studentEditIdx], ...newData };
        showToast(`✓ Đã cập nhật thông tin: ${name}`);
      }

      // Tính lại khóa tìm kiếm và lưu
      precalculateKeys(students);
      await saveAutosaveToCloud();
      doSearch(document.getElementById('search-input')?.value || '');
      updateStats();
      populateLoginDropdowns();
      closeStudentModal();
    }

    function deleteStudentPrompt(idx) {
      const s = students[idx];
      showConfirm(
        'Xóa học sinh',
        `Xác nhận xóa học sinh "${s.name}" (${s.class}) khỏi hệ thống? Thao tác này sẽ không xóa dữ liệu vi phạm và phiếu đánh giá liên quan.`,
        async () => {
          students.splice(idx, 1);
          precalculateKeys(students);
          await saveAutosaveToCloud();
          doSearch(document.getElementById('search-input')?.value || '');
          updateStats();
          showToast(`✓ Đã xóa học sinh: ${s.name}`);
        }
      );
    }

    let activeStudentIndex = null;
    function openViolationModal(idx) {
      activeStudentIndex = idx;
      const s = students[idx];
      
      document.getElementById('violation-target-name').textContent = s.name;
      document.getElementById('violation-target-class').textContent = s.class;
      document.getElementById('violation-note').value = '';
      document.getElementById('violation-date').value = '';
      document.getElementById('violation-selected-date-label').textContent = '';
      document.getElementById('violation-calendar-wrap').classList.add('hidden');
      document.getElementById('violation-date-error').classList.add('hidden');

      // Thiết lập Học kỳ mặc định dựa theo tháng hiện tại
      const now = new Date();
      const nowMonth = now.getMonth() + 1;
      const defSem = (nowMonth >= 9 || nowMonth === 1) ? 'Học kỳ I' : 'Học kỳ II';
      // Học kỳ I: tháng 9-12; Học kỳ II: tháng 1-5
      const semEl = document.getElementById('violation-semester');
      semEl.value = (nowMonth >= 9) ? 'Học kỳ I' : 'Học kỳ II';

      // Tự động cascade
      onViolSemesterChange();

      // Auto-select tháng hiện tại nếu hợp lệ
      const monthSel = document.getElementById('violation-month');
      const monthOpts = Array.from(monthSel.options).map(o => parseInt(o.value));
      if (monthOpts.includes(nowMonth)) {
        monthSel.value = nowMonth;
        onViolMonthChange();
      }

      document.getElementById('violation-modal').classList.remove('hidden');
    }

    function closeViolationModal() {
      document.getElementById('violation-modal').classList.add('hidden');
      activeStudentIndex = null;
    }

    async function saveStudentViolation() {
      if (activeStudentIndex === null) return;
      const s = students[activeStudentIndex];
      const ruleId = document.getElementById('violation-type-select').value;
      const rule = violationTypes.find(r => r.id === ruleId);
      
      if (!rule) return;

      const dateStr = document.getElementById('violation-date').value;
      if (!dateStr) {
        showToast('❌ Vui lòng chọn ngày vi phạm trên lịch (Thứ 2 đến Thứ 6)!');
        // Chỉ đến ô lỗi
        const errEl = document.getElementById('violation-date-error');
        errEl.querySelector('span').textContent = 'Bắt buộc phải chọn ngày vi phạm từ lịch bên trên!';
        errEl.classList.remove('hidden');
        setTimeout(() => errEl.classList.add('hidden'), 4000);
        return;
      }

      // Kiểm tra lại ngày được chọn không phải T7/CN
      const selectedDow = new Date(dateStr).getDay();
      if (selectedDow === 0 || selectedDow === 6) {
        showToast('❌ Không thể chọn ngày Thứ 7 hoặc Chủ Nhật! Vui lòng chọn lại từ T2-T6.');
        document.getElementById('violation-date').value = '';
        document.getElementById('violation-selected-date-label').textContent = 'Chưa chọn ngày';
        return;
      }

      const weekVal = document.getElementById('violation-week').value;
      const monthVal = document.getElementById('violation-month').value;
      const semVal = document.getElementById('violation-semester').value;
      const noteVal = document.getElementById('violation-note').value.trim();

      if (!monthVal) {
        showToast('❌ Vui lòng chọn Tháng!');
        return;
      }
      if (!weekVal) {
        showToast('❌ Vui lòng chọn Tuần học!');
        return;
      }

      const newViolation = {
        id: 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        studentName: s.name,
        studentClass: s.class,
        ruleId: rule.id,
        ruleName: rule.name,
        points: rule.points,
        category: rule.category,
        date: dateStr,
        week: String(weekVal),
        month: String(monthVal),
        semester: semVal,
        note: noteVal
      };

      violations.push(newViolation);
      await saveAutosaveToCloud();
      
      closeViolationModal();
      showToast('✓ Đã ghi sổ vi phạm thành công!');
      
      doSearch(document.getElementById('search-input')?.value || '');
      updateStats();
      renderViolationLogs();
      generateReportPreview();

      // ===== TỰ ĐỘNG CẬP NHẬT PHIẾU ĐÁNH GIÁ CỦA HỌC SINH =====
      await autoRecalcEvalForStudent(s.name, s.class, monthVal);
      await saveAutosaveToCloud();
    }

    function renderRules() {
      const tbody = document.getElementById('rules-table-body');
      const badge = document.getElementById('rules-count-badge');
      if (!tbody) return;
      
      badge.textContent = `${violationTypes.length} lỗi`;
      tbody.innerHTML = violationTypes.map(rule => `
        <tr class="hover:bg-slate-700/50 transition-colors">
          <td class="py-3 px-4">
            <span class="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-lg">${rule.category}</span>
          </td>
          <td class="py-3 px-4 font-medium text-slate-200">${rule.name}</td>
          <td class="py-3 px-4 text-center">
            <span class="text-rose-400 font-black text-sm bg-rose-500/10 px-2 py-0.5 rounded">-${rule.points}đ</span>
          </td>
          <td class="py-3 px-4 text-center">
            <button onclick="deleteRulePrompt('${rule.id}')" class="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-500 hover:text-white transition-colors shadow">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `).join('');
      lucide.createIcons();
    }

    async function saveRule() {
      const name = document.getElementById('rule-name-input').value.trim();
      const points = parseFloat(document.getElementById('rule-points-input').value);
      const category = document.getElementById('rule-category-input').value;

      if (!name || isNaN(points)) {
        showToast('❌ Vui lòng nhập đầy đủ tên lỗi và điểm trừ!');
        return;
      }

      const newRule = {
        id: 'rule_' + Date.now(),
        name: name,
        points: points,
        category: category
      };
      violationTypes.push(newRule);
      showToast('✓ Đã thêm mã lỗi mới!');

      await saveAutosaveToCloud();
      resetRuleForm();
      initGlobalDropdowns();
      renderRules();
    }

    function resetRuleForm() {
      document.getElementById('rule-name-input').value = '';
      document.getElementById('rule-points-input').value = '';
    }

    function deleteRulePrompt(id) {
      showConfirm(
        'Xóa mã lỗi',
        'Xác nhận gỡ bỏ định nghĩa lỗi này khỏi hệ thống?',
        async () => {
          violationTypes = violationTypes.filter(r => r.id !== id);
          await saveAutosaveToCloud();
          initGlobalDropdowns();
          renderRules();
        }
      );
    }

    function renderViolationLogs() {
      const tbody = document.getElementById('logs-table-body');
      const emptyView = document.getElementById('logs-empty-view');
      const filterWeek = document.getElementById('log-filter-week').value;
      const searchQ = document.getElementById('log-search-input').value.trim().toLowerCase();

      if (!tbody) return;

      let filteredLogs = violations.filter(v => {
        const matchWeek = (filterWeek === 'all') || (v.week === filterWeek);
        const matchText = (v.studentName.toLowerCase().includes(searchQ) || v.studentClass.toLowerCase().includes(searchQ) || v.ruleName.toLowerCase().includes(searchQ));
        return matchWeek && matchText;
      });

      filteredLogs.sort((a,b) => new Date(b.date) - new Date(a.date));

      if (filteredLogs.length === 0) {
        tbody.innerHTML = '';
        emptyView.classList.remove('hidden');
        return;
      }
      emptyView.classList.add('hidden');

      tbody.innerHTML = filteredLogs.map(v => `
        <tr class="hover:bg-slate-700/50 transition-colors">
          <td class="py-3 px-4 text-slate-400 text-xs">
            ${new Date(v.date).toLocaleDateString('vi-VN')}<br>
            <span class="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Tuần ${v.week}</span>
          </td>
          <td class="py-3 px-4 font-bold text-slate-100">${v.studentName}</td>
          <td class="py-3 px-3 text-center">
            <span class="bg-slate-700 text-slate-200 font-bold px-2.5 py-1 rounded-lg text-xs">${v.studentClass}</span>
          </td>
          <td class="py-3 px-4 font-medium text-rose-300 leading-tight">${v.ruleName}</td>
          <td class="py-3 px-3 text-center text-rose-400 font-black text-sm bg-rose-500/10 rounded-lg">-${v.points}đ</td>
          <td class="py-3 px-3 text-center">
            <span class="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">${v.category}</span>
          </td>
          <td class="py-3 px-4 text-slate-400 italic text-xs truncate max-w-[150px]" title="${v.note || ''}">${v.note || '-'}</td>
          <td class="py-3 px-3 text-center">
            <button onclick="deleteViolationLogPrompt('${v.id}')" class="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-500 hover:text-white transition-colors shadow">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `).join('');
      lucide.createIcons();
    }

    function deleteViolationLogPrompt(id) {
      showConfirm(
        'Xóa bản ghi',
        'Xác nhận gỡ bỏ bản ghi kỷ luật này khỏi sổ tay của học sinh?',
        async () => {
          // Lấy thông tin vi phạm trước khi xóa
          const removedViol = violations.find(v => v.id === id);

          // Kiểm tra quyền GVCN: chỉ được xóa vi phạm của học sinh thuộc lớp mình
          if (currentRole === 'gvcn' && loggedInUser?.assignedClass) {
            if (removedViol && removedViol.studentClass !== loggedInUser.assignedClass) {
              showToast('❌ Từ chối quyền: Bạn chỉ có thể xóa vi phạm của học sinh trong lớp ' + loggedInUser.assignedClass);
              return;
            }
          }

          // ===== AUDIT LOG: Ghi lị sử xóa vi phạm lên Firestore =====
          if (db && removedViol) {
            try {
              const currentUser = auth?.currentUser;
              const auditRef = window.FirebaseSDK.collection(db, 'audit_logs');
              await window.FirebaseSDK.addDoc(auditRef, {
                action: 'DELETE_VIOLATION',
                violationId: id,
                violationData: {
                  studentName: removedViol.studentName,
                  studentClass: removedViol.studentClass,
                  ruleName: removedViol.ruleName,
                  date: removedViol.date,
                  points: removedViol.points
                },
                performedBy: currentUser ? currentUser.uid : 'anonymous',
                performedByEmail: currentUser ? (currentUser.email || loggedInUser?.displayName || 'N/A') : 'anonymous',
                performedByRole: currentRole || 'unknown',
                timestamp: window.FirebaseSDK.serverTimestamp(),
                appId: appId || 'unknown'
              });
              console.log('[AuditLog] DELETE_VIOLATION logged for id:', id);
            } catch (auditErr) {
              // Không chặn thao tác xóa nếu audit log bị lỗi
              console.warn('[AuditLog] Failed to write audit log:', auditErr.code, auditErr.message);
            }
          }

          violations = violations.filter(v => v.id !== id);
          await saveAutosaveToCloud();
          renderViolationLogs();
          updateStats();
          generateReportPreview();

          // ===== TỰ ĐỘNG CẬP NHẬT PHIẾU ĐÁNH GIÁ KHI XÓA VI PHẠM =====
          if (removedViol) {
            await autoRecalcEvalForStudent(removedViol.studentName, removedViol.studentClass, removedViol.month);
            await saveAutosaveToCloud();
          }
        }
      );
    }

    function updateStats() {
      const grades = [6,7,8,9];
      const colors = ['bg-sky-600','bg-emerald-600','bg-amber-600','bg-pink-600'];
      
      const statsPanel = document.getElementById('stats');
      if (!statsPanel) return;

      statsPanel.innerHTML = grades.map((g,i) => {
        const c = students.filter(s => (s.grade || getGrade(s.class)) === g).length;
        return `
          <div class="${colors[i]} rounded-xl p-5 text-center shadow-lg transform hover:-translate-y-1 transition-transform relative overflow-hidden">
            <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-md"></div>
            <div class="text-4xl font-black text-white relative z-10">${c}</div>
            <div class="text-xs text-white/90 mt-1.5 font-bold uppercase tracking-wider relative z-10">Khối ${g}</div>
          </div>`;
      }).join('') + `
        <div class="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-5 text-center shadow-lg transform hover:-translate-y-1 transition-transform relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-md"></div>
          <div class="text-4xl font-black text-white relative z-10">${students.length}</div>
          <div class="text-xs text-indigo-100 mt-1.5 font-bold uppercase tracking-wider relative z-10">Toàn Trường</div>
        </div>`;
    }

    function onReportTargetChange() {
      const gradeVal = document.getElementById('report-grade-select').value;
      const classSelect = document.getElementById('report-class-select');
      if (!classSelect) return;

      classSelect.innerHTML = '<option value="all">Tất cả lớp học</option>';

      let availableClasses = [];
      students.forEach(s => {
        const g = s.grade || getGrade(s.class);
        if (gradeVal === 'all' || String(g) === gradeVal) {
          if (!availableClasses.includes(s.class)) availableClasses.push(s.class);
        }
      });

      availableClasses.sort((a,b) => a.localeCompare(b, 'vi', { numeric: true }));
      availableClasses.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls;
        opt.textContent = `Lớp ${cls}`;
        classSelect.appendChild(opt);
      });

      generateReportPreview();
    }

    function onReportTypeChange() {
      const type = document.getElementById('report-type-select').value;
      document.getElementById('sub-report-students').classList.toggle('hidden', type !== 'students');
      document.getElementById('sub-report-emulation').classList.toggle('hidden', type !== 'emulation');
      
      if (type === 'emulation') onEmuScopeTypeChange();
      else generateReportPreview();
    }

    function onEmuScopeTypeChange() {
      const scopeType = document.getElementById('emu-scope-type').value;
      const scopeValSelect = document.getElementById('emu-scope-value');
      scopeValSelect.innerHTML = '';

      if (scopeType === 'week') {
        for (let w = 1; w <= 37; w++) {
          const opt = document.createElement('option');
          opt.value = w;
          opt.textContent = `Tuần ${w}`;
          scopeValSelect.appendChild(opt);
        }
        if (violations.some(v => v.week === '10')) scopeValSelect.value = '10';
      } else if (scopeType === 'month') {
        for (let m = 1; m <= 12; m++) {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = `Tháng ${m}`;
          scopeValSelect.appendChild(opt);
        }
        if (violations.some(v => v.month === '10')) scopeValSelect.value = '10';
      } else if (scopeType === 'semester') {
        ['Học kỳ I', 'Học kỳ II'].forEach(o => {
          const opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o;
          scopeValSelect.appendChild(opt);
        });
      }

      generateReportPreview();
    }

    function generateReportPreview() {
      const previewContainer = document.getElementById('report-preview-sheet');
      const reportType = document.getElementById('report-type-select').value;
      
      if (!previewContainer) return;

      if (students.length === 0) {
        previewContainer.innerHTML = `<div class="text-center py-20 text-slate-400">Không có dữ liệu để lập báo cáo</div>`;
        return;
      }

      let currentDate = new Date();
      let dateString = `Ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`;

      if (reportType === 'students') {
        const selectedGrade = document.getElementById('report-grade-select').value;
        const selectedClass = document.getElementById('report-class-select').value;
        const selectedBoarding = document.getElementById('report-boarding-select').value;

        let targetList = students.filter(s => {
          const g = s.grade || getGrade(s.class);
          const matchGrade = (selectedGrade === 'all') || (String(g) === selectedGrade);
          const matchClass = (selectedClass === 'all') || (s.class === selectedClass);
          let matchBoarding = selectedBoarding === 'all' || (selectedBoarding === 'yes' ? s.boarding === 'Có' : s.boarding === 'Không');
          return matchGrade && matchClass && matchBoarding;
        });

        targetList.sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          const classComp = a.class.localeCompare(b.class, 'vi', { numeric: true });
          if (classComp !== 0) return classComp;
          return compareVietnameseNames(a, b);
        });

        previewContainer.innerHTML = `
          <div style="border-bottom: 2px solid #000; padding-bottom: 10px; display: flex; justify-content: space-between;">
            <div class="text-center">
              <div class="font-semibold text-[10px] uppercase">ỦY BAN NHÂN DÂN PHƯỜNG BÌNH TIÊN</div>
              <div class="font-black text-xs text-indigo-900 uppercase">TRƯỜNG THCS PHẠM ĐÌNH HỔ</div>
              <div style="margin-top: 2px; width: 60%; height: 1px; background-color: #000; margin-left: auto; margin-right: auto;"></div>
            </div>
            <div class="text-center">
              <div class="font-black text-[10px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div class="font-bold text-[10px] underline">Độc lập - Tự do - Hạnh phúc</div>
            </div>
          </div>
          <div class="text-center py-6">
            <h2 class="text-lg font-black uppercase text-slate-900">DANH SÁCH LÝ LỊCH HỌC SINH</h2>
            <p class="text-[11px] italic mt-1 font-semibold text-slate-600">Tổng số trích xuất: ${targetList.length} học sinh</p>
          </div>
          <table class="w-full border-collapse border border-slate-400 text-[11px]">
            <thead>
              <tr class="bg-slate-100 font-bold">
                <th class="border border-slate-400 p-2 text-center w-[5%]">STT</th>
                <th class="border border-slate-400 p-2 text-left w-[25%]">Họ và Tên</th>
                <th class="border border-slate-400 p-2 text-center w-[15%]">Mã định danh (BGD)</th>
                <th class="border border-slate-400 p-2 text-center w-[10%]">Lớp học</th>
                <th class="border border-slate-400 p-2 text-center w-[10%]">Giới tính</th>
                <th class="border border-slate-400 p-2 text-center w-[20%]">SĐT liên hệ</th>
                <th class="border border-slate-400 p-2 text-center w-[10%]">Bán trú</th>
              </tr>
            </thead>
            <tbody>
              ${targetList.map((s, idx) => `
                <tr>
                  <td class="border border-slate-400 p-2 text-center">${idx + 1}</td>
                  <td class="border border-slate-400 p-2 font-bold">${s.name}</td>
                  <td class="border border-slate-400 p-2 text-center font-mono text-indigo-800 font-bold">${s.studentId || '-'}</td>
                  <td class="border border-slate-400 p-2 text-center font-bold">${s.class}</td>
                  <td class="border border-slate-400 p-2 text-center">${s.gender}</td>
                  <td class="border border-slate-400 p-2 text-center">${s.phone}</td>
                  <td class="border border-slate-400 p-2 text-center font-bold">${s.boarding || 'Không'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        const scopeType = document.getElementById('emu-scope-type').value;
        const scopeValue = document.getElementById('emu-scope-value').value;

        let allClasses = [...new Set(students.map(s => s.class))];
        allClasses.sort((a,b) => a.localeCompare(b, 'vi', { numeric: true }));

        const scopeViolations = violations.filter(v => {
          if (scopeType === 'week') return v.week === scopeValue;
          if (scopeType === 'month') return v.month === scopeValue;
          if (scopeType === 'semester') return v.semester === scopeValue;
          return true;
        });

        let classEmuList = allClasses.map(className => {
          const classViolations = scopeViolations.filter(v => v.studentClass === className);
          const totalDeducted = classViolations.reduce((sum, v) => sum + parseFloat(v.points || 0), 0);
          return {
            className,
            grade: getGrade(className),
            violationsCount: classViolations.length,
            pointsDeducted: totalDeducted,
            finalScore: 100 - totalDeducted
          };
        });

        previewContainer.innerHTML = `
          <div style="border-bottom: 2px solid #000; padding-bottom: 10px; display: flex; justify-content: space-between;">
            <div class="text-center">
              <div class="font-semibold text-[10px] uppercase">ỦY BAN NHÂN DÂN PHƯỜNG BÌNH TIÊN</div>
              <div class="font-black text-xs text-indigo-900 uppercase">TRƯỜNG THCS PHẠM ĐÌNH HỔ</div>
              <div style="margin-top: 2px; width: 60%; height: 1px; background-color: #000; margin-left: auto; margin-right: auto;"></div>
            </div>
            <div class="text-center">
              <div class="font-black text-[10px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div class="font-bold text-[10px] underline">Độc lập - Tự do - Hạnh phúc</div>
            </div>
          </div>
          <div class="text-center py-6">
            <h2 class="text-lg font-black text-slate-900 uppercase">BÁO CÁO THI ĐUA TẬP THỂ LỚP</h2>
            <p class="text-[11px] font-bold mt-1 text-slate-700">Theo ${scopeType === 'week' ? 'Tuần' : scopeType === 'month' ? 'Tháng' : 'Học kỳ'} ${scopeValue}</p>
            <p class="text-[10px] italic mt-1 text-slate-500">Chuẩn gốc thi đua: 100 điểm</p>
          </div>
          <table class="w-full border-collapse border border-slate-400 text-[11px]">
            <thead>
              <tr class="bg-slate-100 font-bold">
                <th class="border border-slate-400 p-2.5 text-left">Lớp học</th>
                <th class="border border-slate-400 p-2.5 text-center">Khối</th>
                <th class="border border-slate-400 p-2.5 text-center">Số lượt vi phạm</th>
                <th class="border border-slate-400 p-2.5 text-center">Điểm trừ phạt</th>
                <th class="border border-slate-400 p-2.5 text-center">Tổng điểm thi đua</th>
              </tr>
            </thead>
            <tbody>
              ${classEmuList.map(item => `
                <tr>
                  <td class="border border-slate-400 p-2.5 font-bold">${item.className}</td>
                  <td class="border border-slate-400 p-2.5 text-center">${item.grade}</td>
                  <td class="border border-slate-400 p-2.5 text-center font-semibold">${item.violationsCount}</td>
                  <td class="border border-slate-400 p-2.5 text-center text-red-600 font-bold">-${item.pointsDeducted}đ</td>
                  <td class="border border-slate-400 p-2.5 text-center text-indigo-900 font-black">${item.finalScore}đ</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    function printReport() {
      const previewHtml = document.getElementById('report-preview-sheet').innerHTML;
      document.getElementById('print-content').innerHTML = previewHtml;
      window.print();
    }

    function exportReport() {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['DANH SÁCH BÁO CÁO HỌC ĐƯỜNG'],
        [`Ngày xuất bản: ${new Date().toLocaleDateString('vi-VN')}`],
        [],
        ['Họ tên', 'Lớp', 'Mã định danh (BGD)', 'Giới tính', 'Năm sinh', 'Số điện thoại', 'Bán trú']
      ];

      students.forEach(s => {
        wsData.push([s.name, s.class, s.studentId || '', s.gender, s.birthYear, s.phone, s.boarding]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, 'DanhSach_ThongKe_HocSinh.xlsx');
    }

    // QR sharing utilities
    function openQrModal() {
      const img = document.getElementById('qr-code-img');
      const urlText = document.getElementById('qr-link-url');
      const syncInput = document.getElementById('sync-channel-input');

      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`;
      img.src = qrApiUrl;
      urlText.textContent = window.location.href;
      syncInput.value = syncChannelCode;

      document.getElementById('qr-modal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeQrModal() {
      document.getElementById('qr-modal').classList.add('hidden');
    }

    function copyQrLink() {
      const textarea = document.createElement('textarea');
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast("✓ Đã sao chép liên kết!");
    }

    async function changeSyncChannel() {
      const val = document.getElementById('sync-channel-input').value.trim().toUpperCase();
      if (!val) return;
      
      syncChannelCode = val;
      localStorage.setItem("find_hs_sync_channel", val);
      closeQrModal();
      showToast(`🔄 Đang chuyển kết nối sang kênh: ${val}`);
      startRealtimeSync();
    }

    function showConfirm(title, message, onConfirm) {
      document.getElementById('confirm-title').innerText = title;
      document.getElementById('confirm-message').innerText = message;
      confirmCallback = onConfirm;
      document.getElementById('confirm-modal').classList.remove('hidden');
    }

    function closeConfirm(agreed) {
      document.getElementById('confirm-modal').classList.add('hidden');
      if (agreed && confirmCallback) confirmCallback();
      confirmCallback = null;
    }

    function showToast(msg) {
      const existing = document.getElementById('dynamic-toast');
      if (existing) existing.remove();

      const t = document.createElement('div');
      t.id = 'dynamic-toast';
      t.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white border-2 border-indigo-500 px-6 py-3.5 rounded-xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] text-sm z-50 animate-bounce font-bold';
      t.innerHTML = `<span>${msg}</span>`;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }

    // ================================================================
    // GVCN PANEL: QUẢN LÝ LỚP CHỦ NHIỆM PHỤ TRÁCH
    // ================================================================
    function renderClassManagement() {
      const tbody = document.getElementById('class-manage-tbody');
      if (!tbody) return;

      const targetClass = loggedInUser?.assignedClass;
      if (!targetClass) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-rose-400 font-semibold">
              <i data-lucide="alert-triangle" class="inline w-5 h-5 mr-1"></i> Tài khoản GVCN của bạn chưa được cấu hình lớp phụ trách!
            </td>
          </tr>
        `;
        lucide.createIcons();
        return;
      }

      // Lọc danh sách học sinh của lớp chủ nhiệm
      const classStudents = students.filter(s => s.class === targetClass);

      if (classStudents.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-slate-400">
              Chưa có dữ liệu học sinh lớp ${targetClass}. Hãy nạp file Excel hoặc liên hệ Admin.
            </td>
          </tr>
        `;
        return;
      }

      // Sắp xếp học sinh theo tên tiếng Việt
      classStudents.sort(compareVietnameseNames);

      tbody.innerHTML = classStudents.map(s => {
        const globalIdx = students.indexOf(s);
        
        // Tạo các option cho chức vụ
        const roles = ["", "Lớp trưởng", "Lớp phó học tập", "Lớp phó kỷ luật", "Tổ trưởng", "Tổ phó", "Bí thư chi đoàn", "Phó bí thư", "Thành viên"];
        const roleOptions = roles.map(r => 
          `<option value="${r}" ${s.classRole === r ? 'selected' : ''}>${r || '— Không có —'}</option>`
        ).join('');

        return `
          <tr class="hover:bg-slate-700/30 transition-colors">
            <td class="py-3 px-4">
              <div class="font-bold text-slate-100">${s.name}</div>
            </td>
            <td class="py-3 px-3 text-center font-mono text-slate-400 text-xs">${s.studentId || 'Chưa có'}</td>
            <td class="py-3 px-3 text-center text-xs">${s.gender || 'N/A'}</td>
            <td class="py-3 px-3 text-center">
              <input type="number" id="cm-group-${globalIdx}" value="${s.groupNumber || ''}" min="1" max="10" placeholder="Số tổ"
                class="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center text-xs text-white focus:outline-none focus:border-emerald-500">
            </td>
            <td class="py-3 px-4 text-center">
              <select id="cm-role-${globalIdx}" 
                class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer">
                ${roleOptions}
              </select>
            </td>
            <td class="py-3 px-4">
              <input type="text" id="cm-note-${globalIdx}" value="${s.specialNotes || ''}" placeholder="Nhập lưu ý đặc biệt nếu có..."
                class="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1 text-xs text-white focus:outline-none focus:border-emerald-500">
            </td>
            <td class="py-3 px-3 text-center">
              <button onclick="saveSingleClassStudent(${globalIdx})" 
                class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 mx-auto shadow active:scale-95">
                <i data-lucide="save" class="w-3.5 h-3.5"></i> Lưu
              </button>
            </td>
          </tr>
        `;
      }).join('');
      lucide.createIcons();
    }

    async function saveSingleClassStudent(globalIdx) {
      if (globalIdx < 0 || globalIdx >= students.length) return;
      const s = students[globalIdx];

      const groupVal = document.getElementById(`cm-group-${globalIdx}`).value.trim();
      const roleVal  = document.getElementById(`cm-role-${globalIdx}`).value;
      const noteVal  = document.getElementById(`cm-note-${globalIdx}`).value.trim();

      // Cập nhật các thuộc tính học sinh tương ứng
      students[globalIdx].groupNumber = groupVal || null;
      students[globalIdx].classRole = roleVal || null;
      students[globalIdx].specialNotes = noteVal || null;

      try {
        precalculateKeys(students);
        await saveAutosaveToCloud();
        showToast(`✓ Đã lưu thông tin cho học sinh ${s.name}`);
        renderClassManagement();
      } catch (err) {
        showToast(`❌ Lỗi: Không thể lưu thông tin!`);
        console.error("Save class student error:", err);
      }
    }

    async function approveBatchClass() {
      const filterMonth = document.getElementById('approve-filter-month').value;
      const targetClass = loggedInUser?.assignedClass;
      if (!targetClass) {
        showToast('❌ Bạn chưa được cấu hình lớp phụ trách!');
        return;
      }
      if (filterMonth === 'all') {
        showToast('❌ Vui lòng chọn một tháng cụ thể để duyệt hàng loạt!');
        return;
      }

      showConfirm(
        'Duyệt hàng loạt',
        `Xác nhận phê duyệt toàn bộ phiếu tự đánh giá rèn luyện lớp ${targetClass} trong Tháng ${filterMonth}?`,
        async () => {
          let count = 0;
          evaluations.forEach(ev => {
            if (ev.studentClass === targetClass && String(ev.month) === filterMonth) {
              if (ev.status !== 'Đã duyệt' || !ev.approvedBy?.gvcn) {
                ev.status = 'Đã duyệt';
                if (!ev.approvedBy) ev.approvedBy = {};
                ev.approvedBy.gvcn = true;
                ev.updatedAt = new Date().toISOString();
                count++;
              }
            }
          });

          if (count > 0) {
            await saveAutosaveToCloud();
            renderEvaluationsList();
            showToast(`✓ Đã duyệt hàng loạt thành công ${count} phiếu lớp ${targetClass}!`);
          } else {
            showToast(`✓ Không có phiếu nào cần duyệt mới ở lớp ${targetClass} trong tháng ${filterMonth}.`);
          }
        }
      );
    }

    function exportClassReportToExcel() {
      const filterMonth = document.getElementById('approve-filter-month').value;
      
      // Cho phép Admin và BGH xuất excel cho bất kỳ lớp nào đang lọc, GVCN thì bị ép xuất lớp của mình
      let targetClass = loggedInUser?.assignedClass;
      if (currentRole === 'admin' || currentRole === 'bgh') {
        targetClass = document.getElementById('approve-filter-class').value;
        if (targetClass === 'all') {
          showToast('❌ Vui lòng chọn một lớp cụ thể để xuất báo cáo!');
          return;
        }
      }

      if (!targetClass) {
        showToast('❌ Chưa phân công lớp hoặc chưa chọn lớp hợp lệ!');
        return;
      }
      if (filterMonth === 'all') {
        showToast('❌ Vui lòng chọn một tháng cụ thể để xuất báo cáo!');
        return;
      }

      // Lọc học sinh của lớp
      const classStudents = students.filter(s => s.class === targetClass);
      if (classStudents.length === 0) {
        showToast(`❌ Không tìm thấy học sinh nào thuộc lớp ${targetClass}!`);
        return;
      }
      classStudents.sort(compareVietnameseNames);

      // Chuẩn bị cấu trúc dữ liệu Excel bảng đẹp
      const data = [];
      data.push([`BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ RÈN LUYỆN`]);
      data.push([`Trường THCS Phạm Đình Hổ | Năm học: 2025 - 2026`]);
      data.push([`Lớp: ${targetClass} | Tháng: ${filterMonth}`]);
      data.push([]); // Dòng trống

      // Header cột
      data.push(["STT", "Họ và Tên", "Mã Định Danh", "Giới Tính", "Số Tổ", "Chức Vụ", "Điểm Rèn Luyện", "Xếp Loại", "Ý kiến HS / Lưu ý đặc biệt", "Trạng Thái Duyệt"]);

      classStudents.forEach((s, idx) => {
        // Tìm phiếu đánh giá
        const ev = evaluations.find(item => item.studentClass === targetClass && String(item.month) === filterMonth && (item.studentId === s.studentId || item.studentName === s.name));
        
        let score = 100;
        let rating = "Tốt";
        let note = "";
        let approvedStatus = "Chưa nộp phiếu";

        if (ev) {
          score = ev.totalScore;
          rating = ev.rating;
          note = ev.studentNote || "";
          approvedStatus = ev.status;
        } else {
          // Tính điểm tự động nếu chưa nộp phiếu
          const stViolations = violations.filter(v => v.studentName === s.name && v.studentClass === s.class && String(v.month) === filterMonth);
          const totalDeducted = stViolations.reduce((sum, v) => sum + parseFloat(v.points || 0), 0);
          score = 100 - totalDeducted;
          
          if (score >= 90) rating = "Tốt";
          else if (score >= 70) rating = "Khá";
          else if (score >= 50) rating = "Trung bình";
          else rating = "Chưa đạt";
        }

        // Gộp ý kiến HS và Ghi chú GVCN
        let extraNote = note;
        if (s.specialNotes) {
          extraNote = extraNote ? `${extraNote} | GVCN lưu ý: ${s.specialNotes}` : `GVCN lưu ý: ${s.specialNotes}`;
        }

        data.push([
          idx + 1,
          s.name,
          s.studentId || "Chưa có",
          s.gender || "Nam",
          s.groupNumber || "Chưa phân",
          s.classRole || "Thành viên",
          `${score}đ`,
          rating,
          extraNote || "–",
          approvedStatus
        ]);
      });

      // Tạo workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Căn chỉnh độ rộng cột
      const wscols = [
        { wch: 6 },   // STT
        { wch: 25 },  // Họ tên
        { wch: 15 },  // Mã ĐD
        { wch: 10 },  // Giới tính
        { wch: 8 },   // Số tổ
        { wch: 15 },  // Chức vụ
        { wch: 15 },  // Điểm rèn luyện
        { wch: 12 },  // Xếp loại
        { wch: 45 },  // Ý kiến / Lưu ý
        { wch: 15 }   // Trạng Thái Duyệt
      ];
      ws['!cols'] = wscols;

      // Merge cell cho tiêu đề
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }
      ];

      XLSX.utils.book_append_sheet(wb, ws, `Lớp ${targetClass}`);
      XLSX.writeFile(wb, `BaoCao_RenLuyen_Lop_${targetClass}_Thang_${filterMonth}.xlsx`);
      showToast('✓ Xuất báo cáo Excel thành công!');
    }

    if (window.FirebaseSDK) {
      initFirebase();
    } else {
      window.addEventListener('firebase-sdk-ready', () => {
        initFirebase();
      });
    }

    window.onload = function() {
      lucide.createIcons();
    };
