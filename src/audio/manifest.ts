// Every voice clip the app can play, and the exact words to record.
// This file IS the teacher's recording script: `npm run audio:script` turns it into
// docs/AUDIO_SCRIPT.md. Files go in public/audio/<id>.mp3. Missing files fall back to
// the browser's Vietnamese voice (if any) reading the same text.
//
// Keep this file free of imports and non-erasable TypeScript: scripts/audio-script.ts
// runs it directly with Node.

export const CLIP_GROUPS = {
  "Số đếm": {
    n0: "không", n1: "một", n2: "hai", n3: "ba", n4: "bốn", n5: "năm", n6: "sáu", n7: "bảy", n8: "tám", n9: "chín",
    n10: "mười", n11: "mười một", n12: "mười hai", n13: "mười ba", n14: "mười bốn", n15: "mười lăm",
    n16: "mười sáu", n17: "mười bảy", n18: "mười tám", n19: "mười chín", n20: "hai mươi",
    t3: "ba mươi", t4: "bốn mươi", t5: "năm mươi", t6: "sáu mươi", t7: "bảy mươi", t8: "tám mươi", t9: "chín mươi",
    u_mot: "mốt", u_tu: "tư", u_lam: "lăm", n100: "một trăm",
  },
  "Từ nối": {
    va: "và", nhe: "nhé!", bang: "bằng", cong: "cộng", gom: "gồm", chuc: "chục", qua: "quả", may_q: "mấy?", la: "là",
  },
  "Chung": {
    hello: "Chào thám tử nhí!",
    help_today: "Mèo Smarty cần em giúp giải các vụ án hôm nay nhé!",
    who_plays: "Ai đang chơi hôm nay? Chạm vào hình của em nhé!",
    praise_1: "Giỏi quá!", praise_2: "Đúng rồi!", praise_3: "Tuyệt vời!", praise_4: "Em làm tốt lắm!", praise_5: "Chính xác!",
    try_again: "Gần đúng rồi! Em thử lại nhé.",
    reveal: "Không sao, mình cùng xem đáp án nhé.",
    set_done: "Em đã giải xong vụ án! Cùng xem em được mấy sao nào.",
    pick_number: "Em chọn một số trên bàn phím nhé.",
    idle_nudge: "Em ơi, em có cần Mèo giúp không?",
    idle_pause: "Mèo chờ em nhé. Chạm vào màn hình để chơi tiếp.",
    break_start: "Nghỉ mắt một chút nhé! Em đã chơi lâu rồi.",
    break_over: "Hết giờ nghỉ rồi. Mình chơi tiếp nhé!",
    daily_warn: "Còn hai phút nữa là hết giờ chơi hôm nay rồi.",
    daily_done: "Hôm nay mình chơi đủ rồi! Hẹn gặp lại em ngày mai nhé.",
    rotate: "Em hãy xoay ngang máy nhé!",
  },
  "Cái cân": {
    scale_t1: "Thêm táo vào đĩa nhẹ hơn để hai đĩa bằng nhau nhé!",
    scale_t2: "Thêm quả để hai đĩa nặng bằng nhau. Nhớ xem bảng cân nhé!",
    scale_t3: "Hai đĩa chưa bằng nhau. Em thêm quả gì để cân thăng bằng?",
    scale_left_heavier: "Đĩa bên trái còn nặng hơn.",
    scale_right_heavier: "Đĩa bên phải còn nặng hơn.",
    scale_fix: "Em thêm hoặc bớt quả xem nào.",
    scale_ok: "Hai đĩa nặng bằng nhau rồi!",
  },
  "Rô-bốt": {
    robot_prompt: "Đưa rô-bốt đến lá cờ nhé!",
    robot_blocked: "Ôi, rô-bốt bị chặn rồi! Em xem lại các bước nhé.",
    robot_not_there: "Rô-bốt chưa tới lá cờ. Em thêm bước nữa nhé!",
    robot_empty: "Em chạm các mũi tên để xếp bước đi trước nhé.",
    robot_ok: "Rô-bốt đã tới lá cờ!",
  },
  "Giỏ trái cây": {
    give_meo: "Đưa cho Mèo",
    fruit_cam: "quả cam", fruit_tao: "quả táo", fruit_chuoi: "quả chuối",
    basket_too_many: "Giỏ của Mèo nhiều quá rồi! Em lấy bớt ra nhé.",
    basket_too_few: "Giỏ của Mèo còn thiếu. Em đưa thêm nhé.",
    basket_bag_is_ten: "Nhớ nhé: mỗi túi là một chục, bằng mười quả.",
    basket_loose_ten: "Mười quả lẻ cũng là một chục đấy! Lần sau em thử đưa cả túi nhé.",
    basket_ok: "Mèo nhận đủ rồi. Cảm ơn em nhé!",
  },
  "Tính theo hình": {
    eq_t1: "Mỗi quả là một con số. Cộng lại bằng mấy?",
    eq_find: "Đọc manh mối và tìm xem quả này là số mấy?",
    eq_hint_first: "Em tìm manh mối chỉ có một loại quả chưa biết, rồi giải nó trước nhé.",
    eq_hint_add: "Em xem bảng số rồi cộng lại nhé.",
    eq_ok: "Đúng rồi! Em là thám tử giải mã giỏi lắm!",
  },
  "Mấy và mấy": {
    split_count_all: "Đếm xem có tất cả bao nhiêu nhé!",
    split_count_parts: "Đếm riêng từng loại nhé!",
    split_bond: "Số ở trên gồm hai số ở dưới. Em tìm số còn thiếu nhé!",
    split_hint_tap: "Em chạm vào từng cái để đếm, mỗi cái chỉ đếm một lần nhé.",
    split_hint_sum: "Hai phần cộng lại phải bằng số ở trên.",
    split_ok: "Em đếm rất cẩn thận!",
  },
  "So sánh cân": {
    cmp_heaviest: "Nhìn các cái cân. Hộp quà nào nặng nhất?",
    cmp_lightest: "Nhìn các cái cân. Hộp quà nào nhẹ nhất?",
    cmp_order: "Xếp các hộp quà từ nhẹ nhất đến nặng nhất nhé!",
    cmp_hint: "Bên nào cân hạ xuống là bên nặng hơn. Em đọc từng cân một nhé.",
    cmp_ok: "Thám tử tài ba!",
  },
} as const;

type Groups = typeof CLIP_GROUPS;
export type ClipId = { [G in keyof Groups]: keyof Groups[G] }[keyof Groups] & string;

export const CLIPS: Record<ClipId, string> = Object.assign({}, ...Object.values(CLIP_GROUPS));
