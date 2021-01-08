// Beware: for code clarity, the block structure is navigated unsafely
/* eslint @typescript-eslint/no-unsafe-member-access: 0 */
/* eslint @typescript-eslint/no-unsafe-assignment: 0 */

process.env.HFC_LOGGING = '{"off": "console"}';
import { FileSystemWallet, Gateway, Network } from 'fabric-network';
import * as path from 'path';
import 'source-map-support/register';

let finished:boolean;

async function main () {
  try {
    // Get to the drivenet network
    const walletPath:string = path.join(process.cwd(), 'drivenet_wallet');
    const wallet:FileSystemWallet = new FileSystemWallet(walletPath);
    const gateway:Gateway = new Gateway();
    const connectionProfile:string = path.resolve(__dirname, '..', 'CommunityMembers_profile.json');
    const connectionOptions = { wallet, identity: 'student', discovery: { enabled: true, asLocalhost: false } };
    await gateway.connect(connectionProfile, connectionOptions);
    const network:Network = await gateway.getNetwork('drivenet');

    // Display blocks
    finished = false;
    await network.addBlockListener('my-block-listener', (err: any, block: any) => {
      if (err) {
        console.error(err);
        finished = true;
        return;
      }
      if (block !== undefined) {
        // Read each block
        for (const i in block.data.data) {
          if (block.data.data[i].payload.data.actions !== undefined) {
            const inputArgs:Buffer[] = block.data.data[i].payload.data.actions[0].payload.chaincode_proposal_payload.input.chaincode_spec.input.args;

            // Print block details
            console.log('----------');
            console.log('Block',block.header.number,'transaction',i);

            // Show ID and timestamp of the transaction
            const txTime = new Date(block.data.data[i].payload.header.channel_header.timestamp).toUTCString();
            const txId:string = block.data.data[i].payload.header.channel_header.tx_id;
            console.log('Transaction Id:',txId);
            console.log('Timestamp:',txTime);

            // Show transaction inputs (formatted, as may contain binary data)
            let inputData = 'Inputs: ';
            for (let j=0; j<inputArgs.length; j++) {
              const inputArgPrintable:string = inputArgs[j].toString().replace(/[^\x20-\x7E]+/g, '');
              inputData = inputData.concat(inputArgPrintable, ' ');
            }
            console.log(inputData);

            // Show the proposed writes to the world state
            let keyData = 'Keys updated: ';
            for (const l in block.data.data[i].payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes) {
              keyData = keyData.concat(block.data.data[i].payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[l].key,' ');
            }
            console.log(keyData);

            // Show which organizations endorsed
            let endorsers = 'Endorsers: ';
            for (const k in block.data.data[i].payload.data.actions[0].payload.action.endorsements) {
              endorsers = endorsers.concat(block.data.data[i].payload.data.actions[0].payload.action.endorsements[k].endorser.Mspid, ' ');
            }
            console.log(endorsers);

            // Was the transaction valid or not?
            // (Invalid transactions are still logged on the blockchain but don't affect the world state)
            if ((block.metadata.metadata[2])[i] !== 0) {
              console.log('INVALID TRANSACTION');
            }
          }
        }
      }
    }, { startBlock: 1 }); // Read from block 1, and continue to catch new blocks as they appear

    while (!finished) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      // ... do other things
    }

    // Disconnect from the gateway
    gateway.disconnect();
  } catch (error) {
    console.error('Error: ', error.message);
    process.exit(0);
  }
}
void main();