# Huong dan chuan hoa chuc nang editor tren mau CV (theo cv1.html)

Tai lieu nay tong hop nhung gi da sua trong cv1 de AI co the tai su dung cho cac mau CV khac (cv2, cv3, cv4, cv5...) ma khong lam vo giao dien hien thi.

## 1) Muc tieu da dat duoc

- Co bo nut thao tac cho moi section: them section, dua len, dua xuong, xoa section.
- Co nut cong de them noi dung ben trong section (item-level add), khong chi rieng phan Chung chi.
- Giu nguyen bo cuc CV khi render.
- Nut phu tro chi hien khi hover/focus, tranh chiem cho va tranh lech layout.
- In PDF khong hien cac nut thao tac (nhan no-print).

## 2) Nguyen tac quan trong de khong vo giao dien

- Moi block noi dung lon cua CV phai nam trong section.section.
- section phai co position: relative de dat cac nut overlay.
- Nut thao tac section (.section-tools) dat tuyet doi ben tren section, an mac dinh va chi hien khi hover/focus.
- Nut them item trong section (.section-item-add-btn) dat tuyet doi trong .section-head, an mac dinh va chi hien khi hover/focus.
- Khong doi kich thuoc chu/chieu cao chinh cua noi dung CV chi vi them nut.
- Cac nut thao tac phai them class no-print de khong anh huong ban in.

## 3) CSS can co (core)

### 3.1. Khung section va bo nut section-level

- .section
  - position: relative
  - overflow: visible
- .section-tools
  - position: absolute
  - left: 10px
  - top: -12px
  - display: none
- .section:hover > .section-tools, .section:focus-within > .section-tools
  - display: inline-flex
- .tool-btn + cac bien the mau
  - .tool-add (xanh)
  - .tool-up/.tool-down (xam)
  - .tool-remove (do)

### 3.2. Nut them item trong tung section

- .section-head
  - position: relative
- .section-item-add-btn
  - position: absolute
  - right: 0
  - top: -2px
  - display: none
- .section:hover .section-item-add-btn, .section:focus-within .section-item-add-btn
  - display: inline-flex

Y nghia: day la diem quan trong nhat de giu nguyen bo cuc. Nut duoc overlay, khong chen vao flow noi dung.

## 4) HTML pattern chuan cho moi section

Moi section nen theo mau sau:

1. Khoi section-tools (4 nut +, ↑, ↓, ×)
2. Khoi section-head
   - tieu de section
   - line
   - nut cong them item cua section (neu can)
3. Noi dung section (ul, div, p...)

## 5) Hanh vi cac nut section-level

Cac nut nay dang duoc gan inline onclick de hoat dong truc tiep trong template HTML:

- Nut + (tool-add): clone section tu template #cv-section-template va chen sau section hien tai.
- Nut ↑ (tool-up): dua section len tren section lien ke.
- Nut ↓ (tool-down): dua section xuong duoi section lien ke.
- Nut × (tool-remove): xoa section hien tai, nhung chan xoa khi trong cot chi con 1 section.

Luu y:

- Co dung event.preventDefault va event.stopPropagation trong onclick.
- Khi them section moi, focus vao .section-title.

## 6) Hanh vi nut them item theo tung loai section

Da trien khai trong cv1 nhu sau:

- Thong tin ca nhan (.meta-list)
  - Them 1 li.meta-item moi gom 2 cot: .meta-label + .meta-value.
- Ky nang ([data-field='skills'])
  - Them 1 .skill-row moi gom ten ky nang + thanh muc do.
- Chung chi (.simple-list)
  - Them 1 li moi (ten chung chi + nam).
- Danh hieu/giai thuong (.simple-list)
  - Them 1 li moi (ten giai thuong + nam).
- So thich (.interest-grid)
  - Them 1 li moi, cho phep sua truc tiep.
- Nguoi gioi thieu ([data-field='reference'])
  - Them 1 doan thong tin nguoi gioi thieu vao text block.
- Muc tieu nghe nghiep ([data-field='summary'])
  - Them 1 dong bullet moi vao text block.
- Hoc van (.timeline-list)
  - Them 1 li.timeline-item moi (thoi gian, to chuc, vai tro, mo ta).
- Kinh nghiem lam viec (.timeline-list)
  - Them 1 li.timeline-item moi (thoi gian, cong ty, vi tri, mo ta).
- Hoat dong (.timeline-list)
  - Them 1 li.timeline-item moi (thoi gian, ten hoat dong, vai tro, mo ta).
- Thong tin them ([data-field='projects'])
  - Them 1 dong bullet vao text block.
- Section mau moi (#cv-section-template)
  - Co san nut + Noi dung de noi rong noi dung trong section vua them.

## 7) Quy tac contenteditable cho item moi

Khi tao node moi bang JS inline, can bo sung contenteditable va data-editable cho cac node can sua:

- Label/value trong meta-item moi.
- Ten ky nang moi.
- Item timeline moi (thuong dat ca item contenteditable).
- Item so thich moi.

Neu thieu cac attribute nay, item moi co the khong sua duoc trong editor.

## 8) Khuyen nghi khi ap dung cho cv2, cv3, cv4, cv5

1. Kiem tra cau truc section cua mau do
- Neu chua co section.section, bo sung de dung chung bo tools.

2. Ap dung CSS core truoc
- Them .section-tools va .section-item-add-btn theo dung co che hover/focus.

3. Gan bo section-tools cho tung section
- Dung cung onclick logic nhu cv1 de dam bao thong nhat.

4. Them nut cong theo dung loai noi dung section
- Danh sach 2 cot: meta-list.
- Danh sach card nho: simple-list.
- Danh sach timeline: timeline-list.
- Text block dai: timeline-desc/data-field tuong ung.

5. Them (hoac dong bo) #cv-section-template
- De nut + section-level hoat dong dung.

6. Test bat buoc
- Hover section co hien 4 nut.
- Bam + section tao section moi dung vi tri.
- Bam ↑/↓ di chuyen dung.
- Bam × khong xoa het section cuoi cung.
- Bam + item tao dung kieu item cho section do.
- In/PDF khong hien cac nut (no-print).

## 9) Danh sach thay doi thuc te trong cv1

- Da them/giu bo CSS cho:
  - .section-tools
  - .tool-btn (add/up/down/remove)
  - .section-item-add-btn (overlay + hover hien)
- Da gan section-tools cho tat ca section chinh.
- Da them nut + item cho cac section:
  - Thong tin ca nhan
  - Ky nang
  - Chung chi
  - Danh hieu va giai thuong
  - So thich
  - Nguoi gioi thieu
  - Muc tieu nghe nghiep
  - Hoc van
  - Kinh nghiem lam viec
  - Hoat dong
  - Thong tin them
  - Section mau moi
- Da giu nguyen bo cuc hien thi nhinh va noi dung CV.

## 10) Prompt mau de yeu cau AI sua mau CV khac

Ban co the dua prompt nay cho AI khi sua cv2/cv3/cv4/cv5:

"Hay ap dung bo editor controls giong cv1.html cho mau nay:
- Them section-tools (+, ↑, ↓, ×) cho moi section.
- Them item-add button cho cac section co noi dung lap lai (ky nang, hoc van, kinh nghiem, chung chi, giai thuong, so thich, thong tin ca nhan).
- Nut item-add phai la overlay trong section-head, an mac dinh va chi hien khi hover/focus de KHONG lam doi bo cuc CV.
- Giu nguyen giao dien hien thi CV hien tai (font, spacing, canh le).
- Cac nut thao tac phai co class no-print.
- Neu them item moi bang JS, dam bao item moi co contenteditable/data-editable de sua truc tiep duoc.
- Dong bo #cv-section-template de nut + section-level hoat dong." 

## 11) Ghi chu thong nhat

- Uu tien inline onclick nhu cv1 de de tiep tuc dung trong luong render template HTML.
- Tranh dua script phuc tap vao ngoai template neu he thong render co buoc loc script.
- Khi can mo rong, chi can bo sung them selector dung section va clone dung kieu node.
