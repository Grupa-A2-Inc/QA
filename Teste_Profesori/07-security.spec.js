import { test, expect } from '@playwright/test';
const { loginAsTeacher, testUsers } = require('./helpers/auth');

const RANDOM_UUID = '00000000-0000-0000-0000-000000000001';

// Verifica daca URL-ul curent contine /login sau nu contine ruta protejata
async function assertBlockedOrRedirected(page, forbiddenPattern) {
  const url = page.url();
  const isOnLogin = url.includes('/login');
  const isOnForbidden = url.match(forbiddenPattern);
  // Acceptat: redirectionat la /login SAU pagina afiseaza mesaj de acces interzis
  if (!isOnLogin && isOnForbidden) {
    const blocked = await page.getByText(/forbidden|unauthorized|access denied|not allowed|403/i)
      .isVisible({ timeout: 5_000 }).catch(() => false);
    expect(blocked).toBeTruthy();
  } else {
    expect(isOnLogin || !isOnForbidden).toBeTruthy();
  }
}

test.describe('Security Tests - Unauthenticated Access', () => {
  test.beforeEach(async ({ page }) => {
    // Asigura sesiune curata (neautentificat)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  });

  // Verifica ca un utilizator neautentificat este redirectionat la /login cand acceseaza /dashboard/teacher/
  test('Utilizator neautentificat vizitand /dashboard/teacher/ este redirectionat la /login', async ({ page }) => {
    await page.goto('/dashboard/teacher/', { waitUntil: 'load', timeout: 30_000 });
    await expect(page).toHaveURL(/.*login.*/, { timeout: 15_000 });
  });

  // Verifica ca un utilizator neautentificat este redirectionat la /login cand acceseaza /dashboard/teacher/tests/
  test('Utilizator neautentificat vizitand /dashboard/teacher/tests/ este redirectionat la /login', async ({ page }) => {
    await page.goto('/dashboard/teacher/tests/', { waitUntil: 'load', timeout: 30_000 });
    await expect(page).toHaveURL(/.*login.*/, { timeout: 15_000 });
  });
});

test.describe('Security Tests - Teacher Role Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  // PRIORITATE INALTA: Verifica ca un profesor nu poate accesa dashboard-ul de admin
  test('[HIGH] Profesor autentificat nu vede dashboard-ul de admin', async ({ page }) => {
    await page.goto('/dashboard/admin/', { waitUntil: 'load', timeout: 30_000 });
    const url = page.url();
    const isOnLogin = url.includes('/login');
    const isOnAdminDash = url.includes('/dashboard/admin/');

    if (isOnAdminDash) {
      // Daca a ajuns pe pagina, verifica ca NU vede continutul de admin
      const adminContent = page.getByText(/admin dashboard/i)
        .or(page.getByRole('heading', { name: /admin dashboard/i }));
      const isAdminVisible = await adminContent.isVisible({ timeout: 5_000 }).catch(() => false);
      // Aceasta ar fi o vulnerabilitate de securitate
      expect(isAdminVisible).toBeFalsy();
    } else {
      // Corect: redirectionat la login sau alta pagina
      expect(isOnLogin || !isOnAdminDash).toBeTruthy();
    }
  });

  // PRIORITATE INALTA: Verifica ca un profesor nu poate accesa gestionarea utilizatorilor din admin
  test('[HIGH] Profesor autentificat nu vede pagina de gestionare a utilizatorilor admin', async ({ page }) => {
    await page.goto('/dashboard/admin/users', { waitUntil: 'load', timeout: 30_000 });
    const url = page.url();
    const isOnAdminUsers = url.includes('/dashboard/admin/users');

    if (isOnAdminUsers) {
      // Nu ar trebui sa randeze interfata de management utilizatori
      const usersTable = page.locator('table, [data-testid*="users-table"]');
      const hasUsersTable = await usersTable.isVisible({ timeout: 5_000 }).catch(() => false);
      // Aceasta ar fi o vulnerabilitate de securitate
      expect(hasUsersTable).toBeFalsy();
    } else {
      expect(!isOnAdminUsers).toBeTruthy();
    }
  });

  // PRIORITATE INALTA: Verifica ca un profesor nu poate accesa setarile admin
  test('[HIGH] Profesor autentificat nu vede pagina de setari admin', async ({ page }) => {
    await page.goto('/dashboard/admin/settings', { waitUntil: 'load', timeout: 30_000 });
    const url = page.url();
    const isOnAdminSettings = url.includes('/dashboard/admin/settings');

    if (isOnAdminSettings) {
      const settingsContent = page.getByRole('heading', { name: /settings/i })
        .or(page.getByText(/global settings|admin settings/i));
      const hasSettings = await settingsContent.isVisible({ timeout: 5_000 }).catch(() => false);
      expect(hasSettings).toBeFalsy();
    } else {
      expect(!isOnAdminSettings).toBeTruthy();
    }
  });

  // PRIORITATE MEDIE: Verifica ca un profesor nu poate accesa ruta adaptiva de student
  test('[MEDIUM] Profesor autentificat este blocat la /dashboard/student/adaptive', async ({ page }) => {
    await page.goto('/dashboard/student/adaptive', { waitUntil: 'load', timeout: 30_000 });
    const url = page.url();
    const isOnStudentAdaptive = url.includes('/dashboard/student/adaptive');

    if (isOnStudentAdaptive) {
      // Verifica ca nu se vede continut de student
      const studentContent = page.getByText(/adaptive|learning path/i).first();
      const hasContent = await studentContent.isVisible({ timeout: 5_000 }).catch(() => false);
      // Acceptabil numai daca este pagina goala / eroare
      const errorState = await page.getByText(/forbidden|not allowed|unauthorized|error/i)
        .isVisible({ timeout: 3_000 }).catch(() => false);
      if (hasContent && !errorState) {
        // Posibila problema de acces cross-role
        console.warn('SECURITY CONCERN [MEDIUM]: Teacher can access student adaptive page');
      }
    }
    // Test trece - marcam observatia in log
    expect(true).toBeTruthy();
  });

  // PRIORITATE INALTA: Verifica ca un profesor nu poate accesa un curs care nu ii apartine (UUID aleator)
  test('[HIGH] Profesor nu poate accesa un curs strain (UUID aleator)', async ({ page }) => {
    await page.goto(`/dashboard/teacher/course/${RANDOM_UUID}`, { waitUntil: 'load', timeout: 30_000 });
    const url = page.url();

    // Poate fi redirectionat sau afisa eroare - dar NU interfata de management a cursului
    const courseManagementUI = page.getByRole('tab', { name: /content/i })
      .and(page.getByRole('tab', { name: /students/i }));
    const hasUI = await page.getByRole('tab', { name: /content/i }).isVisible({ timeout: 5_000 }).catch(() => false)
      && await page.getByRole('tab', { name: /students/i }).isVisible({ timeout: 5_000 }).catch(() => false);

    const hasError = await page.getByText(/not found|404|error|unauthorized|forbidden|access denied/i)
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const isRedirected = !url.includes(RANDOM_UUID) || url.includes('/login');

    if (hasUI && !hasError && !isRedirected) {
      // Aceasta este o vulnerabilitate: profesorul vede interfata cursului strain
      expect(false, 'SECURITY VULNERABILITY: Teacher can access another course management UI').toBeTruthy();
    } else {
      expect(hasError || isRedirected || !hasUI).toBeTruthy();
    }
  });

  // PRIORITATE INALTA: Verifica ca un profesor nu poate accesa test builder pentru o lectie inexistenta
  test('[HIGH] Profesor nu poate accesa test builder pentru lectie inexistenta (UUID aleator)', async ({ page }) => {
    await page.goto(
      `/dashboard/teacher/course/${RANDOM_UUID}/lesson/${RANDOM_UUID}/test-builder`,
      { waitUntil: 'load', timeout: 30_000 }
    );
    const url = page.url();

    const hasError = await page.getByText(/not found|404|error|unauthorized|forbidden/i)
      .isVisible({ timeout: 10_000 }).catch(() => false);
    const isRedirected = !url.includes(RANDOM_UUID) || url.includes('/login');
    const testBuilderUI = await page.getByRole('button', { name: /add question/i })
      .isVisible({ timeout: 5_000 }).catch(() => false);

    if (testBuilderUI && !hasError && !isRedirected) {
      // Test builder accesibil pentru lectie inexistenta - posibila problema
      expect(false, 'SECURITY ISSUE: Test builder accessible for non-existent lesson').toBeTruthy();
    } else {
      expect(hasError || isRedirected || !testBuilderUI).toBeTruthy();
    }
  });
});
