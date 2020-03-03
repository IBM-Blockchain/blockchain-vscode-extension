import React from 'react';

interface IProps {
    altText: string;
    darkImg: any;
    lightImg: any;
    id: string;
    className?: string;
}

function ThemedImage(props: IProps): JSX.Element {
    const style: string = (props.className) ? props.className : '';
    return (
        <div id={`${props.id}-themed-image`}>
            <img src={props.lightImg} alt={props.altText} className={style}/>
            <img src={props.darkImg} alt={props.altText} className={style}/>
        </div>
    );
}

export default ThemedImage;
