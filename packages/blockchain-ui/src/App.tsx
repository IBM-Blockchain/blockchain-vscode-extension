import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import TransactionPage from './components/TransactionPage/TransactionPage';
import ISmartContract from './interfaces/ISmartContract';
import Utils from './Utils';

interface AppState {
    redirectPath: string;
    gatewayName: string;
    smartContract: ISmartContract;
    transactionOutput: string;
}

class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            gatewayName: '',
            smartContract: {
                name: '',
                version: '',
                channel: '',
                label: '',
                transactions: [],
                namespace: ''
            },
            transactionOutput: ''
        };
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
                    smartContract: event.data.state ? event.data.state.smartContract : this.state.smartContract
                });
            }
        });
    }

    postMessageHandler(command: string, data?: any): void {
        if (data === undefined) {
            data = {
                gatewayName: this.state.gatewayName,
                smartContract: this.state.smartContract,
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
                            <TransactionPage gatewayName={this.state.gatewayName} smartContract={this.state.smartContract} transactionOutput={this.state.transactionOutput}
                                postMessageHandler={this.postMessageHandler}/>}>
                        </Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
