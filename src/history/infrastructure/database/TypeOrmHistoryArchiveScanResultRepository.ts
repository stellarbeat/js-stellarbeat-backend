import { HistoryArchiveScanSummaryRepository } from '../../domain/HistoryArchiveScanSummaryRepository';
import { EntityRepository, Repository } from 'typeorm';
import { HistoryArchiveScanSummary } from '../../domain/HistoryArchiveScanSummary';

@EntityRepository(HistoryArchiveScanSummary)
export class TypeOrmHistoryArchiveScanResultRepository
	extends Repository<HistoryArchiveScanSummary>
	implements HistoryArchiveScanSummaryRepository
{
	async findLatestByUrl(
		url: string
	): Promise<HistoryArchiveScanSummary | null> {
		const result = await this.createQueryBuilder('scan')
			.where('scan.url=:url', { url: url })
			.orderBy('scan.startDate', 'DESC')
			.getOne();
		if (!result) return null;

		return result;
	}
}
