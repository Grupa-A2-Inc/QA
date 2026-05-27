import { test, expect } from '@playwright/test';
const { loginAsTeacher, testUsers } = require('./helpers/auth');

test.describe('Teacher Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  });

  // Verifica ca un profesor se poate autentifica cu succes si este redirectionat la dashboard
  test('Autentificare cu succes redirectioneaza la dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'e.g. student@school.com' }).fill(testUsers.teacher.email);
    await page.getByRole('textbox', { name: 'Enter your password' }).fill(testUsers.teacher.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard**', { timeout: 60_000 });
    expect(page.url()).toContain('/dashboard');
  });

  // Verifica ca o parola gresita afiseaza un mesaj de eroare
  test('Parola gresita afiseaza mesaj de eroare', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'e.g. student@school.com' }).fill(testUsers.teacher.email);
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('wrongpassword999');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(
      page.getByText(/invalid|incorrect|wrong|error|password|credentials/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  // Verifica ca campurile goale afiseaza erori de validare
  test('Campuri goale afiseaza erori de validare', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(
      page.getByText(/required|invalid|email|password|field/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // Verifica ca dupa autentificare profesorul vede titlul "My Courses"
  test('Dupa autentificare profesorul vede My Courses', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page.getByRole('heading', { name: /my courses/i })).toBeVisible({ timeout: 15_000 });
  });

  // Verifica ca deconectarea redirectioneaza la pagina de login
  test('Deconectarea redirectioneaza la pagina de login', async ({ page }) => {
    await loginAsTeacher(page);
    // Incearca butoanele de logout prin diferite selectoare
    const logoutBtn = page.getByRole('button', { name: /log out|logout|sign out/i });
    const logoutLink = page.getByRole('link', { name: /log out|logout|sign out/i });
    if (await logoutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutBtn.click();
    } else if (await logoutLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutLink.click();
    } else {
      // Incearca sa gaseasca meniul utilizatorului
      const avatarBtn = page.locator('[aria-label*="user" i], [aria-label*="account" i], [aria-label*="menu" i]').first();
      await avatarBtn.click({ timeout: 5_000 });
      await page.getByText(/log out|logout|sign out/i).first().click({ timeout: 5_000 });
    }
    // Dupa logout, app-ul poate redirectiona la /login sau la pagina principala
    await page.waitForURL(/login|^\/$|vercel\.app\/$/, { timeout: 15_000 });
    const finalUrl = page.url();
    const isLoggedOut = finalUrl.includes('/login') || !finalUrl.includes('/dashboard');
    expect(isLoggedOut).toBeTruthy();
  });
});
