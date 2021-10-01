import Kernel from '../Kernel';
import { Connection } from 'typeorm';
import OrganizationSnapShotRepository from '../repositories/OrganizationSnapShotRepository';
import NodeSnapShotRepository from '../repositories/NodeSnapShotRepository';
import { OrganizationIdStorageRepository } from '../entities/OrganizationIdStorage';

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	const kernel = new Kernel();
	await kernel.initializeContainer();
	const organizationSnapShotRepository = kernel.container.get(
		OrganizationSnapShotRepository
	);
	const nodeSnapShotRepository = kernel.container.get(NodeSnapShotRepository);
	const organizationIdStorageRepository: OrganizationIdStorageRepository =
		kernel.container.get('OrganizationIdStorageRepository');
	const organizationSnapShots =
		await organizationSnapShotRepository.findActive();
	if (organizationSnapShots.length === 0) return;
	for (const organizationSnapShot of organizationSnapShots) {
		console.log('Organization: ' + organizationSnapShot.name);
		const nodeSnapShots =
			await nodeSnapShotRepository.findActiveByPublicKeyStorageId(
				organizationSnapShot.validators.map((validator) => validator.id)
			);
		if (nodeSnapShots.length === 0) break;
		const domain = nodeSnapShots[0].nodeDetails!.homeDomain;
		console.log('New domain property: ' + domain);
		if (!domain) break;

		console.log('Saving');
		organizationSnapShot.organizationIdStorage.homeDomain = domain;
		await organizationIdStorageRepository.save(
			organizationSnapShot.organizationIdStorage
		);
	}

	await kernel.container.get(Connection).close();
}
