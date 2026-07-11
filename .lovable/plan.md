## เป้าหมาย
เพิ่มช่อง **โน้ต/ข้อความสื่อสารกับนักเรียน** ในหน้าเรียน โดยเก็บข้อมูลต่อบทเรียนในฐานข้อมูล แก้ไขได้จากหน้า Admin ส่วน 3 ขั้นตอนเดิมยังคงแสดงเหมือนเดิม

## สิ่งที่จะทำ

### 1. ฐานข้อมูล
- เพิ่มคอลัมน์ `notes` (type `text`, nullable) ใน `public.lessons`
- อัปเดต RLS/policy ไม่จำเป็นต้องเปลี่ยน เพราะ lessons มี SELECT/ALL policy อยู่แล้ว

### 2. Server functions / DTO
- เพิ่ม `notes: string | null` ใน `LessonDTO` (`src/lib/courses.functions.ts`)
- เลือกคอลัมน์ `notes` ใน query ของ `getDashboard`
- เพิ่ม `notes` ใน input validator ของ `upsertLesson` (`src/lib/admin.functions.ts`)

### 3. หน้า Admin — แก้ไขบทเรียน
- ใน `LessonDialog` (`src/routes/_authenticated/admin.tsx`) เพิ่ม textarea ป้ายกำกับ **"โน้ต/ข้อความถึงนักเรียน"** ใต้ช่องคำอธิบาย
- บันทึกค่า `notes` เข้า `upsertLesson` พร้อมกับข้อมูลบทเรียนอื่น ๆ

### 4. หน้าเรียน — แสดงโน้ต
- ใน `src/routes/_authenticated/learn.$courseId.tsx` ใต้รายการ 3 ขั้นตอน "สิ่งที่ต้องทำในบทนี้" เพิ่มกล่องแสดง `active.lesson.notes`
- ถ้าไม่มีโน้ตจะไม่แสดงกล่องนั้น (ไม่ทิ้งพื้นที่ว่าง)
- สไตล์: กล่องแยกสีอ่อน (secondary/soft) มีหัวข้อ "หมายเหตุจากอาจารย์" หรือ "ข้อความเพิ่มเติม"

## รูปแบบเนื้อหา
- ใช้ textarea ธรรมดา (plain text) รองรับขึ้นบรรทัดใหม่ ไม่ต้องจัดรูปแบบรวย
- หากต้องการรองรับ rich text (bold, link, list) แจ้งได้ครับ จะใช้ markdown/plain editor แทน

## ไฟล์ที่เปลี่ยน
- `supabase/migrations/...` — migration เพิ่มคอลัมน์ `notes`
- `src/lib/courses.functions.ts` — DTO + query
- `src/lib/admin.functions.ts` — `upsertLesson` validator
- `src/routes/_authenticated/admin.tsx` — ฟอร์มแก้ไขบทเรียน
- `src/routes/_authenticated/learn.$courseId.tsx` — แสดงโน้ตในหน้าเรียน