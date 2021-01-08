process.env.HFC_LOGGING = '{"off": "console"}';
import { FileSystemWallet, Gateway, Network, Contract } from 'fabric-network';
import * as path from 'path';
import 'source-map-support/register';

interface Car {
    make:string;
    model:string;
    color:string;
    owner:string;
}

interface History {
    previousOwnerCount: number;
    previousOwners: string[];
    previousOwnershipChangeDates: string[];
    currentOwnershipChangeDate: string;
    currentOwner: string;
}

let carid:string;
let ownerSequenceNum = 0;
const DELETED_CAR_OWNER_IDENTIFIER = 'CAR KEY DELETED';

async function main () {
  try {
    // The ID of the car to look up (can be overridden by the first command line argument)
    carid = (process.argv[2] !== undefined) ? process.argv[2] : 'CARXXX'; // TODO change

    // Create a new file system based wallet for managing identities.
    const walletPath:string = path.join(process.cwd(), 'drivenet_wallet');
    const wallet:FileSystemWallet = new FileSystemWallet(walletPath);

    // Create a new gateway for connecting to our peer node.
    const gateway:Gateway = new Gateway();
    const connectionProfile:string = path.resolve(__dirname, '..', 'CommunityMembers_profile.json');
    const connectionOptions = { wallet, identity: 'student', discovery: { enabled: true, asLocalhost: false } };
    await gateway.connect(connectionProfile, connectionOptions);

    // Get to the drivenet network and smart contract
    const network:Network = await gateway.getNetwork('drivenet');
    const contract:Contract = network.getContract('fabcar');

    // First check that the car exists
    let existsBuffer:Buffer = await contract.evaluateTransaction('carExists', carid);
    if ((existsBuffer.toString()) === "false") {
      console.error(`Car "${carid}" doesn't exist`);
      return;
    }
    
    // Get current car details and owner history
    let carDetailsBuffer:Buffer = await contract.evaluateTransaction('queryCar', carid);
    const car: Car = JSON.parse(carDetailsBuffer.toString()) as Car;
    const previousOwnersBuffer = await contract.evaluateTransaction('getPreviousOwners', carid);
    const history: History = JSON.parse(previousOwnersBuffer.toString()) as History;
    console.log(`Owner history of ${carid} (currently ${car.color} ${car.make} ${car.model}):`);

    // Display the previous owners; start with the earliest owner.
    if (history.previousOwnerCount > 0) {
      for (let i=history.previousOwners.length-1; i>=0; i--) {
        const txTime = new Date(history.previousOwnershipChangeDates[i]).toUTCString();
        if (history.previousOwners[i] === DELETED_CAR_OWNER_IDENTIFIER) {
          console.log(`${txTime}: The car record was deleted`);
        } else {
          console.log(`${txTime}: ${history.previousOwners[i]} became owner #${(++ownerSequenceNum)}`);
        }
      }
    }

    // Display the current owner
    const txTime = new Date(history.currentOwnershipChangeDate).toUTCString();
    console.log(`${txTime}: ${history.currentOwner} became current owner #${(++ownerSequenceNum)}`);
    
    // Disconnect from the gateway
    gateway.disconnect();

  } catch (error) {
    console.error('Failed to call transaction:', error.message);
    process.exit(0);
  }
}

void main();