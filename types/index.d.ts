declare interface delayOptions {
    max: number;
    time: number;
    timeout: number;
}

declare interface ConfigOption {
    server?: string;
    delay?: boolean | delayOptions;
    sendType?: 'xhr' | 'beacon';
    fullBurry?: boolean;
}

declare interface StatData {
    type: 'error' | 'staticError' | 'jsError' | 'promiseError' | 'action' | 'view';
    time: number;
    value: any;
    url?: string;
}

declare type SendFlag = 'cache' | 'immediate';