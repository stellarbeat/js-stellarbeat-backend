import { ScanRepository } from '../../domain/history-archive-scan/ScanRepository';
import { EntityRepository, Repository } from 'typeorm';
import { Scan } from '../../domain/history-archive-scan/Scan';
import { injectable } from 'inversify';

@injectable()
@EntityRepository(Scan)
export class TypeOrmHistoryArchiveScanResultRepository
	extends Repository<Scan>
	implements ScanRepository
{
	async findLatestByUrl(url: string): Promise<Scan | null> {
		const result = await this.createQueryBuilder('scan')
			.where('scan.url=:url', { url: url })
			//.andWhere('scan."hasError"=false')
			.orderBy('scan.startDate', 'DESC')
			.getOne();
		if (!result) return null;

		return result;
	}

	async findLatest(): Promise<Scan[]> {
		return await this.createQueryBuilder('ha')
			.innerJoin(
				(qb) =>
					qb
						.select('max(id) id')
						.from('history_archive_scan', 'haj')
						//.where('"hasError"=false')
						.groupBy('url'),
				'haj',
				'ha.id = haj.id'
			)
			.getMany();
	}
}
