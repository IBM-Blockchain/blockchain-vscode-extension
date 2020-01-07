import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import './index.scss';

const app: any = ReactDOM.render(
    <App/>,
    document.getElementById('root')
);

// @ts-ignore
if (window.Cypress) {
    // @ts-ignore
    window.app = app;
}
