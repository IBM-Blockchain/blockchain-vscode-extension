import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import TransactionHome from './components/TransactionHome/TransactionHome';
import TransactionCreate from './components/TransactionCreate/TransactionCreate';
import ISmartContract from './interfaces/ISmartContract';
import Utils from './Utils';

interface AppState {
    redirectPath: string;
    messageData: {
        gatewayName: string;
        activeSmartContract: ISmartContract,
        smartContracts: Array<ISmartContract>
    };
}

class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            messageData: {
                gatewayName: '',
                activeSmartContract: {
                    name: '',
                    version: '',
                    channel: '',
                    label: '',
                    transactions: [],
                    namespace: ''
                },
                smartContracts : []
            }
        };

        this.switchSmartContract = this.switchSmartContract.bind(this);
        this.postMessageHandler = this.postMessageHandler.bind(this);
    }

    componentDidMount(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            this.setState({
                redirectPath: event.data.path,
                messageData: event.data.state ? event.data.state : this.state.messageData
            });
        });
    }

    switchSmartContract(newActiveContractLabel: string): void {
        const smartContracts: Array<ISmartContract> = this.state.messageData.smartContracts;
        this.setState({
            messageData: {
                gatewayName: this.state.messageData.gatewayName,
                activeSmartContract: smartContracts.find((obj: ISmartContract) => obj.label === newActiveContractLabel) as ISmartContract,
                smartContracts: smartContracts
            }
        });
    }

    postMessageHandler(command: string, data?: any): void {
        if (data === undefined) {
            data = this.state.messageData;
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
                        <Route exact path='/transaction' render={(): JSX.Element => <TransactionHome messageData={this.state.messageData} switchSmartContract={this.switchSmartContract} postMessageHandler={this.postMessageHandler}/>}></Route>
                        <Route exact path='/transaction/create' render={(): JSX.Element => <TransactionCreate activeSmartContract={this.state.messageData.activeSmartContract} postMessageHandler={this.postMessageHandler}/>}></Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
