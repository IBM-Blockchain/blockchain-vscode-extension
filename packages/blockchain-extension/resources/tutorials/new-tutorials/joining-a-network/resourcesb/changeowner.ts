process.env.HFC_LOGGING = '{"off": "console"}';
import { FileSystemWallet, Gateway, Transaction, Contract, Network } from 'fabric-network';
import * as path from 'path';
import 'source-map-support/register';

let finished:boolean;
let carid:string;

async function main () {
  try {
    // The ID of the car to look up (can be overridden by the first command line argument)
    carid = (process.argv[2] !== undefined) ? process.argv[2] : 'CARXXX'; // TODO change

    // Connect to the network and access the smart contract
    const walletPath:string = path.join(process.cwd(), 'drivenet_wallet');
    const wallet:FileSystemWallet = new FileSystemWallet(walletPath);
    const gateway:Gateway = new Gateway();
    const connectionProfile:string = path.resolve(__dirname, '..', 'CommunityMembers_profile.json');
    const connectionOptions = { wallet, identity: 'student', discovery: { enabled: true, asLocalhost: false } };
    await gateway.connect(connectionProfile, connectionOptions);
    const network:Network = await gateway.getNetwork('drivenet');
    const contract:Contract = network.getContract('fabcar');

    // First check that the car exists
    let existsBuffer:Buffer = await contract.evaluateTransaction('carExists', carid);
    if ((existsBuffer.toString()) === "false") {
      console.error(`Car "${carid}" doesn't exist`);
      return;
    }

    // Create a transaction instance and register a listener for it
    const transaction:Transaction = contract.createTransaction('changeCarOwner');
    await transaction.addCommitListener((err, transactionId, status, blockNumber) => {
      finished = true;
      if (err) {
        console.error(err);
        return;
      }
      console.log('Transaction ID:',transactionId);
      console.log('Status:', status);
      console.log('Block number:', blockNumber);
    });

    // Submit the transaction - set the owner to a random string (random_nnn);
    const rnd:number = Math.round(1000 * Math.random());
    await transaction.submit(carid, `random_${rnd}`);

    while (!finished) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // ... do other things
      finished = true; // usually set to true by the handler above
    }

    // Disconnect from the gateway.
    gateway.disconnect();
  } catch (error) {
    console.error('Failed to call transaction:', error);
    process.exit(0);
  }
}
void main();