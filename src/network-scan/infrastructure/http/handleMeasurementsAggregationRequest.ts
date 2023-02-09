import { validationResult } from 'express-validator';
import { AggregationTarget } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregationsDTO';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import * as express from 'express';
import { GetMeasurementAggregations } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregations';

export async function handleMeasurementsAggregationRequest(
	id: string,
	req: express.Request,
	res: express.Response,
	aggregationTarget: AggregationTarget,
	getMeasurementAggregations: GetMeasurementAggregations
) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
	const result = await getMeasurementAggregations.execute({
		aggregationTarget: aggregationTarget,
		from: getDateFromParam(req.query.from),
		to: getDateFromParam(req.query.to),
		id: id
	});

	if (result.isErr()) {
		return res.status(500).send('Internal Server Error');
	}

	return res.send(result.value);
}
