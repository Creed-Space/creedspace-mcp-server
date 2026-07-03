// Simple test to verify Jest setup
describe('Basic Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify package configuration', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('@creedspace/mcp-server');
    expect(packageJson.version).toBeDefined();
  });
});