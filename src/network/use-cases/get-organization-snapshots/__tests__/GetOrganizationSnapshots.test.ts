import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import NodeSnapShotter from '../../../infrastructure/database/snapshotting/NodeSnapShotter';
import { GetOrganizationSnapshots } from '../GetOrganizationSnapshots';
import { ExceptionLoggerMock } from '../../../../core/services/__mocks__/ExceptionLoggerMock';
import OrganizationSnapShotter from '../../../infrastructure/database/snapshotting/OrganizationSnapShotter';

it('should capture and return errors', async function () {
	const snapShotter = mock<OrganizationSnapShotter>();
	snapShotter.findLatestSnapShotsByOrganization.mockRejectedValue(
		new Error('test')
	);
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetOrganizationSnapshots(snapShotter, exceptionLogger);
	const result = await useCase.execute({
		at: new Date(),
		organizationId: 'a'
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should fetch latest snapshots', async () => {
	const snapShotter = mock<OrganizationSnapShotter>();
	snapShotter.findLatestSnapShotsByOrganization.mockResolvedValue([]);

	const useCase = new GetOrganizationSnapshots(
		snapShotter,
		new ExceptionLoggerMock()
	);
	const result = await useCase.execute({
		at: new Date(),
		organizationId: 'a'
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
