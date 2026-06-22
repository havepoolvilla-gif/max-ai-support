## เป้าหมาย
ทำให้การ์ดคอร์สบนหน้า Dashboard แสดง "รูปปกวิดีโอ" ตามตัวอย่างที่ส่งมา (รูปปกอยู่ด้านบน, ป้าย "เริ่มเรียน" มุมซ้ายล่างของรูป, ตามด้วยหมวด/ชื่อ/รายละเอียด)

## สถานะปัจจุบัน
- ฐานข้อมูล `courses.thumbnail_url` มีอยู่แล้ว
- หน้า Admin (`src/routes/_authenticated/admin.tsx`) มีช่อง **Thumbnail URL** อยู่แล้ว — แอดมินสามารถใส่ลิงก์รูปปกได้
- หน้า Dashboard (`src/routes/_authenticated/dashboard.tsx`) **ยังไม่ได้แสดงรูปปก** — แสดงเฉพาะตัวอักษร

ดังนั้นงานหลักคือการ re-skin การ์ดให้แสดงรูปปก ไม่ต้องแก้ DB/Backend

## การเปลี่ยนแปลง

### 1. `src/routes/_authenticated/dashboard.tsx` — `CourseCard`
เพิ่มส่วนรูปปกบนสุดของการ์ด:
- กล่องอัตราส่วน 16:9 (`aspect-video`) ที่ด้านบน
- ถ้ามี `course.thumbnailUrl` → `<img>` (object-cover)
- ถ้าไม่มี → fallback เป็น gradient อ่อน + ตัวอักษรแรกของชื่อคอร์ส (placeholder ที่ดูสะอาด)
- ป้าย "เริ่มเรียน" (สีพาสเทล) ลอยอยู่มุมซ้ายล่างของรูป
- ใต้รูป: label "คอร์สเรียน" สี primary เล็กๆ → ชื่อคอร์ส → tagline → progress bar → ปุ่ม "เรียนต่อ"

ปรับ `LockedCourseCard` ให้มี layout เดียวกัน (มีพื้นที่รูปปก + overlay lock icon) เพื่อให้ grid สม่ำเสมอ

### 2. ไม่แตะ
- Schema / migrations
- `courses.functions.ts` (ส่ง `thumbnailUrl` อยู่แล้ว)
- หน้า Admin (ช่อง URL ใช้งานได้อยู่แล้ว)

## หมายเหตุ
- ยังคงเป็น **URL-based** (แอดมินวาง URL รูปเอง) — ตรงกับ flow ที่มีอยู่
- ถ้าต้องการ **upload ไฟล์รูปโดยตรง** จากหน้า Admin (ผ่าน Storage bucket) บอกได้ จะเพิ่มในรอบถัดไป (ต้องสร้าง bucket + RLS + UI uploader)
