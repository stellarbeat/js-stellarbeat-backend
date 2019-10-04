import {ChildEntity} from "typeorm";
import NodeMeasurementAggregation from "./NodeMeasurementAggregation";

@ChildEntity()
export default class NodeMeasurement30DaysAggregation extends NodeMeasurementAggregation{

    dateInCurrentBucket(date: Date): boolean {
        return this.lastDate.getDay() === date.getDay() &&
            this.lastDate.getMonth() === date.getMonth() &&
            this.lastDate.getFullYear() === date.getFullYear()
    }

    getNumberOfBuckets() {
        return 30;
    }

    incrementDateToNextBucket(date: Date) {
        date.setHours(date.getHours() + 24);
    }

    toReadableObject() {
        let readable:any = {};
        let dayDate = new Date(this.lastDate.getTime());
        dayDate.setHours(0,0,0,0);
        //rollback to earliest date (which is stored at index position+1)
        dayDate.setHours(dayDate.getHours() - (30 * 24));

        for(let i = this.position + 1; i<= this.position + this.getNumberOfBuckets() ; i++) {
            readable[dayDate.toUTCString()] =
                this.counters[i%this.getNumberOfBuckets()]
                /
                this.numberOfCrawls[i%this.getNumberOfBuckets()];

            dayDate.setHours(dayDate.getHours() + 1);
        }

        return readable;
    }
}