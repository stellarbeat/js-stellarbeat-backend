import { inject, injectable } from 'inversify';
import { Logger } from '../../../core/services/PinoLogger';
import { ScanNetworkLoopedDTO } from './ScanNetworkLoopedDTO';
import { ScanNetwork } from '../scan-network/ScanNetwork';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { asyncSleep } from '../../../core/utilities/asyncSleep';
import { LoopTimer } from '../../../core/services/LoopTimer';

@injectable()
export class ScanNetworkLooped {
	private aborted = false;

	constructor(
		private scanNetworkUseCase: ScanNetwork,
		private loopTimer: LoopTimer,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async execute(dto: ScanNetworkLoopedDTO, tick?: () => void): Promise<void> {
		let firstRun = true;

		while (!this.aborted) {
			await this.scanNetwork(firstRun, dto); //todo: add fatal error to quit loop
			if (tick) tick();
			firstRun = false;
		}
	}

	private async scanNetwork(
		firstRun: boolean,
		dto: ScanNetworkLoopedDTO
	): Promise<void> {
		this.loopTimer.start(dto.timeBetweenRuns);
		await this.scanNetworkUseCase.execute({
			//updateNetwork: firstRun,
			loop: false,
			dryRun: dto.dryRun
		});
		this.loopTimer.stop();

		this.logger.info(
			'Scan network took ' + this.loopTimer.getElapsedTime() + 'ms'
		);

		if (this.loopTimer.loopExceededMaxTime()) {
			this.exceptionLogger.captureException(
				new Error('Network update exceeding expected run time')
			);
		}

		if (this.loopTimer.getRemainingTime() > 0) {
			await asyncSleep(this.loopTimer.getRemainingTime());
		}
	}

	public shutDown(callback: () => void) {
		this.aborted = true;
		this.scanNetworkUseCase.shutDown(callback);
	}
}
