import React from 'react';
import './HeadingCombo.scss';

interface IProps {
    headingText: string;
    subheadingText: string;
    image?: string;
    comboStyle?: string;
    headingStyle?: string;
    subheadingStyle?: string;
}

function HeadingCombo(props: IProps): JSX.Element {
    let style: string = 'heading-combo-container';
    style += props.comboStyle ? ` ${props.comboStyle}` : '';

    if (props.image) {
        return (
            <div className={style}>
                <div className='heading-combo-with-image'>
                    <img src={props.image} alt=''/>
                    <h3 className={props.headingStyle}>{props.headingText}</h3>
                </div>
                <p className={props.subheadingStyle}>{props.subheadingText}</p>
            </div>
        );
    } else {
        return (
            <div className={style}>
                <h3 className={props.headingStyle}>{props.headingText}</h3>
                <p className={props.subheadingStyle}>{props.subheadingText}</p>
            </div>
        );
    }
}

export default HeadingCombo;
