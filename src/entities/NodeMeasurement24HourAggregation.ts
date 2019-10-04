import {ChildEntity} from "typeorm";
import NodeMeasurementAggregation from "./NodeMeasurementAggregation";

@ChildEntity()
export default class NodeMeasurement24HourAggregation extends NodeMeasurementAggregation{

    dateInCurrentBucket(date: Date): boolean {
        return this.lastDate.getDay() === date.getDay() &&
            this.lastDate.getMonth() === date.getMonth() &&
            this.lastDate.getHours() === date.getHours() &&
            this.lastDate.getFullYear() === date.getFullYear()
    }

    getNumberOfBuckets() {
        return 24;
    }

    incrementDateToNextBucket(date: Date) {
        date.setHours(date.getHours() + 1);
    }

    toReadableObject() {
        let readable:any = {};
        let hourDate = new Date(this.lastDate.getTime());
        hourDate.setMinutes(0,0,0);
        //rollback to earliest date (which is stored at index position+1)
        hourDate.setHours(hourDate.getHours() - 23);

        for(let i = this.position + 1; i<= this.position + this.getNumberOfBuckets() ; i++) {
            readable[hourDate.toUTCString()] =
                this.counters[i%this.getNumberOfBuckets()]
                /
                this.numberOfCrawls[i%this.getNumberOfBuckets()];

            hourDate.setHours(hourDate.getHours() + 1);
        }

        return readable;
    }
}