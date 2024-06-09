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
    type: 'error' | 'action' | 'view';
    time: number;
    value: any;
}

declare type SendFlag = 'cache' | 'immediate';