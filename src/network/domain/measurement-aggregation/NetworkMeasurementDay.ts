import { Entity } from 'typeorm';
import { NetworkMeasurementAggregation } from './NetworkMeasurementAggregation';

@Entity()
export default class NetworkMeasurementDay extends NetworkMeasurementAggregation {}
