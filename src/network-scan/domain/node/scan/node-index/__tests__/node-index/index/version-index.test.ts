import { VersionIndex } from '../../../index/version-index';

const versionStr1 =
	'stellar-core 10.9.0 (236f831521b6724c0ae63906416faa997ef27e19)';
const versionStr2 =
	'stellar-core 10.3.0 (de204d718a4603fba2c36d79a7cccad415dd1597)';
const versionStr4 = 'v10.3.0';
const versionStr5 = 'v11.0.0rc1';
const versionStr6 = 'v9.3.0-44-g80ce920';
const versionStr7 = '796f08a5-dirty'; //invalid version
const versionStr8 =
	'stellar-core 17.0.0.rc1 (a6c4bf72984711e3da4ade849dfaec5ce1f8d489)';
const versionStr9 =
	'stellar-core 17.0.0-rc1 (a6c4bf72984711e3da4ade849dfaec5ce1f8d489)';
const versionStr10 = '10.9.0-rc1';
const versionStr11 =
	'stellar-core 11.1.0-unstablerc1 (753eea1828f15855ea32bfa1033d90366d6abc3f)';

test('get', () => {
	expect(VersionIndex.get(versionStr1, '10.9.0')).toEqual(1);
	expect(VersionIndex.get(versionStr2, '10.9.0')).toEqual(0.6);
	expect(VersionIndex.get(versionStr4, '10.9.0')).toEqual(0.6);
	expect(VersionIndex.get(versionStr5, '10.9.0')).toEqual(1); //todo what about release candidates?
	expect(VersionIndex.get(versionStr6, '10.9.0')).toEqual(0.6); //todo what about release candidates?
	expect(VersionIndex.get(versionStr7, '10.9.0')).toEqual(0);
	expect(VersionIndex.get(versionStr8, '10.9.0')).toEqual(0);
	expect(VersionIndex.get(versionStr9, '10.9.0')).toEqual(1);
	expect(VersionIndex.get(versionStr10, '10.9.0')).toEqual(0.6);
	expect(VersionIndex.get(versionStr11, '10.9.0')).toEqual(1);
});
