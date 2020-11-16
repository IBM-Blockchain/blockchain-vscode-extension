import { Gateway, Wallets, ContractListener } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  try {

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'Org1Wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    const connectionProfilePath = path.resolve(__dirname, '..', 'connection.json');
    const connectionProfile: any = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8')); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const connectionOptions = { wallet, identity: 'Org1 Admin', discovery: { enabled: true, asLocalhost: true }};
    await gateway.connect(connectionProfile, connectionOptions);

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('demo-contract');

    // Listen for myEvent publications
    const listener: ContractListener = async (event) => {    // eslint-disable-line @typescript-eslint/require-await
      if (event.eventName === 'myEvent') {
        console.log( 'chaincodeId: ', event.chaincodeId , ' eventName: ' , event.eventName , ' payload: ' , event.payload?.toString());
      }
    };

    const finished = false;
    await contract.addContractListener(listener);

    console.log('Listening for myEvent events...');
    while (!finished) {
      await sleep(5000);
      // ... do other things
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

void main();