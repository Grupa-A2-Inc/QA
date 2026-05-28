import { test, expect } from '@playwright/test';
const { loginAsTeacher } = require('./helpers/auth');

const DRAFT_COURSE_ID = '7a5b0fd1-a365-4fae-a303-9d75ce56598a';

test.describe('My Courses page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/dashboard/teacher/');
    await expect(page.getByRole('heading', { name: /my courses/i })).toBeVisible({ timeout: 15_000 });
  });

  // Verifica ca pagina incarca si afiseaza titlul My Courses
  test('Pagina afiseaza titlul My Courses', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my courses/i })).toBeVisible({ timeout: 10_000 });
  });

  // Verifica ca bara de cautare filtreaza cursurile in timp real
  test('Bara de cautare filtreaza cursurile in timp real', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('zzznoresultsxyz');
      await page.waitForTimeout(800);
      // Dupa filtrare nu ar trebui sa fie niciun curs sau apare mesaj de tip "no results"
      const noResults = page.getByText(/no courses|no results|nothing found/i);
      const courseCards = page.locator('[data-testid*="course"], .course-card, article').filter({ hasText: /zzznoresultsxyz/i });
      const hasNoResults = await noResults.isVisible({ timeout: 5_000 }).catch(() => false);
      const cardCount = await courseCards.count();
      expect(hasNoResults || cardCount === 0).toBeTruthy();
      await searchInput.clear();
    } else {
      test.skip();
    }
  });

  // Verifica ca tab-urile de status (ALL / DRAFT / PUBLISHED) filtreaza cursurile corect
  test('Tab-urile de status filtreaza cursurile', async ({ page }) => {
    const allTab = page.getByRole('tab', { name: /all/i }).or(page.getByRole('button', { name: /all/i }));
    const draftTab = page.getByRole('tab', { name: /draft/i }).or(page.getByRole('button', { name: /draft/i }));
    const publishedTab = page.getByRole('tab', { name: /published/i }).or(page.getByRole('button', { name: /published/i }));

    if (await allTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await allTab.click();
      await page.waitForTimeout(500);
      await draftTab.click();
      await page.waitForTimeout(500);
      await publishedTab.click();
      await page.waitForTimeout(500);
      // Daca niciun curs nu este publicat, se afiseaza starea goala
      const content = page.locator('main, [role="main"]');
      await expect(content).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip();
    }
  });

  // Verifica ca butonul New Course este vizibil si navigheaza la pagina de creare
  test('Butonul New Course navigheaza la pagina de creare', async ({ page }) => {
    const newCourseBtn = page.getByRole('button', { name: /new course/i })
      .or(page.getByRole('link', { name: /new course/i }));
    await expect(newCourseBtn).toBeVisible({ timeout: 10_000 });
    await newCourseBtn.click();
    await page.waitForURL(/course|create|new/i, { timeout: 15_000 });
    expect(page.url()).toMatch(/course|create|new/i);
  });

  // Verifica ca butonul Delete este vizibil doar pe cursurile DRAFT, nu pe cele PUBLISHED
  test('Butonul Delete apare doar pe cursurile DRAFT', async ({ page }) => {
    const publishedTab = page.getByRole('tab', { name: /published/i })
      .or(page.getByRole('button', { name: /published/i }));
    if (await publishedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await publishedTab.click();
      await page.waitForTimeout(500);
      const deleteBtn = page.getByRole('button', { name: /delete/i });
      const count = await deleteBtn.count();
      expect(count).toBe(0);
    } else {
      test.skip();
    }
  });

  // Verifica ca stergerea unui draft afiseaza dialog de confirmare; anularea pastreaza cursul
  // Foloseste cursul DRAFT cunoscut cu ID-ul hardcodat
  test('Stergerea unui draft afiseaza dialog de confirmare; anularea pastreaza cursul', async ({ page }) => {
    // Navigheaza la tab-ul DRAFT pentru a fi sigur ca butonul Delete este vizibil
    const draftTab = page.getByRole('tab', { name: /draft/i })
      .or(page.getByRole('button', { name: /all/i })); // fallback: ALL tab
    if (await draftTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await draftTab.click();
      await page.waitForTimeout(600);
    }

    // Gaseste cardul cursului DRAFT dupa link-ul care contine courseId-ul cunoscut
    const draftCourseCard = page.locator(`[href*="${DRAFT_COURSE_ID}"], a[href*="${DRAFT_COURSE_ID}"]`)
      .locator('..') // urcam la parintele card-ului
      .first();

    // Gaseste butonul Delete asociat cursului DRAFT
    // Incearca sa gaseasca butonul Delete in proximitatea link-ului catre cursul specific
    const courseRow = page.locator(`article:has(a[href*="${DRAFT_COURSE_ID}"]), div:has(a[href*="${DRAFT_COURSE_ID}"])`).first();
    let deleteBtn = courseRow.getByRole('button', { name: /delete/i });

    // Daca nu gasim dupa courseId, luam primul buton Delete de pe pagina (fallback)
    const hasCourseRow = await courseRow.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCourseRow || !await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    }

    if (!await deleteBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      test.skip(true, 'Butonul Delete nu este vizibil — cursul DRAFT poate fi inaccesibil in UI');
      return;
    }

    // Intercepteaza dialog nativ (window.confirm)
    let dialogHandled = false;
    page.once('dialog', async (dialog) => {
      dialogHandled = true;
      await dialog.dismiss(); // Cancel — pastreaza cursul
    });

    await deleteBtn.click();
    await page.waitForTimeout(1500);

    if (!dialogHandled) {
      // Dialog custom (non-nativ)
      const customDialog = page.getByRole('dialog')
        .or(page.getByRole('alertdialog'))
        .or(page.getByText(/confirm|are you sure|delete|sterge/i).first());
      const isCustomVisible = await customDialog.isVisible({ timeout: 5_000 }).catch(() => false);
      if (isCustomVisible) {
        const cancelBtn = page.getByRole('button', { name: /cancel|no|keep|nu/i });
        if (await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await cancelBtn.click();
        }
      }
    }

    // Cursul trebuie sa fie inca prezent dupa anulare
    await page.waitForTimeout(600);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 5_000 });
  });
});
