import * as React from 'react';
import './App.scss';
import { HashRouter as Router, Route, Redirect } from 'react-router-dom';

import OneComponent from './components/OneComponent';
import TwoComponent from './components/TwoComponent';

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
            return ( <div>No component asked to be loaded</div> );
        } else {
            return (
                <Router>
                    <div>
                    <Route render={() => <Redirect push to={this.state.redirectPath}/>}></Route>
                    <Route path='/one' component={OneComponent}></Route>
                    <Route path='/two' component={TwoComponent}></Route>
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
