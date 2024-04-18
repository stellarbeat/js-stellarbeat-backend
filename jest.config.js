module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: 'src',
	testPathIgnorePatterns: ['/node_modules/', '/lib/'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json'
			}
		]
	}
};
