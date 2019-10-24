import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import './index.scss';

// window.addEventListener('message', event => {

    // const componentName: string = event.data;
    // console.log('componentName is', componentName);
ReactDOM.render(
    <App/>,
    document.getElementById('root') as HTMLElement
);

// });

