import {Entity, TableInheritance, Column, PrimaryGeneratedColumn, Index} from "typeorm";

//round robin storage of node measurement counts
@Entity()
@TableInheritance({column: {type: "varchar", name: "type"}})
@Index(["publicKey", "property"])
@Index(["publicKey"])
export default abstract class NodeMeasurementAggregation {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column("varchar", {length: 20})
    property: String;

    @Column("varchar", {length: 56})
    publicKey: String;

    @Column("simple-array")
    counters: number[];

    @Column("timestamptz")
    lastDate: Date;

    @Column("smallint")
    position: number = 0;

    @Column("simple-array")
    numberOfCrawls: number[];

    constructor(
        publicKey: string,
        property: string,
        position: number = 0,
        lastDate: Date = new Date(),
        counters: number[] = [],
        numberOfCrawls: number[] = []
    ) {
        this.publicKey = publicKey;
        this.property = property;
        this.lastDate = lastDate;
        this.counters = counters;
        this.numberOfCrawls = numberOfCrawls;
    }

    protected initialize(){
        this.initializeArray(this.counters);
        this.initializeArray(this.numberOfCrawls);
    }
    protected initializeArray(array: number[]) {
        for (let i = 0; i < this.getNumberOfBuckets(); i++) {
            array.push(0);
        }
    }
    abstract getNumberOfBuckets(): number;

    abstract dateInCurrentBucket(date: Date): boolean;

    abstract toReadableObject(): any;//todo add to domain classes
    abstract incrementDateToNextBucket(date: Date): void;

    addMeasurement(measurementIsPositive: boolean, date: Date, nrOfCrawls: number) {
        if(this.counters.length === 0) {
            this.initialize();
        }
        if (date < this.lastDate) {
            throw new Error('Measurement date cannot be before last measurement date');
        }
        this.advanceBucketIfNecessary(date);
        this.lastDate = date;
        this.numberOfCrawls[this.position] = nrOfCrawls;

        if (measurementIsPositive)
            this.counters[this.position]++;
    }

    fillBucket(count: number, nrOfCrawls: number, date:Date){
        if(this.counters.length === 0) {
            this.initialize();
        }
        if (date < this.lastDate) {
            throw new Error('New bucket date cannot be before last measurement date');
        }
        this.advanceBucketIfNecessary(date);
        this.lastDate = date;
        this.numberOfCrawls[this.position] = nrOfCrawls;
        this.counters[this.position] = count;
    }

    advanceBucketIfNecessary(date: Date){
        let numberOfResets = 0; //only need to reset every bucket once.
        while (!this.dateInCurrentBucket(date) && numberOfResets < this.getNumberOfBuckets()) { //reset the previous counters. While loop because it could contain larger gaps then just 1 bucket
            this.position = (this.position + 1) % (this.getNumberOfBuckets());
            this.counters[this.position] = 0;
            this.numberOfCrawls[this.position] = 0;
            this.incrementDateToNextBucket(this.lastDate);
            numberOfResets++;
        }
    }
}