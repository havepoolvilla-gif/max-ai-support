## เพิ่มระบบอัพโหลดไฟล์วิดีโอบทเรียนจากเครื่อง

เพิ่มความสามารถให้แอดมินอัพโหลดไฟล์วิดีโอบทเรียนจากคอมพิวเตอร์ได้โดยตรง แทนที่จะกรอกเฉพาะ URL (ยังคงตัวเลือกใส่ URL เผื่อใช้ลิงก์ภายนอก เช่น YouTube/Vimeo/HLS)

### สิ่งที่จะทำ

**1. Storage Bucket ใหม่ (`lesson-videos`, private)**
- สร้าง bucket แบบ private ผ่าน `supabase--storage_create_bucket`
- RLS บน `storage.objects`:
  - upload/update/delete: เฉพาะ admin
  - select: เฉพาะ admin หรือผู้ที่มี `course_access` ในคอร์สนั้น (join ผ่าน path `{courseId}/...`)

**2. Server functions ใหม่ใน `src/lib/admin.functions.ts`**
- `createLessonVideoUploadUrl({ lessonId, filename, contentType })` — ตรวจ admin แล้วคืน **signed upload URL** (`storage.createSignedUploadUrl`) + `path` (ไฟล์ใหญ่ไม่ผ่าน base64 เหมือน thumbnail เพราะ video เกิน 5MB แน่ ๆ; ต้องอัพจาก browser ตรงเข้า storage)
- `setLessonVideo({ lessonId, path })` — ตรวจ admin, resolve `course_id` จาก lesson→module, ตรวจว่า path ขึ้นต้นด้วย `{courseId}/`, ลบไฟล์เก่าถ้ามีอยู่ใน bucket นี้, อัพเดต `lessons.video_url` เป็น `lesson-videos/{path}`
- `clearLessonVideo({ lessonId })` — ลบไฟล์เดิม + set `video_url = null`
- จำกัดชนิดไฟล์ที่ฝั่ง server เมื่อบันทึก (`video/*`) และขนาดสูงสุด 500MB

**3. อ่านวิดีโอตอนเรียน (`get_lesson_video_url` RPC)**
- ปรับ RPC `get_lesson_video_url` (SECURITY DEFINER เดิม) ให้:
  - ถ้า `video_url` ขึ้นต้นด้วย `lesson-videos/` → คืน **signed URL** อายุ 2 ชั่วโมง (สร้างผ่าน storage function ในฝั่ง server) โดย wrap ใน server function ใหม่แทน (RPC SQL สร้าง signed URL ตรง ๆ ไม่ได้)
- ทางเลือกที่จะทำจริง: ปรับ `getLessonVideo` server fn (`src/lib/lesson-video.functions.ts`) — หลังได้ค่าจาก RPC ถ้าเป็น path ใน `lesson-videos/` ให้ใช้ `supabaseAdmin.storage.createSignedUrl(key, 7200)` ก่อนคืน (สิทธิ์ยังตรวจใน RPC เหมือนเดิม)

**4. UI แก้ไขบทเรียน (`admin.tsx` → `LessonDialog`)**
เปลี่ยนช่อง "Video URL" เป็น 2 โหมด (tab / toggle):
- **อัพโหลดไฟล์** (ค่าเริ่มต้น):
  - แสดง preview วิดีโอปัจจุบัน (ถ้ามี, ใช้ signed URL)
  - Dropzone + ปุ่ม "เลือกวิดีโอ" รับ `video/*` ≤ 500MB
  - ขั้นตอน: เรียก `createLessonVideoUploadUrl` → ใช้ `supabase.storage.from('lesson-videos').uploadToSignedUrl(path, token, file)` (แสดง progress) → เรียก `setLessonVideo` → invalidate query
  - ปุ่ม "ลบวิดีโอ"
- **ใส่ลิงก์ภายนอก**: input URL แบบเดิม (บันทึกผ่าน `upsertLesson` เหมือนปัจจุบัน) — เผื่อใช้ YouTube/Vimeo/HLS
- ถ้าเป็นบทเรียนใหม่ (ยังไม่มี `lessonId`) ให้บังคับบันทึกบทเรียนก่อน แล้วค่อยเปิดโหมดอัพโหลดไฟล์ (เหมือนที่ทำกับ course thumbnail)

**5. รายละเอียดเพิ่มเติม**
- Path: `{courseId}/{lessonId}/{uuid}-{safeFilename}`
- ค่าใน `lessons.video_url` เก็บเป็น `lesson-videos/{path}` เพื่อแยกจาก URL ภายนอก (URL ภายนอกจะขึ้นต้นด้วย `http`)
- ไม่แตะ schema `lessons` (ใช้ `video_url` เดิม)

### ไฟล์ที่แก้ไข/สร้าง
- สร้าง bucket `lesson-videos` (private) ผ่าน tool
- Migration: RLS policies บน `storage.objects` สำหรับ bucket นี้
- `src/lib/admin.functions.ts` — เพิ่ม 3 server functions
- `src/lib/lesson-video.functions.ts` — resolve signed URL สำหรับ path ใน bucket
- `src/routes/_authenticated/admin.tsx` — เพิ่ม `VideoUploader` ใน `LessonDialog` (toggle upload / external URL)
