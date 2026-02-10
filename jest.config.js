export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  testPathIgnorePatterns: ["\\.todo\\.test\\.js$"],
  clearMocks: true,
};
