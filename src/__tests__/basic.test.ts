describe('Test Setup Verification', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have access to test environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
