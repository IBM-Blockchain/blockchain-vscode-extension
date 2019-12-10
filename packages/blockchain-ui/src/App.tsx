import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import TransactionHome from './components/TransactionHome/TransactionHome';
import TransactionCreate from './components/TransactionCreate/TransactionCreate';
import ISmartContract from './interfaces/ISmartContract';
import Utils from './Utils';

interface AppState {
    redirectPath: string;
    gatewayName: string;
    activeSmartContract: ISmartContract;
    smartContracts: Array<ISmartContract>;
    transactionOutput: string;
}

class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            gatewayName: '',
            activeSmartContract: {
                name: '',
                version: '',
                channel: '',
                label: '',
                transactions: [],
                namespace: ''
            },
            smartContracts : [],
            transactionOutput: ''
        };
        this.switchSmartContract = this.switchSmartContract.bind(this);
        this.postMessageHandler = this.postMessageHandler.bind(this);
    }

    componentDidMount(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            if (event.data.output) {
                this.setState({
                    transactionOutput: event.data.output
                });
            } else {
                this.setState({
                    redirectPath: event.data.path,
                    gatewayName: event.data.state ? event.data.state.gatewayName : this.state.gatewayName,
                    activeSmartContract: event.data.state ? event.data.state.activeSmartContract : this.state.activeSmartContract,
                    smartContracts: event.data.state ? event.data.state.smartContracts : this.state.smartContracts,
                });
            }
        });
    }

    switchSmartContract(newActiveContractLabel: string): void {
        const smartContracts: Array<ISmartContract> = this.state.smartContracts;
        this.setState({
            activeSmartContract: smartContracts.find((obj: ISmartContract) => obj.label === newActiveContractLabel) as ISmartContract,
            smartContracts: smartContracts
        });
    }

    postMessageHandler(command: string, data?: any): void {
        if (data === undefined) {
            data = {
                gatewayName: this.state.gatewayName,
                activeSmartContract: this.state.activeSmartContract,
                smartContracts: this.state.smartContracts
            };
        }

        Utils.postToVSCode({
            command: command,
            data: data
        });
    }

    render(): JSX.Element {
        if (this.state.redirectPath === '') {
            return <div></div>;
        } else {
            return (
                <Router>
                    <div>
                        <Route render={(): JSX.Element => <Redirect push to={this.state.redirectPath}/>}></Route>
                        <Route exact path='/transaction' render={(): JSX.Element =>
                            <TransactionHome gatewayName={this.state.gatewayName} activeSmartContract={this.state.activeSmartContract} smartContracts={this.state.smartContracts}
                                switchSmartContract={this.switchSmartContract} postMessageHandler={this.postMessageHandler}/>}>
                        </Route>
                        <Route exact path='/transaction/create' render={(): JSX.Element =>
                            <TransactionCreate activeSmartContract={this.state.activeSmartContract} transactionOutput={this.state.transactionOutput}
                                postMessageHandler={this.postMessageHandler}/>}>
                        </Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
