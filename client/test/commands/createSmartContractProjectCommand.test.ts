/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as tmp from 'tmp';
import * as sinonChai from 'sinon-chai';

chai.use(sinonChai);
import * as fs_extra from 'fs-extra';
import * as child_process from 'child_process';
import { CommandUtil } from '../../src/util/CommandUtil';
import { TestUtil } from '../TestUtil';

// Defines a Mocha test suite to group tests of similar kind together
// tslint:disable no-unused-expression
describe('CreateSmartContractProjectCommand', () => {
    // suite variables
    let mySandBox: sinon.SinonSandbox;
    let sendCommandStub: sinon.SinonStub;
    let errorSpy: sinon.SinonSpy;
    let quickPickStub: sinon.SinonStub;
    let openDialogStub: sinon.SinonStub;
    let executeCommandStub: sinon.SinonStub;
    let uri: vscode.Uri;
    let uriArr: Array<vscode.Uri>;

    before(async () => {
        await TestUtil.setupTests();
    });

    beforeEach(async () => {
        mySandBox = sinon.createSandbox();
        sendCommandStub = mySandBox.stub(CommandUtil, 'sendCommand');
        errorSpy = mySandBox.spy(vscode.window, 'showErrorMessage');
        quickPickStub = mySandBox.stub(vscode.window, 'showQuickPick');
        openDialogStub = mySandBox.stub(vscode.window, 'showOpenDialog');
        const originalExecuteCommand = vscode.commands.executeCommand;
        executeCommandStub = mySandBox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.callsFake(async function fakeExecuteCommand(command: string) {
            // Don't open the folder as this causes lots of windows to pop up, and random
            // test failures.
            if (command !== 'vscode.openFolder') {
                return originalExecuteCommand.apply(this, arguments);
            }
        });
        // Create a tmp directory for Smart Contract packages, and create a Uri of it
        uri = vscode.Uri.file(tmp.dirSync().name);
        uriArr = [uri];
    });
    afterEach(() => {
        mySandBox.restore();
    });

    // Define assertion
    it('should start a typescript smart contract project', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        quickPickStub.resolves('TypeScript');
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'package.json');
        const chaincodeExists = await fs_extra.pathExists(pathToCheck);
        chaincodeExists.should.be.true;
        executeCommandStub.should.have.been.calledTwice;
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uriArr[0], true);
        errorSpy.should.not.have.been.called;
    }).timeout(20000);

    it('should show error if npm is not installed', async () => {
        // npm not installed
        sendCommandStub.onCall(0).rejects();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('npm is required before creating a smart contract project');
    });

    it('should show error is yo is not installed and not wanted', async () => {
        // yo not installed and not wanted
        sendCommandStub.onCall(0).rejects({message: 'npm ERR'});
        quickPickStub.resolves('no');
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('npm modules: yo and generator-fabric are required before creating a smart contract project');
    });

    it('should show error message if generator-fabric fails to install', async () => {
        // generator-fabric not installed and wanted but fails to install
        sendCommandStub.onCall(0).resolves();
        sendCommandStub.onCall(1).rejects();
        quickPickStub.resolves('yes');
        sendCommandStub.onCall(2).rejects();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('Issue installing generator-fabric module');
    });

    it('should show error message if yo fails to install', async () => {
        // yo not installed and wanted but fails to install
        sendCommandStub.onCall(0).rejects({message: 'npm ERR'});
        quickPickStub.resolves('yes');
        sendCommandStub.onCall(1).rejects();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        errorSpy.should.have.been.calledWith('Issue installing yo node module');
    });

    it('should show error message if we fail to create a smart contract', async () => {
        // generator-fabric and yo not installed and wanted
        sendCommandStub.onCall(0).rejects({message: 'npm ERR'});
        quickPickStub.onCall(0).resolves('yes');
        // npm install works
        sendCommandStub.onCall(1).resolves();
        sendCommandStub.onCall(2).resolves();

        const originalSpawn = child_process.spawn;
        const spawnStub: sinon.SinonStub = mySandBox.stub(child_process, 'spawn');
        spawnStub.withArgs('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']).callsFake(() => {
            return originalSpawn('/bin/sh', ['-c', 'echo blah && echo "  Go" && echo "  JavaScript" && echo "  TypeScript  [45R"']);
        });
        quickPickStub.onCall(1).returns('Go');

        openDialogStub.resolves(uriArr);
        sendCommandStub.onCall(3).rejects();
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        spawnStub.should.have.been.calledWith('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']);
        errorSpy.should.have.been.calledWith('Issue creating smart contract project');
    });

    it('should should not do anything if the user cancels the open dialog', async () => {
        // We actually want to execute the command!
        sendCommandStub.restore();

        const originalSpawn = child_process.spawn;
        const spawnStub: sinon.SinonStub = mySandBox.stub(child_process, 'spawn');
        spawnStub.withArgs('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']).callsFake(() => {
            return originalSpawn('/bin/sh', ['-c', 'echo blah && echo "  Go" && echo "  JavaScript" && echo "  TypeScript  [45R"']);
        });
        quickPickStub.onCall(0).returns('JavaScript');

        openDialogStub.resolves(undefined);
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        openDialogStub.should.have.been.calledOnce;
        spawnStub.should.have.been.calledWith('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']);
        executeCommandStub.should.have.been.calledOnce;
        executeCommandStub.should.have.not.been.calledWith('vscode.openFolder');
        errorSpy.should.not.have.been.called;
    });

    it('should create a go chaincode project when the user selects go as the language', async () => {
        sendCommandStub.restore();

        const originalSpawn = child_process.spawn;
        const spawnStub: sinon.SinonStub = mySandBox.stub(child_process, 'spawn');
        spawnStub.withArgs('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']).callsFake(() => {
            return originalSpawn('/bin/sh', ['-c', 'echo blah && echo "  Go" && echo "  JavaScript" && echo "  TypeScript  [45R"']);
        });
        quickPickStub.onCall(0).returns('Go');
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        const pathToCheck = path.join(uri.fsPath, 'main.go');
        const chaincodeExists = await fs_extra.pathExists(pathToCheck);
        chaincodeExists.should.be.true;
        spawnStub.should.have.been.calledWith('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']);
        executeCommandStub.should.have.been.calledTwice;
        executeCommandStub.should.have.been.calledWith('vscode.openFolder', uriArr[0], true);
        errorSpy.should.not.have.been.called;
    }).timeout(20000);

    it('should show an error if determining available chaincode languages fails', async () => {
        sendCommandStub.restore();

        const originalSpawn = child_process.spawn;
        const spawnStub: sinon.SinonStub = mySandBox.stub(child_process, 'spawn');
        spawnStub.withArgs('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']).callsFake(() => {
            return originalSpawn('/bin/sh', ['-c', 'echo stderr >&2 && false']);
        });
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        spawnStub.should.have.been.calledWith('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']);
        executeCommandStub.should.have.been.calledOnce;
        errorSpy.should.have.been.calledWith('Issue determining available chaincode language options');
    }).timeout(20000);

    it('should show an error if determining available chaincode languages returns nothing', async () => {
        sendCommandStub.restore();

        const originalSpawn = child_process.spawn;
        const spawnStub: sinon.SinonStub = mySandBox.stub(child_process, 'spawn');
        spawnStub.withArgs('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']).callsFake(() => {
            return originalSpawn('/bin/sh', ['-c', 'echo stderr >&2 && true']);
        });
        openDialogStub.resolves(uriArr);

        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        spawnStub.should.have.been.calledWith('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']);
        executeCommandStub.should.have.been.calledOnce;
        errorSpy.should.have.been.calledWith('Issue determining available chaincode language options');
    }).timeout(20000);

    it('should not do anything if the user cancels chosing a chaincode language', async () => {
        sendCommandStub.restore();
        const originalSpawn = child_process.spawn;
        const spawnStub: sinon.SinonStub = mySandBox.stub(child_process, 'spawn');
        spawnStub.withArgs('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']).callsFake(() => {
            return originalSpawn('/bin/sh', ['-c', 'echo blah && echo "  Go" && echo "  JavaScript" && echo "  TypeScript  [45R"']);
        });
        quickPickStub.resolves(undefined);
        await vscode.commands.executeCommand('blockchain.createSmartContractProjectEntry');
        spawnStub.should.have.been.calledWith('/bin/sh', ['-c', 'yo fabric:chaincode < /dev/null']);
        quickPickStub.should.have.been.calledOnce;
        errorSpy.should.not.have.been.called;
        openDialogStub.should.not.have.been.called;
    });

}); // end of createFabricCommand tests
