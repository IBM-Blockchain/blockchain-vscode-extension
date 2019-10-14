import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';

import TransactionViewPage from './components/TransactionViewPage/TransactionViewPage';

class App extends React.Component<any> {
    state: any;
    constructor(props: any) {
        super(props);
        this.state = {
            redirectPath: undefined
        };
    }

    componentDidMount() {
        window.addEventListener('message', event => {
            console.log('event is', event);
            const componentName: string = event.data;
            console.log('Received message in App.tsx>', componentName);

            this.redirectComponent(componentName);
        });
    }

    render() {
        console.log('Rendering app, this.state.redirectPath is', this.state.redirectPath);
        if (this.state.redirectPath === undefined) {
            // Maybe we should display a loading spinner instead?
            return <div></div>;
        } else {
            return (
                <Router>
                    <div>
                    <Route render={() => <Redirect push to={this.state.redirectPath}/>}></Route>
                    <Route path='/transaction' render={() => <TransactionViewPage activeSmartContract="penguinContract@0.0.1"/>}></Route>
                    </div>
                </Router>
            );

        }
    }

    public redirectComponent(path: string) {
        this.setState({redirectPath: path});
    }
}

export default App;
