import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import NodeSnapShotter from '../../../infrastructure/database/snapshotting/NodeSnapShotter';
import { GetNodeSnapshots } from '../GetNodeSnapshots';
import { ExceptionLoggerMock } from '../../../../core/services/__mocks__/ExceptionLoggerMock';
import { createDummyPublicKeyString } from '../../../domain/__fixtures__/createDummyPublicKey';

it('should capture and return errors', async function () {
	const snapShotter = mock<NodeSnapShotter>();
	snapShotter.findLatestSnapShotsByNode.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetNodeSnapshots(snapShotter, exceptionLogger);
	const result = await useCase.execute({
		at: new Date(),
		publicKey: createDummyPublicKeyString()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should fetch latest node snapshots', async () => {
	const snapShotter = mock<NodeSnapShotter>();
	snapShotter.findLatestSnapShotsByNode.mockResolvedValue([]);

	const useCase = new GetNodeSnapshots(snapShotter, new ExceptionLoggerMock());
	const result = await useCase.execute({
		at: new Date(),
		publicKey: createDummyPublicKeyString()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
