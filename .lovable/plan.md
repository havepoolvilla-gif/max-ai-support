## เพิ่มระบบอัพโหลดรูปปกคอร์สจากเครื่อง

เปลี่ยนการตั้งค่ารูปปกคอร์สในหน้า Admin จากการกรอก URL เป็นการอัพโหลดไฟล์รูปภาพจากคอมพิวเตอร์โดยตรง

### สิ่งที่จะทำ

**1. Storage Bucket ใหม่**
- สร้าง bucket `course-thumbnails` (public) สำหรับเก็บรูปปกคอร์ส เพื่อให้แสดงผลได้ทันทีโดยไม่ต้อง sign URL
- RLS policies บน `storage.objects`:
  - อ่านสาธารณะ (นักเรียนทุกคนดูรูปได้)
  - อัพโหลด/ลบ เฉพาะผู้ใช้ที่มี role `admin`

**2. Server functions (`src/lib/courses.functions.ts`)**
- เพิ่ม `createThumbnailUploadUrl({ courseId, filename })` — คืน signed upload URL + path สำหรับให้ admin อัพโหลดตรงจาก browser
- เพิ่ม `setCourseThumbnail({ courseId, path })` — อัพเดต `thumbnail_url` ในตาราง `courses` เป็น public URL ของไฟล์ พร้อมลบไฟล์เก่า (ถ้ามีและอยู่ใน bucket นี้)
- ทั้งสองใช้ `requireSupabaseAuth` + ตรวจ role admin ผ่าน `has_role`

**3. UI แก้ไขคอร์ส (Admin)**
- แทนที่ช่อง input "Thumbnail URL" ด้วย component อัพโหลดรูป:
  - แสดง preview รูปปกปัจจุบัน (ถ้ามี)
  - ปุ่ม "เลือกรูปภาพ" + รองรับ drag-and-drop
  - จำกัด: `image/*`, ≤ 5MB
  - แสดง progress ระหว่างอัพโหลด, toast success/error
  - ปุ่ม "ลบรูปปก" เพื่อเคลียร์ค่ากลับเป็น null
- หลังอัพโหลดสำเร็จ ให้ refetch รายการคอร์สทันที

**4. ข้อจำกัด/รายละเอียด**
- ไฟล์เก็บที่ path `{courseId}/{uuid}-{filename}` เพื่อกันชนกัน
- ถ้าคอร์สยังไม่มี id (กำลังสร้างใหม่) ให้บังคับ save คอร์สก่อน แล้วจึงเปิดให้อัพโหลดรูป (หรืออัพโหลดหลัง create)

### ไฟล์ที่แก้ไข/สร้าง
- Migration: RLS policies บน `storage.objects` สำหรับ bucket `course-thumbnails`
- สร้าง bucket ผ่าน tool `supabase--storage_create_bucket`
- `src/lib/courses.functions.ts` — เพิ่ม 2 server functions
- `src/routes/_authenticated/admin.tsx` (หรือ component ฟอร์มคอร์สที่เกี่ยวข้อง) — เปลี่ยน UI เป็น uploader

พร้อมลุยไหมครับ?
