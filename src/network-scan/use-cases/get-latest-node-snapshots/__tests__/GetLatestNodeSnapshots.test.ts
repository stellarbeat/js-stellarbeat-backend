import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import NodeSnapShotter from '../../../domain/snapshotting/NodeSnapShotter';
import { GetLatestNodeSnapshots } from '../GetLatestNodeSnapshots';

it('should capture and return errors', async function () {
	const snapShotter = mock<NodeSnapShotter>();
	snapShotter.findLatestSnapShots.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetLatestNodeSnapshots(snapShotter, exceptionLogger);
	const result = await useCase.execute({
		at: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
