import { mock } from 'jest-mock-extended';

import { Node, Organization } from '@stellarbeat/js-stellarbeat-shared';
import { createDummyPublicKeyString } from '../../../node/__fixtures__/createDummyPublicKey';
import { OrganizationScanner } from '../OrganizationScanner';
import { TomlService } from '../../../network/scan/TomlService';

it('should scan organizations', async function () {
	const tomlService = mock<TomlService>();
	const tomlObjects = [{ name: 'toml' }];
	tomlService.fetchTomlObjects.mockResolvedValue(tomlObjects);

	const organizationScanner = new OrganizationScanner(tomlService);

	const node = new Node(createDummyPublicKeyString());
	const organization = new Organization('org', 'org');
	organization.validators.push(node.publicKey);
	node.organizationId = organization.id;
	const result = await organizationScanner.scan([organization], [node]);

	expect(tomlService.updateOrganizations).toBeCalledWith(
		tomlObjects,
		[organization],
		[node]
	);
	expect(tomlService.fetchTomlObjects).toBeCalledWith([node]);

	expect(result.isOk()).toBeTruthy();
	if (!result.isOk()) throw result.error;
	expect(result.value.organizationDTOs).toEqual([organization]);
});
