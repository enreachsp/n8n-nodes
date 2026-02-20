module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '..',
	roots: ['<rootDir>/tests'],
	testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	collectCoverageFrom: [
		'<rootDir>/nodes/**/*.ts',
		'<rootDir>/credentials/**/*.ts',
		'!<rootDir>/nodes/**/*.node.ts',
		'!**/*.d.ts',
		'!**/node_modules/**',
		'!**/dist/**',
		'!**/tests/**',
	],
	coverageDirectory: '<rootDir>/coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	coverageThreshold: {
		global: {
			branches: 60,
			functions: 60,
			lines: 60,
			statements: 60,
		},
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
	},
	verbose: true,
};
