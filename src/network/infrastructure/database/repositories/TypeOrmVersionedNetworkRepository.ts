import { VersionedNetworkRepository } from '../../../domain/VersionedNetworkRepository';
import { VersionedNetwork } from '../../../domain/VersionedNetwork';
import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';

@injectable()
@EntityRepository(VersionedNetwork)
export class TypeOrmVersionedNetworkRepository
	extends Repository<VersionedNetwork>
	implements VersionedNetworkRepository {}
