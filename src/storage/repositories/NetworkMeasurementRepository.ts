import { EntityRepository, Repository } from 'typeorm';
import { injectable } from 'inversify';
import NetworkMeasurement from '../entities/NetworkMeasurement';

@injectable()
@EntityRepository(NetworkMeasurement)
export class NetworkMeasurementRepository extends Repository<NetworkMeasurement> {}
