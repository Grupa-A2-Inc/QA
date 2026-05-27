import { expect, Locator, Page } from '@playwright/test';

// --------------------------------------------------
// acceptNextDialog
// Acceptă următorul dialog (confirm/alert/prompt) care apare.
// Util în acțiuni de tip "Delete", unde UI cere confirmare.
// --------------------------------------------------
export async function acceptNextDialog(page: Page) {
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
}

// --------------------------------------------------
// expectAnyVisible
// Primește o listă de locatori și verifică dacă MĂCAR unul
// dintre ei este vizibil. Util pentru UI-uri dinamice
// unde pot exista mai multe variante valide.
// --------------------------------------------------
export async function expectAnyVisible(locators: Locator[]) {
  for (const locator of locators) {
    const first = locator.first();

    if (await first.isVisible().catch(() => false)) {
      await expect(first).toBeVisible();
      return;
    }
  }

  throw new Error('None of the expected locators were visible.');
}

// --------------------------------------------------
// clickFirstVisible
// Caută primul locator vizibil din listă și dă click pe el.
// Evită erorile în UI-uri responsive sau cu fallback-uri.
// --------------------------------------------------
export async function clickFirstVisible(locators: Locator[]) {
  for (const locator of locators) {
    const first = locator.first();

    if (await first.isVisible().catch(() => false)) {
      await first.click();
      return;
    }
  }

  throw new Error('No visible locator found to click.');
}
