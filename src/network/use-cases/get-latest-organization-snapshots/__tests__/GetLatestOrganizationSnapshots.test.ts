import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import OrganizationSnapShotter from '../../../infrastructure/database/snapshotting/OrganizationSnapShotter';
import { GetLatestOrganizationSnapshots } from '../GetLatestOrganizationSnapshots';

it('should capture and return errors', async function () {
	const snapShotter = mock<OrganizationSnapShotter>();
	snapShotter.findLatestSnapShots.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetLatestOrganizationSnapshots(
		snapShotter,
		exceptionLogger
	);
	const result = await useCase.execute({
		at: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
