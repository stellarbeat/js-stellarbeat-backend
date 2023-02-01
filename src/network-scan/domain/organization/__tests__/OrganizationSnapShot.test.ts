import OrganizationSnapShot from '../OrganizationSnapShot';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import { OrganizationValidators } from '../OrganizationValidators';
import { OrganizationContactInformation } from '../OrganizationContactInformation';
import { Snapshot } from '../../../../core/domain/Snapshot';
import { mock } from 'jest-mock-extended';
import Organization from '../Organization';

describe('OrganizationSnapShot', () => {
	test('copy', () => {
		const snapshot = new OrganizationSnapShot(
			new Date('2020-01-01'),
			new OrganizationValidators([createDummyPublicKey()]),
			OrganizationContactInformation.create({
				twitter: 'twitter',
				github: 'github',
				keybase: 'keybase',
				physicalAddress: 'physicalAddress',
				dba: 'dba',
				officialEmail: 'officialEmail',
				phoneNumber: 'phoneNumber'
			})
		);
		snapshot.name = 'name';
		snapshot.description = 'description';
		snapshot.horizonUrl = 'horizonUrl';
		snapshot.url = 'url';

		snapshot.organization = mock<Organization>();

		const time = new Date('2020-01-02');
		const copy = snapshot.copy(time);
		expect(copy.url).toBe(snapshot.url);
		expect(copy.name).toEqual('name');
		expect(copy.description).toBe(snapshot.description);
		expect(copy.horizonUrl).toBe(snapshot.horizonUrl);
		expect(copy.validators.equals(snapshot.validators)).toBe(true);
		expect(copy.contactInformation.equals(snapshot.contactInformation)).toBe(
			true
		);
		expect(copy.startDate).toBe(time);
		expect(copy.endDate).toBe(Snapshot.MAX_DATE);
	});
});
