import { expect, use } from "chai";
import * as fs from 'fs';
import chaiAsPromised from 'chai-as-promised';
import util from 'util';
import path from "path";
import chorpiler, { INetParser, ProcessEncoding, TemplateEngine } from "chorpiler";
import { TealContractGenerator } from '../../src/Generator/target/Teal/TealContractGenerator';
import { TealBytesInstanceGenerator } from '../../src/Generator/target/Teal/InstanceExecutionBytes';
import { TealBoxInstanceGenerator } from '../../src/Generator/target/Teal/InstanceExecutionBox';
import { BPMN_PATH, OUTPUT_PATH } from "../config";

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
use(chaiAsPromised);

const parseCompile = async (bpmnPath: string, parser: INetParser, gen: TemplateEngine) => {
  const data = await readFile(bpmnPath);
  return parser.fromXML(data).then((iNet) => {
    return gen.compile(iNet);
  });
}

const testCase = async (bpmnPath: string, parser: INetParser, generator: TemplateEngine, outputPath: string, caseLabel: string) => {
  const output = await parseCompile(bpmnPath, parser, generator);

  await writeFile(
    path.join(outputPath.replace(".teal", "_encoding.json")), 
    JSON.stringify(ProcessEncoding.toJSON(output.encoding)), 
    { flag: 'w+' }
  );

  return writeFile(
    path.join(outputPath), 
    // need to append a label to the contract name as otherwise waffle will error when compiling
    // multiple contracts with the same name
    output.target.replace("contract ", "contract " + caseLabel), 
    { flag: 'w+' }
  );
}

// Test Parsing and Generation works with all supported elements 
describe('Test Parsing and Generation', () => {

  let parser: INetParser;
  let tealGenerator: TemplateEngine;
  let bytesInstanceGenerator: TemplateEngine;
  let boxInstanceGenerator: TemplateEngine;

  beforeEach(() => {
    parser = new chorpiler.Parser();
    tealGenerator = new TealContractGenerator();
    bytesInstanceGenerator = new TealBytesInstanceGenerator();
    boxInstanceGenerator = new TealBoxInstanceGenerator();
  });

  describe('Parse and compile supply chain case', () => {

    before(() => {
      if (!fs.existsSync(path.join(OUTPUT_PATH, "supply-chain"))) {
        fs.mkdirSync(path.join(OUTPUT_PATH, "supply-chain"));
      }
    })

    it('should compile to Teal Contract', async () => {

      return testCase(
        path.join(BPMN_PATH, '/cases/supply-chain/supply-chain.bpmn'), 
        parser, 
        tealGenerator, 
        path.join(OUTPUT_PATH, "/supply-chain/SC_ProcessExecution.teal"),
        "SC_"
      );
      
    });

    it('should compile to byte multi-Instance Contract', async () => {

      return testCase(
        path.join(BPMN_PATH, '/cases/supply-chain/supply-chain.bpmn'), 
        parser, 
        bytesInstanceGenerator, 
        path.join(OUTPUT_PATH, "/supply-chain/SC_ByteInstanceExecution.teal"),
        "SC_"
      );
      
    });

    it('should compile to box multi-Instance Contract', async () => {

      return testCase(
        path.join(BPMN_PATH, '/cases/supply-chain/supply-chain.bpmn'), 
        parser, 
        boxInstanceGenerator, 
        path.join(OUTPUT_PATH, "/supply-chain/SC_BoxInstanceExecution.teal"),
        "SC_"
      );
      
    });

  });

  describe('Parse and compile incident management case', () => {

    before(() => {
      if (!fs.existsSync(path.join(OUTPUT_PATH, "incident-management"))) {
        fs.mkdirSync(path.join(OUTPUT_PATH, "incident-management"));
      }
    })

    it('should compile to Teal Contract', async () => {

      return testCase(
        path.join(BPMN_PATH, '/cases/incident-management/incident-management.bpmn'), 
        parser, 
        tealGenerator, 
        path.join(OUTPUT_PATH, "/incident-management/IM_ProcessExecution.teal"),
        "IM_"
      );
    
    });

    it('should compile to byte multi-Instance Contract', async () => {

      return testCase(
        path.join(BPMN_PATH, '/cases/incident-management/incident-management.bpmn'), 
        parser, 
        bytesInstanceGenerator, 
        path.join(OUTPUT_PATH, "/incident-management/IM_ByteInstanceExecution.teal"),
        "IM_"
      );
      
    });

    it('should compile to box multi-Instance Contract', async () => {

      return testCase(
        path.join(BPMN_PATH, '/cases/incident-management/incident-management.bpmn'), 
        parser, 
        boxInstanceGenerator, 
        path.join(OUTPUT_PATH, "/incident-management/IM_BoxInstanceExecution.teal"),
        "IM_"
      );
      
    });

  });
});