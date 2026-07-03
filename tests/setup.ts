// Test setup file

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CREEDSPACE_API_URL = 'http://localhost:8000';
process.env.DO_NOT_TRACK = '1'; // Disable analytics in tests

// Global test timeout
jest.setTimeout(10000);