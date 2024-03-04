import {assert} from 'chai';
import algosdk from "algosdk";

const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const server = 'http://127.0.0.1';
const port = 4001;
const client = new algosdk.Algodv2(token, server, port);

describe('Test Sandbox', () => {  

  it("Is Sandbox up",  async () => { 
    
    await client.status().do().catch((e) => {
      console.log(e);
      assert(false, "Could not ask client status");
    });
  });

});