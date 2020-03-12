import IVSCode from './interfaces/IVSCode';
declare const vscode: IVSCode;

const Utils: any = {

    changeRoute(newPath: string): void {
        dispatchEvent(new MessageEvent('message', {
            data: {
                path: newPath
            }
        }));
    },

    postToVSCode(message: {command: string, data?: any}): void {
        vscode.postMessage(message);
    }

};

export default Utils;
