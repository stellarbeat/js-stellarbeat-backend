import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import NodeSnapShotter from '../../../infrastructure/database/snapshotting/NodeSnapShotter';
import { GetNodeSnapshots } from '../GetNodeSnapshots';

it('should capture and return errors', async function () {
	const snapShotter = mock<NodeSnapShotter>();
	snapShotter.findLatestSnapShots.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetNodeSnapshots(snapShotter, exceptionLogger);
	const result = await useCase.execute({
		at: new Date(),
		publicKey: 'a'
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should fetch latest node snapshots', async () => {
	const snapShotter = mock<NodeSnapShotter>();
	snapShotter.findLatestSnapShots.mockResolvedValue([]);

	const useCase = new GetNodeSnapshots(snapShotter, mock<ExceptionLogger>());
	const result = await useCase.execute({
		at: new Date(),
		publicKey: 'a'
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
