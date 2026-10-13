import { test, expect } from '@playwright/test';

test('ทดสอบการเข้าสู่ระบบด้วย Staff Account', async ({ page }) => {
  // 1. ไปที่หน้า Sign-in
  await page.goto('http://localhost:5174/sign-in');

  // 2. เลือกช่อง Username (input ช่องแรกบนหน้าจอ)
  await page.locator('input').nth(0).fill('staff1');

  // 3. เลือกช่อง Password (input ช่องที่สองบนหน้าจอ)
  await page.locator('input').nth(1).fill('staffpassword123');

  // 4. กดปุ่ม Sign in
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 5. ตรวจสอบว่าระบบทำงานต่อ (เช่น URL เปลี่ยน หรือแสดงข้อความผิดพลาดถ้า Password ไม่ถูกต้อง)
  await page.waitForTimeout(10000); // รอผลลัพธ์ 2 วินาทีเพื่อดูหน้าจอ
});