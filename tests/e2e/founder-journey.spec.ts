import { test, expect } from '@playwright/test';

test.describe('Complete Founder Operating Journey', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3001/api/seed');
  });

  test('end-to-end founder journey: idea -> workspace -> plan -> execute -> review -> consequential approval -> decision', async ({ page }) => {
    await page.goto('/');

    // 1. Enter startup idea & create workspace
    await page.locator('button:has-text("New Company")').click();
    await expect(page.locator('text=Create Company Workspace')).toBeVisible();

    await page.locator('input[placeholder*="Synapse Security"]').fill('NeuroScribe AI');
    await page.locator('input[placeholder*="Cybersecurity, BioTech"]').fill('Healthcare AI');
    await page.locator('input[placeholder*="To eliminate cloud identity"]').fill('Ambient clinical documentation for oncology nurses.');
    await page.locator('textarea[placeholder*="Describe what the company does"]').fill(
      'NeuroScribe AI is an ambient acoustic intelligence assistant that documents complex oncology patient rounds and synthesizes chemotherapy protocol notes directly into Epic EHR.'
    );
    await page.locator('input[placeholder*="CISOs at mid-market"]').fill('Chief Medical Officers and Nurse Supervisors');
    await page.locator('input[placeholder*="Automated CI/CD"]').fill('Reduce nursing shift documentation time by 2.5 hours per day.');
    await page.locator('input[placeholder*="Customers will pay"]').fill('Hospitals will pay $400/nurse/month to reduce clinician burnout.');

    await page.locator('button:has-text("Initialize Workspace")').click();

    // 2. Verify company workspace created
    await expect(page.locator('h1')).toContainText('NeuroScribe AI');
    await expect(page.locator('text=Healthcare AI')).toBeVisible();

    // 3. Generate Task Plan via New Task Modal
    await page.locator('button:has-text("Task Board")').click();
    await page.locator('button:has-text("New Task")').click();
    await expect(page.locator('text=Create Orchestration Task')).toBeVisible();

    await page.locator('input[placeholder*="Conduct Competitive Positioning"]').fill('Oncology Nursing Workflow Discovery');
    await page.locator('textarea[placeholder*="Detail the scope of work"]').fill('Interview 12 oncology charge nurses regarding bedside charting friction.');
    await page.locator('select:has(option[value="agent_customer_research"])').selectOption('agent_customer_research');

    await page.locator('button:has-text("Create Task")').click();

    // Verify task appears on Task Board in queued or blocked
    await expect(page.locator('text=Oncology Nursing Workflow Discovery')).toBeVisible();

    // 4. Execute an IDE-driven agent task via Packet / Run
    const taskCard = page.locator('.group:has-text("Oncology Nursing Workflow Discovery")').first();
    const packetRunBtn = taskCard.locator('button:has-text("Packet / Run")');
    await packetRunBtn.click();

    await expect(page.locator('text=Antigravity Execution Adapter')).toBeVisible();
    await expect(page.locator('text=[ORCHSTR AGENT TASK PACKET]')).toBeVisible();

    // Switch to Submit Deliverable / Execute tab
    await page.locator('button:has-text("Submit Deliverable / Execute")').click();

    // Run deterministic simulation
    const runSimBtn = page.locator('button:has-text("Run Simulation")');
    await runSimBtn.click();
    await expect(page.locator('text=Antigravity Execution Adapter')).not.toBeVisible();

    // 5. Save and review the resulting artifact
    await page.locator('button:has-text("Knowledge & Artifacts")').click();
    await expect(page.locator('text=Shared Artifacts')).toBeVisible();

    // 6. Approve or reject a consequential action in Approval Inbox
    await page.locator('button:has-text("Approval Inbox")').click();
    await expect(page.locator('text=Pending Review')).toBeVisible();

    // Fill review feedback and approve
    const feedbackArea = page.locator('textarea[placeholder*="Provide acceptance comments"]');
    await expect(feedbackArea).toBeVisible();
    await feedbackArea.fill('Approved by Founder / CEO. Verified oncology nurse pain points.');
    await page.locator('button:has-text("Approve & Complete Task")').click();

    // 7. Record strategic decision & update next plan
    await page.locator('button:has-text("Overview")').click();
    await page.locator('button:has-text("Propose")').click();
    await expect(page.locator('text=Record Strategic Decision')).toBeVisible();

    await page.locator('input[placeholder*="Standardize on Human-in-the-Loop"]').fill('Integrate Directly with Epic FHIR API');
    await page.locator('textarea[placeholder*="What problem or opportunity prompted"]').fill('EHR interoperability is a mandatory procurement prerequisite.');
    await page.locator('textarea[placeholder*="Why was this option chosen"]').fill('FHIR compliance cuts sales cycle from 9 months to 45 days.');

    await page.locator('button:has-text("Record Decision")').click();
    await expect(page.locator('text=Integrate Directly with Epic FHIR API')).toBeVisible();
  });
});
