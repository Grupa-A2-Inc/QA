import { expect, test, Page, Locator } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { testUsers } from '../fixtures/users';

const baseURL = process.env.E2E_BASE_URL ?? 'https://frontend-teal-five-57.vercel.app';

test.use({ baseURL });

function getSectionByHeading(page: Page, name: string): Locator {
	return page.getByRole('heading', { name }).locator('..');
}

function getInputByLabel(section: Locator, labelText: string): Locator {
	const safeText = labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const labelMatcher = new RegExp(`^${safeText}$`);
	// Exact match avoids collisions like "New Password" vs "Confirm New Password".
	return section.locator('label', { hasText: labelMatcher }).locator('..').locator('input');
}

test.describe('Admin - settings page', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
		await page.goto('/dashboard/admin/settings');
	});

	// TEST 1 — Basic sections render
	test('admin can see settings sections', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Account Details' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Organisation Details' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Subscription Plan' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Danger Zone' })).toBeVisible();
	});

	// TEST 2 — Account save shows feedback
	test('admin can save account details', async ({ page }) => {
		const accountSection = getSectionByHeading(page, 'Account Details');

		await getInputByLabel(accountSection, 'First Name').fill('Admin');
		await getInputByLabel(accountSection, 'Last Name').fill('User');
		await getInputByLabel(accountSection, 'Email').fill('admin.settings@example.com');

		await accountSection.getByRole('button', { name: 'Save Changes' }).click();
		await expect(accountSection.getByText('Saved')).toBeVisible();
	});

	// TEST 3 — Password validation errors
	test('password validation shows errors', async ({ page }) => {
		const passwordSection = getSectionByHeading(page, 'Change Password');

		const currentPassword = getInputByLabel(passwordSection, 'Current Password');
		const newPassword = getInputByLabel(passwordSection, 'New Password');
		const confirmPassword = getInputByLabel(passwordSection, 'Confirm New Password');

		await currentPassword.fill(testUsers.admin.password);
		await newPassword.fill('short');
		await confirmPassword.fill('short');
		await passwordSection.getByRole('button', { name: 'Update Password' }).click();

		await expect(passwordSection.getByText('New password must be at least 8 characters.')).toBeVisible();

		await newPassword.fill('longenough');
		await confirmPassword.fill('does-not-match');
		await passwordSection.getByRole('button', { name: 'Update Password' }).click();

		await expect(passwordSection.getByText('Passwords do not match.')).toBeVisible();
	});

	// TEST 4 — Password save clears fields
	test('password update clears fields and shows feedback', async ({ page }) => {
		const passwordSection = getSectionByHeading(page, 'Change Password');

		const currentPassword = getInputByLabel(passwordSection, 'Current Password');
		const newPassword = getInputByLabel(passwordSection, 'New Password');
		const confirmPassword = getInputByLabel(passwordSection, 'Confirm New Password');
		const currentPasswordValue = testUsers.admin.password;
		const updatedPasswordValue = `${currentPasswordValue}1`;

		await currentPassword.fill(currentPasswordValue);
		await newPassword.fill(updatedPasswordValue);
		await confirmPassword.fill(updatedPasswordValue);
		await passwordSection.getByRole('button', { name: 'Update Password' }).click();

		await expect(passwordSection.getByText('Saved')).toBeVisible();
		await expect(currentPassword).toHaveValue('');
		await expect(newPassword).toHaveValue('');
		await expect(confirmPassword).toHaveValue('');

		// Restore the original password so other tests keep working.
		await currentPassword.fill(updatedPasswordValue);
		await newPassword.fill(currentPasswordValue);
		await confirmPassword.fill(currentPasswordValue);
		await passwordSection.getByRole('button', { name: 'Update Password' }).click();
		await expect(passwordSection.getByText('Saved')).toBeVisible();
	});

	// TEST 5 — Organisation save shows feedback
	test('admin can save organisation details', async ({ page }) => {
		const orgSection = getSectionByHeading(page, 'Organisation Details');

		await getInputByLabel(orgSection, 'Organisation Name').fill('Settings Academy');
		await getInputByLabel(orgSection, 'City').fill('Bucharest');

		await orgSection.getByRole('button', { name: 'Save Changes' }).click();
		await expect(orgSection.getByText('Saved')).toBeVisible();
	});

	// TEST 6 — Danger zone actions are disabled
	test('danger zone actions are disabled', async ({ page }) => {
		await expect(page.getByRole('button', { name: 'Delete' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Deactivate' })).toBeDisabled();
	});
});

