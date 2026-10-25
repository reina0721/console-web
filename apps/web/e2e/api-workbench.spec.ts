import { expect, test } from '@playwright/test';

test.describe('API Workbench - 接口调试与工作台', () => {
  test('进入 /api-workbench 并成功执行 mock 路由请求', async ({ page }) => {
    await page.goto('/api-workbench');
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');

    // 检查页面标题
    await expect(page.getByRole('heading', { name: '接口调试与测试工作台' })).toBeVisible();

    // 检查项目树中默认接口（获取用户列表）
    const requestItem = page.getByRole('button', { name: /获取用户列表/ });
    await expect(requestItem).toBeVisible();
    await requestItem.click();

    // 点击发送请求
    const sendButton = page.getByRole('button', { name: '发送' });
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // 验证状态码 200 OK 显示
    await expect(page.getByText('200 OK')).toBeVisible();

    // 验证断言测试项通过（由后置脚本断言生成）
    await expect(page.getByText('状态 200')).toBeVisible();
    await expect(page.getByText('返回有效用户列表')).toBeVisible();

    // 验证历史记录生成
    await page.getByRole('tab', { name: '历史' }).click();
    await expect(page.getByText('mock://users').first()).toBeVisible();
  });

  test('支持在集合批量运行器中执行接口批跑', async ({ page }) => {
    await page.goto('/api-workbench');
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');

    // 切换到批量运行器 Tab
    await page.getByRole('tab', { name: 'Runner' }).click();

    // 点击运行
    const runButton = page.getByRole('button', { name: /运行集合测试/ });
    await expect(runButton).toBeVisible();
    await runButton.click();

    // 验证批量运行完成并在结果列表中展示
    await expect(page.getByText('测试汇总')).toBeVisible();
    await expect(page.getByText('PASS').first()).toBeVisible();
  });
});
