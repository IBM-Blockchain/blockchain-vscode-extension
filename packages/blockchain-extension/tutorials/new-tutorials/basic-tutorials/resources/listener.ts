import { FileSystemWallet, Gateway } from 'fabric-network';
import * as path from 'path';

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'Org1Wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        const connectionProfile = path.resolve(__dirname, '..', 'connection.json');
        let connectionOptions = { wallet, identity: 'org1Admin', discovery: { enabled: true, asLocalhost: true }};
        await gateway.connect(connectionProfile, connectionOptions);

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('demo-contract');

        // Listen for myEvent publications
        const listener = await contract.addContractListener('listener-app', 'myEvent', (error: Error, event: any) => {
            if (error) {
                console.log(`Error from event: ${error.toString()}`);
                return;
            }
            const eventString: string = `chaincode_id: ${event.chaincode_id}, tx_id: ${event.tx_id}, event_name: "${event.event_name}", payload: ${event.payload.toString()}`;
            console.log(`Event caught: ${eventString}`);
        });

        console.log(`Listening for myEvent events...`);
        while (true) {
            await sleep(5000);
            // ... do other things
        }

    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();