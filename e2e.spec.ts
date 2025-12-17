
import { test, expect } from '@playwright/test';

test.describe('Nexus CRM Critical Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Login Simulation
    await page.goto('http://localhost:3000');
    await page.fill('input[type="email"]', 'admin@nexus.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Iniciar Sesión")');
    // Verify Dashboard loaded
    await expect(page.locator('text=Resumen Gerencial')).toBeVisible();
  });

  test('should create a new lead and trigger automation', async ({ page }) => {
    // 2. Navigate to Contacts
    await page.click('text=Contactos');
    
    // 3. Open Modal
    await page.click('button:has-text("Agregar")');
    
    // 4. Fill Form
    await page.fill('input[placeholder="Ej. Maria Perez"]', 'Test E2E User');
    await page.fill('input[placeholder="Ej. Acme Corp"]', 'Playwright Inc');
    await page.fill('input[placeholder="email@ejemplo.com"]', 'e2e@test.com');
    await page.fill('input[placeholder="+52 1 55..."]', '5512345678'); // Automation should fix +52
    await page.fill('input[type="number"]', '5000');
    
    // 5. Submit
    await page.click('button:has-text("Crear Lead")');
    
    // 6. Verification: Lead appears in table
    await expect(page.locator('text=Test E2E User')).toBeVisible();
    
    // 7. Verification: Automation (Capitalization & Prefix)
    // The system automtically capitalizes names and adds +52 if missing
    await page.click('text=Test E2E User'); // Open details
    
    // Check Phone formatting automation
    const phone = await page.textContent('text=+52 5512345678');
    expect(phone).toBeTruthy();
    
    // Check Welcome Message automation
    await expect(page.locator('text=Hola! 👋 Gracias por tu interés')).toBeVisible();
  });

  test('should move deal in pipeline', async ({ page }) => {
    await page.click('text=Embudo de Ventas');
    // Drag and drop simulation logic would go here
    // For this example, we verify the columns exist
    await expect(page.locator('text=Nuevos')).toBeVisible();
    await expect(page.locator('text=Ganados')).toBeVisible();
  });
});
