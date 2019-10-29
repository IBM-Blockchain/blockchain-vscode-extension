import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';
import TransactionViewPage from './components/TransactionViewPage/TransactionViewPage';

interface AppState {
    redirectPath: string;
    childState: any;
}

class App extends React.Component<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            redirectPath: '',
            childState: {}
        };
    }

    componentDidMount(): void {
        window.addEventListener('message', (event: MessageEvent) => {
            this.setState({
                redirectPath: event.data.path,
                childState: event.data.state
            });
        });
    }

    public render(): any {
        if (this.state.redirectPath === '') {
            // Maybe we should display a loading spinner instead?
            return <div></div>;
        } else {
            return (
                <Router>
                    <div>
                    <Route render={(): any => <Redirect push to={this.state.redirectPath}/>}></Route>
                    <Route path='/transaction' render={(): any => <TransactionViewPage messageData={this.state.childState}/>}></Route>
                    </div>
                </Router>
            );
        }
    }
}

export default App;
