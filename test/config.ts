import path from "path";

export const BPMN_PATH = path.join(__dirname, 'data', 'bpmn');
export const TEAL_PATH = path.join(__dirname, 'data', 'teal');
export const OUTPUT_PATH = path.join(__dirname, 'data', 'generated');

export const algod = {
  token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  server: 'http://127.0.0.1',
  port: 4001
};