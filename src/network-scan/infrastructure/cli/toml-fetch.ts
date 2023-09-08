import Kernel from '../../../core/infrastructure/Kernel';
import { OrganizationTomlFetcher } from '../../domain/organization/scan/OrganizationTomlFetcher';
import { NodeTomlFetcher } from '../../domain/node/scan/NodeTomlFetcher';

main();

async function main() {
	const kernel = await Kernel.getInstance();
	const organizationTomlFetcher = kernel.container.get(OrganizationTomlFetcher);
	const nodeTomlFetcher = kernel.container.get(NodeTomlFetcher);

	const organizationResult =
		await organizationTomlFetcher.fetchOrganizationTomlInfoCollection([
			process.argv[2]
		]);

	console.log(organizationResult);

	const nodeResult = await nodeTomlFetcher.fetchNodeTomlInfoCollection([
		process.argv[2]
	]);

	console.log(nodeResult);
}
