import { HistoryArchiveScanRepository } from '../../domain/history-archive-scan/HistoryArchiveScanRepository';
import { EntityRepository, Repository } from 'typeorm';
import { HistoryArchiveScan } from '../../domain/history-archive-scan/HistoryArchiveScan';
import { HistoryArchive } from '../../domain/history-archive/HistoryArchive';
import { injectable } from 'inversify';

@injectable()
@EntityRepository(HistoryArchiveScan)
export class TypeOrmHistoryArchiveScanResultRepository
	extends Repository<HistoryArchiveScan>
	implements HistoryArchiveScanRepository
{
	async findLatestByUrl(url: string): Promise<HistoryArchiveScan | null> {
		const result = await this.createQueryBuilder('scan')
			.where('scan.url=:url', { url: url })
			.andWhere('scan."hasError"=false')
			.orderBy('scan.startDate', 'DESC')
			.getOne();
		if (!result) return null;

		return result;
	}

	async findLatest(): Promise<HistoryArchiveScan[]> {
		return await this.createQueryBuilder('ha')
			.innerJoin(
				(qb) =>
					qb
						.select('max(id) id')
						.from('history_archive_scan', 'haj')
						.where('"hasError"=false')
						.groupBy('url'),
				'haj',
				'ha.id = haj.id'
			)
			.getMany();
	}
}
