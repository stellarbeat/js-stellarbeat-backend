import { HistoryArchiveScanRepository } from '../../domain/history-archive-scan/HistoryArchiveScanRepository';
import { EntityRepository, Repository } from 'typeorm';
import { HistoryArchiveScan } from '../../domain/history-archive-scan/HistoryArchiveScan';

@EntityRepository(HistoryArchiveScan)
export class TypeOrmHistoryArchiveScanResultRepository
	extends Repository<HistoryArchiveScan>
	implements HistoryArchiveScanRepository
{
	async findLatestByUrl(url: string): Promise<HistoryArchiveScan | null> {
		const result = await this.createQueryBuilder('scan')
			.where('scan.url=:url', { url: url })
			.orderBy('scan.startDate', 'DESC')
			.getOne();
		if (!result) return null;

		return result;
	}
}
