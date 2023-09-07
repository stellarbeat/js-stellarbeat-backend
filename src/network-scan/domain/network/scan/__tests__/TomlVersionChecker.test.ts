import { TomlVersionChecker } from '../TomlVersionChecker';

describe('TomlVersionChecker', function () {
	describe('isSupportedVersion', function () {
		it('should return false if VERSION is not a string', function () {
			const tomlObject = { VERSION: 1 };
			expect(TomlVersionChecker.isSupportedVersion(tomlObject, '2.0.0')).toBe(
				false
			);
		});

		it('should return false if VERSION is not a valid semver', function () {
			const tomlObject = { VERSION: '1' };
			expect(TomlVersionChecker.isSupportedVersion(tomlObject, '2.0.0')).toBe(
				false
			);
		});

		it('should return false if VERSION is lower than lowestSupportedVersion', function () {
			const tomlObject = { VERSION: '1.0.0' };
			expect(TomlVersionChecker.isSupportedVersion(tomlObject, '2.0.0')).toBe(
				false
			);
		});

		it('should return true if VERSION is higher than lowestSupportedVersion', function () {
			const tomlObject = { VERSION: '3.0.0' };
			expect(TomlVersionChecker.isSupportedVersion(tomlObject, '2.0.0')).toBe(
				true
			);
		});

		it('should return true if VERSION is equal to lowestSupportedVersion', function () {
			const tomlObject = { VERSION: '2.0.0' };
			expect(TomlVersionChecker.isSupportedVersion(tomlObject, '2.0.0')).toBe(
				true
			);
		});

		it('should return false if lowestSupportedVersion is not a valid semver', function () {
			const tomlObject = { VERSION: '3.0.0' };
			expect(TomlVersionChecker.isSupportedVersion(tomlObject, '1')).toBe(
				false
			);
		});
	});
});
