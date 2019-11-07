import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import TransactionHome from './components/TransactionHome/TransactionHome';
import TransactionCreate from './components/TransactionCreate/TransactionCreate';
import ISmartContract from './interfaces/ISmartContract';

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
    }

    componentDidMount(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            this.setState({
                redirectPath: event.data.path,
                childState: event.data.state ? event.data.state : this.state.childState
            });
        });
    }

    public switchSmartContract(newActiveContractLabel: string): void {
        this.setState({
            childState: {
                activeSmartContract: this.state.childState.smartContracts.filter((obj: ISmartContract) => obj.label === newActiveContractLabel)[0],
                smartContracts: this.state.childState.smartContracts
            }
        });
    }

    public render(): any {
        if (this.state.redirectPath === '') {
            return <div></div>;
        } else {
            return (
                <Router>
                    <div>
                        <Route render={(): any => <Redirect push to={this.state.redirectPath}/>}></Route>
                        <Route exact path='/transaction' render={(): any => <TransactionHome messageData={this.state.childState} switchSmartContract={this.switchSmartContract}/>}></Route>
                        <Route exact path='/transaction/create' render={(): any => <TransactionCreate activeSmartContract={this.state.childState.activeSmartContract}/>}></Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
