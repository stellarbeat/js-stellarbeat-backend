import * as asyncSleep from '../../../../core/utilities/asyncSleep';
import { ScanNetworkLooped } from '../ScanNetworkLooped';
import { mock } from 'jest-mock-extended';
import { ScanNetwork } from '../../scan-network/ScanNetwork';
import { LoopTimer } from '../../../../core/services/LoopTimer';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';

describe('ScanNetworkLooped', () => {
	it('should loop network scans', function (done) {
		const { scanNetwork, useCase, loopTimer } = setupSUT();

		let executeCount = 0;
		const expectedExecuteCount = 2;
		useCase.execute(
			{
				timeBetweenRuns: 10,
				dryRun: true
			},
			() => {
				executeCount++;
				if (executeCount === expectedExecuteCount)
					useCase.shutDown(() => {
						expect(scanNetwork.execute).toBeCalledTimes(expectedExecuteCount);
						expect(loopTimer.start).toBeCalledTimes(expectedExecuteCount);
						expect(loopTimer.stop).toBeCalledTimes(expectedExecuteCount);
						expect(scanNetwork.execute).toBeCalledWith({
							loop: false, //todo: check if updateNetwork is set correctly
							dryRun: true
						});
						done();
					});
			}
		);
	});

	/*it('should update network only on first run', async function () {

	});*/

	it('should capture exception when network update exceeds expected run time', function () {
		const SUT = setupSUT();
		SUT.loopTimer.loopExceededMaxTime.mockReturnValue(true);
		SUT.useCase.execute(
			{
				timeBetweenRuns: 10,
				dryRun: true
			},
			() => {
				SUT.useCase.shutDown(() => {
					expect(SUT.exceptionLogger.captureException).toBeCalledWith(
						new Error('Network update exceeding expected run time')
					);
				});
			}
		);
	});

	it('should sleep when network update is less then expected run time', async function () {
		const spy = jest.spyOn(asyncSleep, 'asyncSleep').mockReturnThis();
		const SUT = setupSUT();
		SUT.loopTimer.loopExceededMaxTime.mockReturnValue(false);
		SUT.loopTimer.getRemainingTime.mockReturnValue(100);

		SUT.useCase.execute(
			{
				timeBetweenRuns: 10,
				dryRun: true
			},
			() => {
				SUT.useCase.shutDown(() => {
					expect(spy).toBeCalledWith(100);
				});
			}
		);
	});

	function setupSUT() {
		const scanNetwork = mock<ScanNetwork>();
		scanNetwork.execute.mockResolvedValue(undefined);
		scanNetwork.shutDown.mockImplementation((callback) => callback());
		const loopTimer = mock<LoopTimer>();
		const exceptionLogger = mock<ExceptionLogger>();
		const useCase = new ScanNetworkLooped(
			scanNetwork,
			loopTimer,
			exceptionLogger,
			mock<Logger>()
		);
		return { scanNetwork, useCase, loopTimer, exceptionLogger };
	}
});
