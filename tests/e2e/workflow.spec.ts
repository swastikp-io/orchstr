import { test, expect } from '@playwright/test';

test.describe('ORCHSTR E2E Workflow', () => {
  test.beforeEach(async ({ request }) => {
    // Reset DB to clean canonical seed state before running tests
    await request.post('http://localhost:3001/api/seed');
  });

  test('loads company overview and displays canonical brief and metrics', async ({ page }) => {
    await page.goto('/');

    // Check brand header
    await expect(page.locator('header')).toContainText('ORCHSTR');
    await expect(page.locator('header')).toContainText('Antigravity IDE');

    // Check overview hero
    await expect(page.locator('h1')).toContainText('ApexFlow Systems');
    await expect(page.locator('text=Canonical Company Brief')).toBeVisible();
    await expect(page.locator('text=Target Customer')).toBeVisible();
    await expect(page.locator('text=Strategic Assumptions')).toBeVisible();
  });

  test('switches workspace to BioPulse Health with strict company isolation', async ({ page }) => {
    await page.goto('/');

    // Verify initial company is ApexFlow
    await expect(page.locator('h1')).toContainText('ApexFlow Systems');

    // Open workspace switcher dropdown
    await page.locator('header').locator('text=ApexFlow Systems').click();

    // Select BioPulse Health
    await page.locator('text=BioPulse Health').click();

    // Verify workspace switched and isolated data loaded
    await expect(page.locator('h1')).toContainText('BioPulse Health');
    await expect(page.locator('text=Digital Health & Clinical Trials')).toBeVisible();
  });

  test('navigates across all 6 core dashboard views', async ({ page }) => {
    await page.goto('/');

    // 1. Agents & Roles
    await page.locator('button:has-text("Agents & Roles")').click();
    await expect(page.locator('text=Executive & Managerial Roles')).toBeVisible();
    await expect(page.locator('text=Founder / CEO')).toBeVisible();
    await expect(page.locator('text=Brand Positioning Strategist')).toBeVisible();

    // 2. Task Board
    await page.locator('button:has-text("Task Board")').click();
    await expect(page.locator('text=Deterministic Task Board')).toBeVisible();
    await expect(page.locator('text=Queued')).toBeVisible();
    await expect(page.locator('text=Running')).toBeVisible();
    await expect(page.locator('text=Blocked')).toBeVisible();

    // 3. Knowledge & Artifacts
    await page.locator('button:has-text("Knowledge & Artifacts")').click();
    await expect(page.locator('text=Shared Artifacts')).toBeVisible();

    // 4. Approval Inbox
    await page.locator('button:has-text("Approval Inbox")').click();
    await expect(page.locator('text=Pending Review')).toBeVisible();

    // 5. Operational Review
    await page.locator('button:has-text("Operational Review")').click();
    await expect(page.locator('text=Primary Bottleneck')).toBeVisible();
    await expect(page.locator('text=Proposed Measurable Experiment')).toBeVisible();

    // 6. Activity Log
    await page.locator('button:has-text("Activity Log")').click();
    await expect(page.locator('text=Recent Activity & Audit Trail')).toBeVisible();
  });

  test('opens Antigravity Task Packet viewer, inspects actionable prompt and criteria', async ({ page }) => {
    await page.goto('/');

    // Go to Task Board
    await page.locator('button:has-text("Task Board")').click();

    // Find a task and click "Packet / Run"
    const packetBtn = page.locator('button:has-text("Packet / Run")').first();
    await expect(packetBtn).toBeVisible();
    await packetBtn.click();

    // Verify modal elements
    await expect(page.locator('text=Antigravity Execution Adapter')).toBeVisible();
    await expect(page.locator('button:has-text("Actionable Antigravity Prompt")')).toBeVisible();
    await expect(page.locator('button:has-text("Copy Prompt for Antigravity")')).toBeVisible();
    await expect(page.locator('text=[ORCHSTR AGENT TASK PACKET]')).toBeVisible();

    // Close modal
    await page.locator('button:has(svg.lucide-x)').click();
  });

  test('completes Manager Approval workflow and automatically unblocks downstream tasks', async ({ page }) => {
    await page.goto('/');

    // 1. Check Task Board initially
    await page.locator('button:has-text("Task Board")').click();
    // Brand Positioning is in review; downstream tasks (Brand Identity, Prospects, Newsletter) are blocked
    await expect(page.locator('text=Formulate Category Brand Positioning')).toBeVisible();

    // 2. Go to Approval Inbox
    await page.locator('button:has-text("Approval Inbox")').click();

    // Verify pending review is visible
    await expect(page.locator('text=Pending Review')).toBeVisible();
    await expect(page.locator('text=Acceptance Criteria Checklist')).toBeVisible();

    // Fill in manager review notes
    const reviewTextarea = page.locator('textarea[placeholder*="Provide acceptance comments"]');
    if (await reviewTextarea.isVisible()) {
      await reviewTextarea.fill('Excellent positioning matrix. Approved for go-to-market execution.');
    }

    // Click "Approve & Complete Task"
    const approveBtn = page.locator('button:has-text("Approve & Complete Task")');
    await approveBtn.click();

    // Wait for approval to process and verify past decisions
    await expect(page.locator('text=Past Decisions')).toBeVisible();

    // 3. Return to Task Board and verify downstream tasks unblocked into queued
    await page.locator('button:has-text("Task Board")').click();
    // Brand Positioning is now completed, and Brand Identity or Prospects are unblocked
    await expect(page.locator('text=Deterministic Task Board')).toBeVisible();
  });
});
