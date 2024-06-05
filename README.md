# Chorpiler/AlgorandVM
- Based on the [Chorpiler Core](https://github.com/fstiehle/chorpiler) package.
- A compiler to transform BPMN 2.0 choreographies to application contracts in TEAL, based on petri-net reductions.
- Current targets supported: TEAL

## Overview

| Element            | Supported  |
|--------------------|------------|
| Choreography tasks | ✔          |
| Events             | Start, End |
| Gateways           | XOR, AND   |
| Looping behaviour  | ✔          |

## Usage

Install and use through [npm](https://www.npmjs.com/package/chorpiler).

```
npm install chorpiler
```

See below example.

```js
import chorpiler, { ProcessEncoding } from 'chorpiler';
import algchor from '@chorpiler/algorandvm';

const parser = new chorpiler.Parser();

// to generate a smart contract implementing the process
const contractGenerator = new algchor
  .generators.teal.DefaultContractGenerator();
```

Complete example usage to parse and generate. 
```js
import * as fs from 'fs';
import chorpiler, { ProcessEncoding } from 'chorpiler';
import algchor from '@chorpiler/algorandvm';
import path from 'path';

const parser = new chorpiler.Parser();

const contractGenerator = new algchor
  .generators.teal.DefaultContractGenerator();

const bpmnXML = fs.readFileSync(path.join(__dirname, "./../bpmn/incident-management.bpmn"));   
// parse BPMN file into petri net
parser.fromXML(bpmnXML).then((e) => {

// compile to smart contract
contractGenerator.compile(e)
.then((gen) => {
  fs.writeFileSync(
    "Process.teal", 
    gen.target, 
    { flag: 'w+' }
  );
  console.log("Process.teal generated.");
  // log encoding of participants and tasks, 
  // can also be written to a .json file
  console.log(ProcessEncoding.toJSON(gen.encoding));
})})
.catch(err => console.error(err));
```

For usage see also the tests defined in `tests/output`.

## Replicate Results and Tests

Executing tests requires a local Algorand test environment. Chorpiler/AlgorandVM package is pre-configured for the [algorand sandbox environment](https://github.com/algorand/sandbox). The configuration can be adjusted in `tests/config.ts`. To fund additional accounts during testing, the mnemonic of a faucet account of the environment must be specified in `.evn.test.ts`.

To test that the environment is setup correctly, one can run `npm run test/sdk`. 
Then, execute `npm run test` to execute performance and conformance benchmarks. Results are formated and output to console and all tests must pass.

## Theory

### Petri net generation

Our approach is based on the optimised translation technique presented in Garćıa-Bañuelos et al. [1]: a process model is converted into a Petri net, and
this net is reduced according to well-established equivalence rules. In the smart contract, the process state is then encoded as a bit array. Our approach is based on interaction Petri nets, which are a special kind of labelled Petri nets. Interaction Petri nets have been proposed as the formal basis for BPMN choreographies [2]. As labels, they store the initiator and respondent information, which are essential for the channel construction. After conversion, we apply the same reduction rules as in [1]. 

In contrast to [1], we must restrict enforcement to certain roles: only initiators are allowed to enforce tasks.3 Thus, in our approach, we can differentiate between manual and autonomous transitions. Manual transitions correspond to tasks that are initiated by a participant; these must be explicitly executed. Autonomous transitions are the remaining silent transitions. Converting a process model into a Petri net creates silent transitions. While most of them can be deleted through reduction, some can not be removed without creating infinite-loops [1]. These transitions must then be performed by the blockchain autonomously, given that the correct conditions are met. Consequently, these transitions are not bound to a role. The differentiation allows a more efficient execution: if the conditions for a manual task are met, it is fired and terminated; further autonomous transitions may be fired, without requiring further manual transitions.

![Petri net generation](https://github.com/fstiehle/chorpiler/blob/main/docs/figs/transformation.svg)

[1]: Garćıa-Bañuelos, L., Ponomarev, A., Dumas, M., Weber, I.: Optimized Execution
of Business Processes on Blockchain. In: BPM. Springer, Cham (2017) 130–146

[2]: Decker, G., Weske, M.: Local enforceability in interaction Petri nets. In: BPM.
Volume 4714 of LNCS., Springer, Cham (2007) 305–319