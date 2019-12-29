import { Container } from "inversify";
import {CrawlResultProcessor, ICrawlResultProcessor} from "./src/services/CrawlResultProcessor";

let container = new Container();
container.bind<ICrawlResultProcessor>(CrawlResultProcessor).toSelf();

export default container;
