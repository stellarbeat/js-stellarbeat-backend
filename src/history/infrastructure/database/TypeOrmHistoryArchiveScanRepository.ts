import { HistoryArchiveScanRepository } from '../../domain/HistoryArchiveScanRepository';
import { EntityRepository, Repository } from 'typeorm';
import { HistoryArchiveScan } from '../../domain/HistoryArchiveScan';

@EntityRepository(HistoryArchiveScan)
export class TypeOrmHistoryArchiveScanRepository
	extends Repository<HistoryArchiveScan>
	implements HistoryArchiveScanRepository
{
	async findLatestByUrl(url: string): Promise<HistoryArchiveScan | null> {
		const result = await this.createQueryBuilder('scan')
			.where('scan.url=:url', { url: url })
			.orderBy('scan.scanDate', 'DESC')
			.getOne();
		if (!result) return null;

		return result;
	}
}
