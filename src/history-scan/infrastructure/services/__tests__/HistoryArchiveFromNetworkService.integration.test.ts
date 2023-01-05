import { mock } from 'jest-mock-extended';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { HistoryArchiveFromNetworkService } from '../HistoryArchiveFromNetworkService';
import { err, ok } from 'neverthrow';
import { NetworkService } from '../../../../network/services/NetworkService';

it('should fetch archive urls', async function () {
	const nodeA = new Node('A');
	nodeA.historyUrl = 'https://history.stellar.org/prd/core-live/core_live_001';
	const nodeB = new Node('B');
	nodeB.historyUrl = 'https://history.stellar.org/prd/core-live/core_live_002';
	const nodeC = new Node('C');
	const network = new Network([nodeA, nodeB, nodeC]);
	const networkService = mock<NetworkService>();
	networkService.getNetwork.mockResolvedValue(ok(network));
	const historyArchiveFromNetworkService = new HistoryArchiveFromNetworkService(
		networkService
	);
	const historyArchiveUrls =
		await historyArchiveFromNetworkService.getHistoryArchiveUrls();
	expect(historyArchiveUrls.isOk()).toBe(true);
	if (!historyArchiveUrls.isOk()) throw historyArchiveUrls.error;
	expect(historyArchiveUrls.value.length).toEqual(2);
	expect(historyArchiveUrls.value[0].value).toEqual(nodeA.historyUrl);
	expect(historyArchiveUrls.value[1].value).toEqual(nodeB.historyUrl);
});

it('should return error when we cannot fetch latest network', async function () {
	const networkService = mock<NetworkService>();
	networkService.getNetwork.mockResolvedValue(err(new Error('test')));
	const historyArchiveFromNetworkService = new HistoryArchiveFromNetworkService(
		networkService
	);
	const historyArchiveUrls =
		await historyArchiveFromNetworkService.getHistoryArchiveUrls();
	expect(historyArchiveUrls.isErr()).toBe(true);
});
