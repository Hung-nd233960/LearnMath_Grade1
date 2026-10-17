// Fixed labels children see on buttons and notices. Longer spoken lines belong in
// src/audio/manifest.ts (built with say()) so the voice matches. Never hard-code
// Vietnamese inside view logic: add it here and use STR.
export const STR = {
  appTitle: "Thám tử Toán học Tí hon",
  done: "Xong",
  nextQuestion: "Câu tiếp theo",
  tryAgain: "Thử lại nhé",
  backHome: "Về trang chủ",
  back: "Quay lại",
  guideTitle: "Mèo chỉ em cách chơi",
  guideOk: "Em hiểu rồi!",
  guideButton: "Hướng dẫn",
  replay: "Nghe lại",
  sound: "Âm thanh",
  rotate: "Em hãy xoay ngang máy, hoặc dùng máy tính bảng nhé!",
  gateHint: "Giữ để mở · dành cho người lớn",
  gateTitle: "Khu vực giáo viên (giữ để mở)",
  placeholderTitle: "Thám tử Toán học Tí hon",
  placeholderBody: "Màn hình đang được xây dựng.",
  tier: (n: number) => `Vòng ${n}`,
} as const;
