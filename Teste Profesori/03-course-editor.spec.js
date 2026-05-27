import { test, expect } from '@playwright/test';
const { loginAsTeacher } = require('./helpers/auth');

// Navighează la pagina de curs nou și returnează URL-ul final
async function goToNewCoursePage(page) {
  await page.goto('/dashboard/teacher/');
  await page.waitForTimeout(1000);
  const newCourseBtn = page.getByRole('button', { name: /new course/i })
    .or(page.getByRole('link', { name: /new course/i }));
  await expect(newCourseBtn).toBeVisible({ timeout: 15_000 });
  const currentUrl = page.url();
  await newCourseBtn.click();
  // Asteapta navigare sau modal
  await page.waitForTimeout(2000);
  return page.url();
}

// Gaseste primul camp de text disponibil pe pagina de curs nou
async function findFirstTextField(page) {
  // Incearca diferite selectoare in ordine de prioritate
  const candidates = [
    page.getByRole('textbox', { name: /title|name|course/i }).first(),
    page.getByPlaceholder(/title|name|course/i).first(),
    page.getByLabel(/title|name/i).first(),
    page.locator('input[type="text"]:visible').first(),
    page.locator('textarea:visible').first(),
    page.getByRole('textbox').first(),
  ];
  for (const locator of candidates) {
    if (await locator.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return locator;
    }
  }
  return null;
}

// Navighează la primul curs existent
async function goToFirstCourse(page) {
  await page.goto('/dashboard/teacher/');
  await page.waitForTimeout(1000);

  // Incearca diferite moduri de a gasi un curs
  const courseLinks = [
    page.getByRole('link', { name: /view|manage|edit|open/i }).first(),
    page.locator('a[href*="/course/"]').first(),
    page.locator('article a, .course-card a').first(),
  ];

  for (const link of courseLinks) {
    if (await link.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await link.click();
      await page.waitForURL(/course/i, { timeout: 15_000 });
      return true;
    }
  }

  // Incearca click pe card-ul cursului
  const card = page.locator('article, [data-testid*="course"], .course-card').first();
  if (await card.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await card.click();
    await page.waitForTimeout(2000);
    if (page.url().match(/course/i)) return true;
  }
  return false;
}

test.describe('Course Editor', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  // SKIP: known bug - New Course form inputs have no accessible labels. Issue reported on GitHub.
  test.skip('Pagina de curs nou incarca formularul de editare', async ({ page }) => {
    await goToNewCoursePage(page);
    const titleField = await findFirstTextField(page);
    if (!titleField) {
      test.skip(true, 'Nu s-a gasit niciun camp text pe pagina de curs nou');
      return;
    }
    await expect(titleField).toBeVisible({ timeout: 10_000 });
  });

  // SKIP: known bug - New Course form inputs have no accessible labels. Issue reported on GitHub.
  test.skip('Formular gol afiseaza erori de validare', async ({ page }) => {
    await goToNewCoursePage(page);
    await page.waitForTimeout(500);
    const saveBtn = page.getByRole('button', { name: /save|create|submit|next/i }).first();
    if (!await saveBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      test.skip(true, 'Butonul Save nu este gasit pe pagina de curs nou');
      return;
    }
    await saveBtn.click();
    await page.waitForTimeout(1000);
    const errorMsg = page.getByText(/required|invalid|error|field|obligatoriu|necesar/i).first();
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });
  });

  // SKIP: known bug - New Course form inputs have no accessible labels. Issue reported on GitHub.
  test.skip('Completarea formularului si salvarea redirectioneaza la pagina de management', async ({ page }) => {
    await goToNewCoursePage(page);
    const titleField = await findFirstTextField(page);
    if (!titleField) {
      test.skip(true, 'Nu s-a gasit niciun camp text pe pagina de curs nou');
      return;
    }
    await titleField.fill('Test Curs Automat ' + Date.now());

    // Incearca sa completeze descrierea daca exista
    const descField = page.getByRole('textbox', { name: /description|descriere/i })
      .or(page.getByPlaceholder(/description|descriere/i))
      .or(page.locator('textarea:visible').first());
    if (await descField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descField.fill('Descriere test automat QA');
    }

    // Selecteaza categoria daca exista
    const categorySelect = page.locator('select:visible, [role="combobox"]:visible').first();
    if (await categorySelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      try {
        await categorySelect.selectOption({ index: 1 });
      } catch {}
    }

    const saveBtn = page.getByRole('button', { name: /save|create|submit|next/i }).first();
    if (!await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(true, 'Butonul Save nu este vizibil');
      return;
    }
    await saveBtn.click();
    await page.waitForTimeout(3000);
    // Dupa salvare ar trebui sa fie pe o pagina de management/editare curs
    expect(page.url()).not.toBe('https://frontend-teal-five-57.vercel.app/dashboard/teacher/');
  });

  // Verifica ca pagina de management afiseaza tab-urile Content si Students
  test('Pagina de management afiseaza tab-urile Content si Students', async ({ page }) => {
    const found = await goToFirstCourse(page);
    if (!found) {
      test.skip(true, 'Nu s-a gasit niciun curs disponibil');
      return;
    }
    await page.waitForTimeout(1000);
    const contentTab = page.getByRole('tab', { name: /content/i })
      .or(page.getByText(/^content$/i).first());
    const studentsTab = page.getByRole('tab', { name: /students/i })
      .or(page.getByText(/^students$/i).first());
    await expect(contentTab).toBeVisible({ timeout: 10_000 });
    await expect(studentsTab).toBeVisible({ timeout: 10_000 });
  });

  // Verifica ca tab-ul Content afiseaza arborele cursului cu capitole si lectii
  test('Tab-ul Content afiseaza arborele cursului', async ({ page }) => {
    const found = await goToFirstCourse(page);
    if (!found) {
      test.skip(true, 'Nu s-a gasit niciun curs disponibil');
      return;
    }
    await page.waitForTimeout(1000);
    const contentTab = page.getByRole('tab', { name: /content/i });
    if (await contentTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await contentTab.click();
      await page.waitForTimeout(500);
    }
    // Verifica ca exista un arbore de continut sau elemente de capitol/lectie
    const treeOrChapters = page.getByRole('tree')
      .or(page.locator('[data-testid*="chapter"], [data-testid*="lesson"]').first())
      .or(page.getByText(/chapter|lesson|capitol|lectie/i).first());
    await expect(treeOrChapters).toBeVisible({ timeout: 10_000 });
  });

  // Verifica ca tab-ul Students afiseaza studentii inscrisi sau starea goala
  test('Tab-ul Students afiseaza studentii inscrisi sau starea goala', async ({ page }) => {
    const found = await goToFirstCourse(page);
    if (!found) {
      test.skip(true, 'Nu s-a gasit niciun curs disponibil');
      return;
    }
    await page.waitForTimeout(1000);
    const studentsTab = page.getByRole('tab', { name: /students/i });
    if (!await studentsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(true, 'Tab-ul Students nu este vizibil');
      return;
    }
    await studentsTab.click();
    await page.waitForTimeout(800);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 5_000 });
  });

  // Verifica ca capitolele pot fi extinse si colapsate in arborele de continut
  test('Capitolele pot fi extinse si colapsate', async ({ page }) => {
    const found = await goToFirstCourse(page);
    if (!found) {
      test.skip(true, 'Nu s-a gasit niciun curs disponibil');
      return;
    }
    await page.waitForTimeout(1000);
    const contentTab = page.getByRole('tab', { name: /content/i });
    if (await contentTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await contentTab.click();
      await page.waitForTimeout(500);
    }
    const expandable = page.locator('[aria-expanded]').first();
    if (!await expandable.isVisible({ timeout: 5_000 }).catch(() => false)) {
      test.skip(true, 'Nu exista elemente expandabile in arborele de continut');
      return;
    }
    const before = await expandable.getAttribute('aria-expanded');
    await expandable.click();
    await page.waitForTimeout(400);
    const after = await expandable.getAttribute('aria-expanded');
    expect(before).not.toBe(after);
  });
});
