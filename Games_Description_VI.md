# Thám tử Toán học Tí hon — Mô tả các trò chơi

Ứng dụng web tương tác dành cho **học sinh lớp 1 (6 tuổi)**. Các em giúp chú mèo thám tử **Mèo Smarty** giải các "vụ án", và mỗi vụ án là một trò chơi toán nhỏ. Sáu trò chơi cùng luyện đếm, cảm nhận về số, cộng trừ trong phạm vi 10 (về sau là 20) và tư duy logic ban đầu.

Ứng dụng chạy trên trình duyệt, dùng máy tính bảng iPad đặt ngang hoặc máy tính. Không cần tài khoản, và không cần mạng sau khi đã tải xong.

---

## 1. Ứng dụng hoạt động thế nào với học sinh

### 1.1 Trang chủ

- Mèo Smarty chào em bằng tên và hiện **tổng số sao** cùng **chuỗi ngày chơi**.
- Sáu ô tranh lớn, mỗi ô là một trò chơi, xếp thành lưới 3 × 2. Trò chơi chưa sẵn sàng sẽ hiện "Sắp ra mắt".
- Nút loa để bật/tắt âm thanh. Một liên kết nhỏ "khu vực giáo viên" dẫn tới phần dành cho giáo viên (có mã PIN).

### 1.2 Ai đang chơi?

Nhiều em có thể dùng chung một thiết bị. Lúc bắt đầu, mỗi em chạm vào **hình đại diện** của mình (một hình ngộ nghĩnh, không cần mật khẩu). Số sao, chuỗi ngày, độ khó và thời gian đã chơi đều được lưu **riêng cho từng em**.

### 1.3 Một lượt chơi

- Một lượt chơi = **một bộ 5 câu hỏi** trong một trò chơi.
- Phía trên màn hình có năm chấm tròn cho biết em đã làm đến đâu, cùng nhãn vòng hiện tại ("Vòng 1 / 2 / 3").
- Mỗi câu hỏi đều được Mèo Smarty **đọc to**. Nút loa giúp nghe lại ("nghe lại").
- Em trả lời rồi chạm nút xanh **"Xong"** (hoặc đáp án được kiểm tra ngay khi em làm xong thao tác, tùy trò chơi).

### 1.4 Nút hướng dẫn (i)

Mỗi trò chơi có một nút **(i)**. Mèo Smarty sẽ làm mẫu một câu, từng bước một, có bàn tay di chuyển và có giọng nói.

- Hướng dẫn **tự động chạy ở lần đầu tiên** em mở trò chơi.
- Em có thể xem lại bất cứ lúc nào.
- Một số trò chơi khá khó với trẻ 6 tuổi, nên phần hướng dẫn này rất quan trọng.

### 1.5 Khi em trả lời sai

1. Mèo Smarty nói lời nhẹ nhàng và đưa ra **gợi ý**.
2. Em được **thử thêm một lần**.
3. Chỉ **lần thử đầu tiên** được tính điểm. Lần thử thứ hai là để học.

Trả lời sai không bao giờ bị "phạt" bằng âm thanh đáng sợ hay dấu X đỏ. Giọng điệu luôn là "thử lại nhé!".

---

## 2. Độ khó: ba vòng tự điều chỉnh

### 2.1 Ba vòng

| Vòng | Cảm giác |
| --- | --- |
| **Vòng 1** | Khởi động: số nhỏ (0–5), có hình ảnh hỗ trợ, chỉ cần nghĩ một điều |
| **Vòng 2** | Vừa sức: số đến 10, ít gợi ý hơn, cần nghĩ hai điều |
| **Vòng 3** | Thử thách: số đến 20 ở những chỗ phù hợp, ít gợi ý, nhiều bước hơn |

Trong mỗi vòng còn có **các bậc nhỏ ẩn** (ví dụ: số đến 5, rồi đến 8, rồi đến 10). Các em không nhìn thấy các bậc này; ứng dụng dùng chúng để trò chơi tăng độ khó một cách mượt mà.

### 2.2 Độ khó thay đổi trong một bộ câu hỏi

Trong bộ 5 câu, sau mỗi câu trả lời ứng dụng điều chỉnh độ khó:

- **Trả lời đúng** → được tính để lên vòng cao hơn.
- **Trả lời sai** → em phải trả lời đúng thêm **một câu nữa** ở vòng hiện tại mới được lên (một "hình phạt" nhẹ để khuyến khích cẩn thận).
- **Vòng 2 luôn có ít nhất 2 câu** trước khi em có thể lên Vòng 3.
- **Sai hai câu liên tiếp** → em lùi xuống một vòng.

Lên được Vòng 3 là **khó và cần nhiều ngày**. Điều này có chủ ý: khuyến khích các em suy nghĩ cẩn thận chứ không phải làm nhanh.

### 2.3 Điểm xuất phát của bộ câu hỏi sau

Bộ câu hỏi tiếp theo bắt đầu từ chỗ bộ trước kết thúc:

- Đúng 4 hoặc 5 trên 5 câu → bắt đầu cao hơn một bậc.
- Đúng 0 hoặc 1 câu → bắt đầu thấp hơn một bậc.
- Các trường hợp còn lại → giữ nguyên.

Vì có giới hạn thời gian mỗi ngày (xem mục 4), mỗi em thường chơi **khoảng một bộ câu hỏi cho mỗi trò chơi mỗi ngày**.

---

## 3. Sao và chuỗi ngày

### 3.1 Sao cho mỗi bộ câu hỏi

| Kết quả | Số sao |
| --- | --- |
| Hoàn thành bộ câu hỏi (đã cố gắng) | ⭐ |
| Đúng từ 3 câu trở lên trên 5 câu | ⭐⭐ |
| Đúng cả 5 câu | ⭐⭐⭐ |

Vì ứng dụng luôn đẩy mỗi em tới những câu hỏi các em thấy khó, hầu như em nào cũng sẽ trả lời sai một vài câu. Do đó sao được tặng **khi hoàn thành**, và thêm sao khi làm tốt.

### 3.2 Tổng số sao

Mọi ngôi sao được cộng dồn thành tổng, hiển thị ở trang chủ. (Tùy chọn: dùng sao để đổi mũ và hình dán cho Mèo Smarty.)

### 3.3 Chuỗi ngày chơi

- Nhận **ít nhất 1 sao trong một ngày** là giữ được chuỗi.
- Lời nhắn luôn tích cực: "Hôm nay em đã cố gắng rồi!".
- Cuối tuần không làm đứt chuỗi (đề xuất; cần xác nhận với giáo viên).

---

## 4. Thời gian dùng màn hình và chơi lành mạnh

Mọi giới hạn được cài đặt riêng cho từng em trong khu vực giáo viên và được bảo vệ bằng **mã PIN**. Phụ huynh hoặc giáo viên có thể dùng PIN để mở thêm thời gian.

| Quy tắc | Điều xảy ra |
| --- | --- |
| **Giới hạn mỗi lượt** (ví dụ 15 phút) | Mèo Smarty gợi ý nghỉ ("nghỉ mắt một chút nhé") và hiện màn hình nghỉ có đồng hồ đếm ngược. |
| **Giới hạn mỗi ngày** (ví dụ 30 phút) | Có cảnh báo khi còn 2 phút. Sau đó các trò chơi đóng lại đến ngày mai. |
| **Không thao tác** | Sau khoảng 20 giây không chạm vào màn hình, Mèo Smarty nhắc nhẹ hoặc gợi ý. Sau khoảng 60 giây trò chơi tạm dừng. Thời gian không thao tác **không bị tính** vào giới hạn. |
| **Không ngắt giữa chừng** | Nếu hết giờ khi đang làm dở một bộ câu hỏi, em được làm nốt bộ đó. |

---

## 5. Âm thanh và giọng nói

- Mọi điều em cần hiểu đều được **đọc thành tiếng** (trẻ 6 tuổi vẫn đang học đọc).
- Giọng nói do **giáo viên** thu âm theo kịch bản, nên quen thuộc và đúng dấu thanh tiếng Việt. Các số, phép tính, lời khen và lời cảnh báo được thu thành những đoạn ngắn dùng lại được và ghép với nhau khi cần.
- Nút loa bật/tắt toàn bộ âm thanh. Khi tắt tiếng, một **bảng chữ và hình** hiện lời yêu cầu (đặc biệt cần cho trò chơi 3).
- Hiệu ứng âm thanh nhẹ nhàng và ngắn.

---

## 6. Sáu trò chơi

Mỗi trò chơi dưới đây gồm: ý tưởng, cách chơi, ba vòng và cách kiểm tra đáp án.

### 6.1 Cái cân

**Ý tưởng.** Các loại quả có cân nặng khác nhau. Em hiểu rằng "bằng nhau" nghĩa là *tổng cân nặng bằng nhau*, chứ không nhất thiết là số lượng bằng nhau. Đây là bước đầu tiến tới phép cộng, việc đổi vật và sự tương đương.

**Cân nặng (luôn có bảng chú giải trên màn hình).**

- 1 nho = 1
- 1 táo = 2
- 1 dưa hấu = 3

Một dạng về sau dùng **hình khối**: hình tam giác nặng 3, hình vuông hoặc hình chữ nhật nặng 4. (Cân nặng theo màu sắc đã được cân nhắc và bỏ, vì đó là quy ước tùy ý mà các em phải học thuộc.)

**Cách chơi.** Hai đĩa cân, mỗi đĩa có sẵn một ít quả. Khay phía dưới có thêm quả. Em **kéo quả từ khay vào đĩa cân** (hoặc chạm vào quả rồi chạm vào đĩa) để **hai đĩa nặng bằng nhau**, rồi chạm "Xong". Đòn cân nghiêng để cho biết kết quả.

**Các vòng.**

| Vòng | Hình thức | Ví dụ |
| --- | --- | --- |
| Vòng 1 | Một loại quả. Cân **nghiêng ngay** khi thêm quả, mỗi đĩa hiện số quả, và **dấu >, < hoặc =** trên trục cân so sánh hai đĩa (5 > 2), giúp em gắn cái cân với các dấu học ở lớp 1. | 5 quả nho và 2 quả nho: thêm 3 quả nho. |
| Vòng 2 | Hai loại quả, có bảng chú giải. Cân **chỉ nghiêng sau khi chạm "Xong"**. | Trái: 2 quả táo (4). Phải: 1 táo + 1 nho (3): thêm 1 quả nho. |
| Vòng 3 | Ba loại quả (về sau có cả hình khối). Tổng lớn hơn. Cân chỉ nghiêng sau khi chạm "Xong". | Trái: 1 dưa hấu + 2 táo (7). Phải: 2 dưa hấu (6): thêm 1 quả nho. |

**Kiểm tra.** Trò chơi so sánh **tổng cân nặng** của hai đĩa. Nhiều cách xếp khác nhau đều có thể đúng (ví dụ 1 quả táo hoặc 2 quả nho đều thêm 2). Nếu sai, cân nghiêng và Mèo Smarty gợi ý bên nào nặng hơn.

---

### 6.2 Rô-bốt

**Ý tưởng.** Những bước đầu của lập trình và tư duy logic. Em ra lệnh cho rô-bốt bằng một dãy mũi tên để đi tới lá cờ.

**Cách chơi.** Lưới ô vuông có rô-bốt và lá cờ. Em chạm các nút mũi tên (↑ ↓ ← →) để tạo danh sách dưới mục **"Các bước của em"**. Em chạm **"Chạy!"**, rô-bốt sẽ đi lần lượt từng bước. **"Làm lại"** xóa danh sách. Một vài hỗ trợ nhỏ: chạm vào bước **cuối cùng** để bỏ bước đó (nhầm một bước không phải làm lại từ đầu), phím mũi tên trên bàn phím cũng dùng được, và bấm "Chạy!" khi chưa có bước nào chỉ nhắc nhẹ, không tính là thử sai. Chương trình có tối đa 12 bước.

**Các vòng.**

| Vòng | Hình thức |
| --- | --- |
| Vòng 1 | Lưới nhỏ (4 × 4), không có chướng ngại, đường đi 2–3 bước, đi thẳng hoặc rẽ một lần. |
| Vòng 2 | Có **tường** giữa các ô và **ô bị chặn** mà rô-bốt không bao giờ vào được, nên đường đi phải vòng qua. |
| Vòng 3 | Đường đi dài hơn, rẽ nhiều hơn và nhiều chướng ngại hơn. |

**Chế độ thêm, nếu còn thời gian.**

- **Đường đi theo quy luật số (từ Vòng 2):** lưới có các con số. Có một đường là dãy số theo quy luật (đếm thêm 1: 1, 2, 3…; thêm 2: 2, 4, 6…; về sau thêm 10). Em chọn đường đi theo quy luật. Ô đúng sáng **xanh**; một ô sai sáng **đỏ** và rô-bốt quay về chỗ xuất phát. Ở mức dễ nhất, em chạm trực tiếp vào các ô thay vì dùng mũi tên.
- **Gom đủ 10 (Vòng 3):** một số ô cộng (+) hoặc trừ (−) vào "pin" của rô-bốt. Em phải đến lá cờ với đúng 10. Tổng hiện tại được hiển thị trong lúc đi. (Chế độ này thay cho ý tưởng "tìm đường ngắn nhất", vì khó kiểm tra.)

**Kiểm tra.** Rô-bốt thật sự đi theo chương trình. Rô-bốt thành công nếu dừng ở lá cờ. Nếu đâm vào tường hoặc ra khỏi lưới, rô-bốt làm động tác "ôi" ngộ nghĩnh rồi quay về chỗ xuất phát, và Mèo Smarty đưa ra gợi ý. Các màn chơi do máy tính tạo ra, và mỗi màn đều được kiểm tra để chắc chắn có lời giải.

---

### 6.3 Giỏ trái cây — Đưa cho tôi

**Ý tưởng.** Nghe, đếm và chuyển đúng số lượng. Trò chơi "làm theo yêu cầu".

**Cách chơi.** Trên màn hình có hai giỏ. Một giỏ đầy trái cây. Mèo Smarty nói (ví dụ) **"Đưa cho tôi ba quả cam"**. Em **kéo** đúng ba quả cam từ giỏ đầy sang giỏ còn lại, rồi chạm "Xong". Nhiều quá là sai, ít quá cũng sai. Em có thể kéo quả trở lại.

**Các vòng.**

| Vòng | Hình thức | Ví dụ |
| --- | --- | --- |
| Vòng 1 | Số lượng **nhỏ**, **một loại** quả | "Đưa cho tôi 4 quả cam." |
| Vòng 2 | Số lượng **lớn**, một loại quả. Quả đựng trong **túi 10 quả (= 1 chục)**, giúp em làm quen với chục. | "Đưa cho Mèo hai chục quả cam" = 2 túi<br>"Đưa cho Mèo 13 quả cam" = 1 túi + 3 quả cam |
| Vòng 3 | **Nhiều loại** quả cùng lúc. Có thể có số 0. | "Đưa cho tôi 2 quả cam và 3 quả táo." / "Đưa cho tôi 0 quả chuối." |

**Học "chục" ở Vòng 2.** Câu hỏi của Vòng 2 được chọn có chủ ý từ ba dạng, để các em gặp lại "chục" nhiều lần:

| Dạng | Mèo nói | Đáp án | Mục đích |
| --- | --- | --- | --- |
| Tròn chục | "một chục quả cam", "hai chục quả cam" | 1 túi / 2 túi | Gắn từ **chục** với một túi 10 quả. |
| Cùng số lượng, cách gọi khác | "mười quả cam" | 1 túi | Cho thấy **mười** và **một chục** là cùng một số lượng. |
| Chục và đơn vị | "mười ba quả cam", "mười sáu quả cam" | 1 túi + 3 quả / 1 túi + 6 quả | Tách một số thành chục và đơn vị. |

Khoảng một phần ba số câu của Vòng 2 trở lên là câu tròn chục.

- **Khi trả lời đúng**, Mèo nói số lượng theo cả hai cách, ví dụ "Hai chục là 20 quả cam" hoặc "Một chục và 3 quả là 13 quả cam."
- **Khi trả lời sai**, gợi ý nhắc em rằng mỗi túi là 1 chục = 10 quả.
- **Trong bảng hình**, mỗi chục được vẽ thành một túi nhỏ ghi "10", nên bảng hình cũng dùng cùng ý tưởng.
- **Giỏ của em không bao giờ có 10 quả lẻ.** Giỏ có từ 2 đến 9 quả lẻ (luôn đủ cho phần "lẻ") và 2 túi, nên muốn có một chục em phải lấy một túi, không thể đếm ra 10 quả lẻ.

**Nếu em không nghe được (hoặc chưa hiểu).**

- **Bảng chữ và hình** hiện lời yêu cầu (ví dụ "3 🍊": con số kèm hình, để em đọc chữ còn chậm vẫn đọc được số; ở Vòng 2 có thêm các túi bên dưới, ví dụ "[10] + 3 🍊"). Bảng **luôn hiện khi tắt tiếng**; khi bật tiếng, bảng hiện ra sau **lần thử sai đầu tiên**, trước khi em thử lại.
- Nút **"nghe lại"** đọc lại yêu cầu bất cứ lúc nào.

**Số đếm trên giỏ.** Ở Vòng 1, mỗi giỏ hiện số quả đang có và cập nhật khi em chuyển quả, giúp em gắn số lượng với con số. Từ Vòng 2, số đếm được ẩn đi để em tự đếm.

**Kiểm tra.** Giỏ phải có đúng số lượng của từng loại quả.

---

### 6.4 Tính theo hình

**Ý tưởng.** Mỗi loại quả đại diện cho một con số. Em cộng các quả, rồi về sau suy ngược để tìm giá trị của một loại quả. Đây là cách nhẹ nhàng để làm quen với việc *một ký hiệu đại diện cho một số*, bước đầu tiên của đại số.

**Cách chơi.** Màn hình hiện các loại quả có giá trị và những phép tính được xếp từ hình quả. Em nhập đáp án bằng **bàn phím số** lớn.

**Các vòng.**

| Vòng | Hình thức | Ví dụ |
| --- | --- | --- |
| Vòng 1 | **Tính xuôi**, có cho sẵn giá trị. | 🍎 = 1. 🍎 + 🍎 bằng mấy? → **2**<br>🍐 = 2, 🍎 = 1. 🍐 + 🍎 bằng mấy? → **3** |
| Vòng 2 | **Tổng dài hơn** hoặc **suy ngược**. | 🍎 = 1, 🍐 = 2, 🍉 = 3. 🍎 + 🍐 + 🍉 bằng mấy? → **6**<br>🍎 + 🍐 = 3 và 🍎 + 🍎 = 2. 🍐 bằng mấy? → **2** |
| Vòng 3 | **Chuỗi** các gợi ý. | 🍎🍎🍎 = 6, 🍎 + 🍐 = 3, 🍎 + 🍐 + 🍉 = 6. 🍉 bằng mấy? → **3** |

**Quy tắc ra đề.** Mọi bài đều giải được **từng gợi ý một**: ở mỗi bước có một gợi ý chỉ còn một loại quả chưa biết. Em tìm ra nó, thay bằng con số, rồi làm tiếp. Không bao giờ có bài cần giải hai gợi ý cùng lúc. Máy tính tạo bài và kiểm tra để chỉ có **một** đáp án. Quả có thể có giá trị **0**.

**Lưu ý.** Đây là trò chơi khó nhất với lứa tuổi này. Trò chơi dùng cùng giá trị quả với trò Cái cân, nên các em được thấy cùng một ý tưởng theo hai cách, và các vòng tự điều chỉnh giúp tránh việc các em gặp bài quá khó.

---

### 6.5 Mấy và mấy

**Ý tưởng.** Bám sát bài học "Mấy và mấy" ở lớp 1. Một số có thể tách thành hai phần (7 = 3 + 4), và hai phần có thể gộp lại thành số ban đầu. Đây là nền tảng của phép cộng và phép trừ.

**Cách chơi.**

- **Dạng hình ảnh.** Một lọ hoa (hoặc giỏ trái cây, đĩa kẹo) có hai loại, ví dụ hoa trắng và hoa vàng. Câu được đọc to: **"Trong lọ có [ ] bông hoa, trong đó có [ ] hoa trắng và [ ] hoa vàng."** Mỗi chỗ trống có hình bông hoa nhỏ bên cạnh. Em điền các chỗ trống bằng bàn phím số.
- **Dạng số (sơ đồ tách – gộp).** Ba ô: một ô ở trên (số tổng) nối bằng đường thẳng với hai ô ở dưới (hai phần). Số ở trên bằng tổng hai số ở dưới. Một ô bị che, em tìm xem đó là số mấy.

**Các vòng.**

| Vòng | Hình thức | Ví dụ |
| --- | --- | --- |
| Vòng 1 | Lọ hoa có hình, **một chỗ trống**, thường là tổng (chỉ cần đếm). | Lọ có 3 hoa trắng và 2 hoa vàng. "Trong lọ có [ ] bông hoa." → **5** |
| Vòng 2 | Lọ hoa có hình **kèm sơ đồ tách – gộp**; **hai chỗ trống**. Có thể có số 0. | "Có 6 bông hoa. [ ] hoa trắng, [ ] hoa vàng." (cho sẵn hoa trắng: 4) → hoa vàng = **2** |
| Vòng 3 | **Chỉ có sơ đồ số**, thiếu một phần (thực chất là phép trừ), số lớn hơn. | Trên là 7, bên trái là 3, bên phải là [ ] → **4** |

**Hỗ trợ khi đếm.** Các vật khác nhau về **hình dạng** chứ không chỉ về màu (để em bị mù màu vẫn phân biệt được). Chạm vào một vật sẽ đánh dấu đã đếm, nên không bị đếm hai lần.

**Kiểm tra.** Các số phải làm cho số tổng bằng tổng của hai phần.

---

### 6.6 So sánh cân (trò chơi mở rộng)

**Ý tưởng.** Suy luận từ các manh mối. Em nhìn các hình cái cân và tìm ra điều không được cho trực tiếp: nếu A nhẹ hơn B và B nhẹ hơn C thì C nặng nhất.

**Cách chơi.** Hai hoặc ba hình cái cân nhỏ, mỗi cái so sánh hai vật. Các vật có **kích thước và loại giống nhau** (ví dụ các hộp quà nhiều màu hoặc những quả có cùng kích cỡ), nên em không thể đoán từ kinh nghiệm ngoài đời; các cái cân là manh mối duy nhất. Em trả lời bằng cách **chạm vào vật nặng nhất** (trong ba vật) hoặc **xếp các vật theo thứ tự từ nhẹ đến nặng**. Không có câu hỏi đúng/sai, vì đoán cũng đúng một nửa số lần.

**Các vòng.**

| Vòng | Hình thức |
| --- | --- |
| Vòng 1 | 3 vật, 2 cái cân. |
| Vòng 2 | 4 vật, 3 cái cân. |
| Vòng 3 | Các cái cân được sắp xếp thứ tự khác hoặc đảo bên, nên em phải đọc kỹ. |

**Lưu ý.** Kiểu suy luận chuỗi này gần với giới hạn khả năng của trẻ 6 tuổi. Trò chơi này làm sau cùng. Nếu chưa xong, trang chủ sẽ hiện ô "Sắp ra mắt".

---

## 7. Khu vực giáo viên

Vào bằng **ổ khoá** nhỏ ở góc dưới bên phải trang chủ (và màn hình nghỉ). Cần **giữ ổ khoá khoảng 1 giây** (một vòng tròn sẽ đầy dần); chạm nhanh chỉ hiện gợi ý "Giữ để mở · dành cho người lớn". Sau đó nhập mã PIN. Giáo viên hoặc phụ huynh có thể:

- thêm, đổi tên và xóa hồ sơ của các em
- đặt giới hạn mỗi lượt và giới hạn mỗi ngày cho từng em
- xem số sao, chuỗi ngày và vòng mà mỗi em đã đạt được trong từng trò chơi
- **xuất bản sao lưu** toàn bộ tiến trình ra một tệp, hoặc **nhập** lại (để không mất tiến trình khi trình duyệt xóa dữ liệu)
- đổi mã PIN
- chọn **hiệu ứng** (xem mục 8.1): Yên tĩnh, Vừa phải hoặc Rực rỡ, hoặc bật/tắt từng hiệu ứng

Mọi cài đặt, kể cả hiệu ứng, **chỉ** nằm ở đây, sau mã PIN, nên các em không tự đổi được. Mã PIN giúp các em không vào được; đây không phải bảo mật thật trước người lớn rành máy tính.

---

## 8. Hình thức và cảm giác

- Hình ảnh sáng màu, phong cách hoạt hình (trái cây, giỏ, lọ hoa, rô-bốt, Mèo Smarty). Hình tròn trịa và chi tiết hơn các bản mẫu đầu, theo góp ý của giáo viên.
- Mỗi trò chơi có một màu nền dịu riêng như trong bản mẫu (vàng cho cái cân, xanh lá cho rô-bốt).
- Không có con vật nào khác ngoài Mèo Smarty (không có chuồng hay bể cá).
- Nút lớn, dễ bấm với ngón tay nhỏ. Mọi thứ kéo được cũng có thể **chạm** (chạm vào vật, rồi chạm vào nơi muốn đặt).

### 8.1 Hiệu ứng vui nhộn

Màn hình vẫn gọn gàng, nhưng luôn **phản hồi** lại các em. Bốn hiệu ứng, mỗi cái bật/tắt được trong khu vực giáo viên:

| Hiệu ứng | Tác dụng |
| --- | --- |
| **Hoạt ảnh** | Mèo Smarty chớp mắt, nhún nhảy và nhảy lên khi em làm đúng; thẻ và ô trò chơi bật ra; quả đang cầm lắc lư; chấm tiến độ hiện tại nhấp nháy. |
| **Trang trí nền** | Vài hình mờ trôi nhẹ ở mép màn hình. |
| **Pháo hoa** | Pháo giấy khi trả lời đúng; lấp lánh khi thả quả. |
| **Âm thanh hiệu ứng** | Tiếng bấm, nhặt, thả, chúc mừng và "ôi" ngắn, tách riêng với giọng đọc. |

Ba chế độ nhanh: **Yên tĩnh** (tắt hết, cho các em dễ mất tập trung), **Vừa phải** (không có hình nền trôi), **Rực rỡ** (bật hết, mặc định). Nếu thiết bị bật chế độ giảm chuyển động, hoạt ảnh sẽ tắt sẵn.

- Chạy trên iPad đặt ngang và trên máy tính. Trên điện thoại hoặc iPad để dọc, một thông báo sẽ nhắc em xoay ngang màn hình hoặc dùng máy tính bảng.

---

## 9. Còn cần thống nhất với giáo viên

- Bộ sách nào (Kết nối tri thức, Cánh diều hay Chân trời sáng tạo) và những tuần học nào mà bản demo cuộc thi cần bám theo.
- Chuỗi ngày có bỏ qua cuối tuần không.
- Giáo viên có cần xem kết quả cả lớp ở một nơi không (có thể làm bằng tệp xuất).
- Các từ chỉ số lượng tiếng Việt dùng trong trò chơi 3 (quả cam, quả táo, chùm nho...).
- Nội dung kịch bản thu âm giọng nói.
