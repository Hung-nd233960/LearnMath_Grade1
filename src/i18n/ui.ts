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
  tier: (n: number) => `Vòng ${n}`,

  // who is playing
  whoTitle: "Ai đang chơi hôm nay?",
  whoSub: "Chạm vào hình của em nhé!",
  whoNote: "Hồ sơ được lưu trên máy này. Thầy cô thêm hoặc xoá bạn trong khu vực giáo viên.",
  welcomeTitle: "Chào mừng em đến với vụ án đầu tiên!",
  welcomeSub: "Thêm bạn đầu tiên để bắt đầu nhé.",
  addFriend: "Thêm bạn",
  addTitle: "Thêm bạn mới",
  namePlaceholder: "Tên của em",
  pickAvatar: "Chọn hình đại diện",
  cancel: "Huỷ",
  prevPage: "Trang trước",
  nextPage: "Trang sau",

  // playing a set
  almost: "Gần đúng rồi!",
  revealTitle: "Không sao!",
  setDone: "Xong vụ án!",
  score: (score: number, total: number) => `Em trả lời đúng ${score}/${total} câu`,
  countTipFlowers: "Chạm vào hoa để đánh dấu đã đếm",
  countTipFruit: "Chạm vào quả để đánh dấu đã đếm",
  devSolve: "Giải",

  eqKnown: "Bảng số:",
  eqClue: (n: number) => `Manh mối ${n}`,
  eqQuestion: "Câu hỏi",

  and: "và",
  basketMine: "Giỏ của em",
  basketMeo: "Giỏ của Mèo",

  // home
  changeKid: "Đổi bạn chơi",
  greeting: (name: string) => `Chào thám tử nhí ${name}!`,
  starsChip: (n: number) => `${n} sao`,
  streakChip: (n: number) => (n > 0 ? `${n} ngày liền` : "Chuỗi mới nào!"),
  timeChip: (minutes: number) => (minutes > 0 ? `còn ${minutes} phút` : "hết giờ hôm nay"),
  thisWeek: "Tuần này",
  weekdays: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  tileNew: "Mới!",
  tileSoon: "Sắp ra mắt",
} as const;
