const initConfig: Partial<ConfigOption> = {
    delay: {
        max: 100,
        time: 3000,
        timeout: 10000
    },
    sendType: 'xhr',
    fullBurry: true
};

export default class Xstat {
    config: Partial<ConfigOption> = {}
    data: StatData[] = []
    constructor() {

    }
    // 初始化配置
    public init(config?: ConfigOption) {
        this.config = config || initConfig;
        console.log('init', this.config);
        if (this.config.fullBurry) {
            this.burry(true);
        }
    }

    // 发送数据
    public send(obj?: StatData) {
        if (obj) {
            console.log('send single', [obj]);
            return;
        }
        console.log('send batch', this.data);
    }

    // 插入数据
    public push(obj, sendFlag: SendFlag) {
        if (sendFlag === 'cache') {
            this.data.push(obj);
            console.log('push');
            return;
        }
        this.send();
    }

    // 埋点
    public burry(full?: boolean) {
        if (full) {
            window.addEventListener('click', (e: Event) => {
                console.log('click', e);
            })
        }
    }
}