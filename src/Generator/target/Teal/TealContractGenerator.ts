import { InteractionNet, ProcessEncoding, ProcessGenerator, TemplateEngine } from "chorpiler";
import util from 'util';
import fs from 'fs';
import Mustache from "mustache";
import path from "path";
const readFile = util.promisify(fs.readFile);

export class TealContractGenerator implements TemplateEngine {
 
  async compile(_iNet: InteractionNet, _template?: string): Promise<{target: string, encoding: ProcessEncoding}> {
    const iNet: InteractionNet = {..._iNet}
    if (iNet.initial == null || iNet.end == null) {
      throw new Error("Invalid InteractionNet"); 
    }
    const template: string = _template ? _template : await this.getTemplate();

    const gen = ProcessGenerator.generate(iNet);

    return { target: Mustache.render(template, gen.options), 
      encoding: gen.encoding };
  }

  async getTemplate(): Promise<string> {
    return (await readFile(path.join(__dirname, '..', '..', 'templates/ProcessExecution.teal'))).toString();
  }

}