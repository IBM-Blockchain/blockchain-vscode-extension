import IVSCode from './interfaces/IVSCode';
declare const vscode: IVSCode;

class Utils {

    static changeRoute(newPath: string): void {
        dispatchEvent(new MessageEvent('message', {
            data: {
                path: newPath
            }
        }));
    }

    static postToVSCode(message: { command: string, data?: any }): void {

        if (!(window as any)['Cypress']) {
            vscode.postMessage(message);
        } else {
            window.postMessage(message, '*');
        }
    }

}

export default Utils;
