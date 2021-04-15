import {Container} from "inversify";
import Kernel from "../../src/Kernel";
import {Connection} from "typeorm";
import {NodeMeasurementV2Repository} from "../../src/repositories/NodeMeasurementV2Repository";
import NodeMeasurementV2 from "../../src/entities/NodeMeasurementV2";
import NodePublicKeyStorage, {NodePublicKeyStorageRepository} from "../../src/entities/NodePublicKeyStorage";

describe('test queries', () => {
    let container: Container;
    let kernel = new Kernel();
    let nodeMeasurementV2Repository: NodeMeasurementV2Repository;
    let nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
    jest.setTimeout(60000); //slow integration tests

    beforeEach(async () => {
        await kernel.initializeContainer();
        container = kernel.container;
        nodeMeasurementV2Repository = container.get(NodeMeasurementV2Repository);
        nodePublicKeyStorageRepository = container.get('NodePublicKeyStorageRepository');
    })

    afterEach(async () => {
        await container.get(Connection).close();
    });

    test('findInactiveAt', async () => {
        let nodePublicKeyStorage = new NodePublicKeyStorage("a");
        let nodePublicKeyStorageActive = new NodePublicKeyStorage("b");
        let nodePublicKeyStorageOtherTime = new NodePublicKeyStorage("c");
        await nodePublicKeyStorageRepository.save([nodePublicKeyStorage]);//force id = 1
        await nodePublicKeyStorageRepository.save([nodePublicKeyStorageActive, nodePublicKeyStorageOtherTime])
        let time = new Date();
        let measurement = new NodeMeasurementV2(time, nodePublicKeyStorage);
        measurement.isActive = false;
        let measurementActive = new NodeMeasurementV2(time, nodePublicKeyStorageActive);
        measurementActive.isActive = true;
        let measurementOtherTime = new NodeMeasurementV2(new Date("12/12/2020"), nodePublicKeyStorageOtherTime);
        measurementOtherTime.isActive = false;
        await nodeMeasurementV2Repository.save([measurement, measurementActive, measurementOtherTime]);
        let measurements = await nodeMeasurementV2Repository.findInactiveAt(time);
        expect(measurements.length).toEqual(1);
        expect(measurements[0].nodePublicKeyStorageId).toEqual(1);


    });

})
