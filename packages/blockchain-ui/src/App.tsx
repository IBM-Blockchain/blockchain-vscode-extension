import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import TransactionHome from './components/TransactionHome/TransactionHome';
import TransactionCreate from './components/TransactionCreate/TransactionCreate';
import ISmartContract from './interfaces/ISmartContract';
import Utils from './Utils';

interface AppState {
    redirectPath: string;
    childState: {
        activeSmartContract: ISmartContract,
        smartContracts: Array<ISmartContract>
    };
}

class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            childState: {
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
                childState: event.data.state ? event.data.state : this.state.childState
            });
        });
    }

    switchSmartContract(newActiveContractLabel: string): void {
        const smartContracts: Array<ISmartContract> = this.state.childState.smartContracts;
        this.setState({
            childState: {
                activeSmartContract: smartContracts.find((obj: ISmartContract) => obj.label === newActiveContractLabel) as ISmartContract,
                smartContracts: smartContracts
            }
        });
    }

    postMessageHandler(message: {command: string, data: any}): void {
        Utils.postToVSCode(message);
    }

    render(): JSX.Element {
        if (this.state.redirectPath === '') {
            return <div></div>;
        } else {
            return (
                <Router>
                    <div>
                        <Route render={(): JSX.Element => <Redirect push to={this.state.redirectPath}/>}></Route>
                        <Route exact path='/transaction' render={(): JSX.Element => <TransactionHome messageData={this.state.childState} switchSmartContract={this.switchSmartContract}/>}></Route>
                        <Route exact path='/transaction/create' render={(): JSX.Element => <TransactionCreate activeSmartContract={this.state.childState.activeSmartContract} postMessageHandler={this.postMessageHandler}/>}></Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
