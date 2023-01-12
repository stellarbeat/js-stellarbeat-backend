import { Entity } from 'typeorm';
import { NetworkMeasurementAggregation } from './NetworkMeasurementAggregation';

@Entity()
export default class NetworkMeasurementMonth extends NetworkMeasurementAggregation {}
