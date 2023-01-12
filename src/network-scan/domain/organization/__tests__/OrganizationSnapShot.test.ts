import { Organization as OrganizationDTO } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotFactory from '../snapshotting/OrganizationSnapShotFactory';
import Organization from '../Organization';
import OrganizationSnapShot from '../OrganizationSnapShot';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import Node from '../../node/Node';
import { createDummyOrganizationId } from '../__fixtures__/createDummyOrganizationId';
import {
	OrganizationContactInformation,
	OrganizationContactInformationProps
} from '../OrganizationContactInformation';

describe('organization snapshot changed', () => {
	let organizationDTO: OrganizationDTO;

	let organizationSnapShot: OrganizationSnapShot;
	const organizationSnapShotFactory = new OrganizationSnapShotFactory();

	beforeEach(() => {
		const organizationId = createDummyOrganizationId();
		organizationDTO = new OrganizationDTO(organizationId.value, 'orgName');
		organizationSnapShot = organizationSnapShotFactory.create(
			new Organization(organizationId, new Date()),
			organizationDTO,
			new Date(),
			[]
		);
	});

	test('no change', () => {
		expect(
			organizationSnapShot.organizationChanged(
				organizationDTO.name,
				organizationDTO.url,
				organizationDTO.description,
				organizationDTO.horizonUrl,
				organizationDTO.validators,
				OrganizationContactInformation.create(createContactInformationProps())
			)
		).toBeFalsy();
	});

	test('url change', () => {
		organizationDTO.url = 'other';
		expect(
			organizationSnapShot.organizationChanged(
				organizationDTO.name,
				organizationDTO.url,
				organizationDTO.description,
				organizationDTO.horizonUrl,
				organizationDTO.validators,
				OrganizationContactInformation.create(createContactInformationProps())
			)
		).toBeTruthy();
	});

	test('description change', () => {
		organizationDTO.description = 'other';
		expect(
			organizationSnapShot.organizationChanged(
				organizationDTO.name,
				organizationDTO.url,
				organizationDTO.description,
				organizationDTO.horizonUrl,
				organizationDTO.validators,
				OrganizationContactInformation.create(createContactInformationProps())
			)
		).toBeTruthy();
	});
	test('contact change', () => {
		const props = createContactInformationProps();
		props.keybase = 'other';
		expect(
			organizationSnapShot.organizationChanged(
				organizationDTO.name,
				organizationDTO.url,
				organizationDTO.description,
				organizationDTO.horizonUrl,
				organizationDTO.validators,
				OrganizationContactInformation.create(props)
			)
		).toBeTruthy();
	});

	test('validator added', () => {
		organizationDTO.validators.push('A');
		expect(
			organizationSnapShot.organizationChanged(
				organizationDTO.name,
				organizationDTO.url,
				organizationDTO.description,
				organizationDTO.horizonUrl,
				organizationDTO.validators,
				OrganizationContactInformation.create(createContactInformationProps())
			)
		).toBeTruthy();
	});
	test('validator removed', () => {
		organizationSnapShot.validators = [];
		organizationSnapShot.validators.push(new Node(createDummyPublicKey()));
		expect(
			organizationSnapShot.organizationChanged(
				organizationDTO.name,
				organizationDTO.url,
				organizationDTO.description,
				organizationDTO.horizonUrl,
				organizationDTO.validators,
				OrganizationContactInformation.create(createContactInformationProps())
			)
		).toBeTruthy();
	});
	test('validator different order, no change', () => {
		const a = new Node(createDummyPublicKey());
		const b = new Node(createDummyPublicKey());
		const c = new Node(createDummyPublicKey());
		const d = new Node(createDummyPublicKey());
		const e = new Node(createDummyPublicKey());
		organizationDTO.validators.push(a.publicKey.value);
		organizationDTO.validators.push(b.publicKey.value);
		organizationDTO.validators.push(c.publicKey.value);
		organizationDTO.validators.push(d.publicKey.value);
		organizationDTO.validators.push(e.publicKey.value);
		organizationSnapShot.validators = [];
		organizationSnapShot.validators.push(c);
		organizationSnapShot.validators.push(d);
		organizationSnapShot.validators.push(b);
		organizationSnapShot.validators.push(e);
		organizationSnapShot.validators.push(a);

		expect(
			organizationSnapShot.organizationChanged(
				organizationDTO.name,
				organizationDTO.url,
				organizationDTO.description,
				organizationDTO.horizonUrl,
				organizationDTO.validators,
				OrganizationContactInformation.create(createContactInformationProps())
			)
		).toBeFalsy();
	});
});

function createContactInformationProps(): OrganizationContactInformationProps {
	return {
		officialEmail: null,
		dba: null,
		phoneNumber: null,
		twitter: null,
		github: null,
		physicalAddress: null,
		keybase: null
	};
}
