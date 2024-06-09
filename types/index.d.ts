// declare interface window {
//     Xstat?: any; // 或者是更具体的类型
// }

export declare interface delayOptions {
    max: number;
    time: number;
    timeout: number;
}

export declare interface ConfigOption {
    server?: string;
    delay?: boolean | delayOptions;
    sendType?: 'xhr' | 'beacon';
}

export declare interface StatData {
    type: 'error' | 'action' | 'view';
    time: number;
    value: any;
}

export declare type SendFlag = 'cache' | 'immediate';
