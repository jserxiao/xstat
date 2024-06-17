import {BURRY_TAGS} from '../enum';

const initConfig: Partial<ConfigOption> = {
    delay: {
        max: 100,
        time: 3000,
        timeout: 10000
    },
    sendType: 'xhr',
    fullBurry: true
};

export default class Core {
    [key: string]: any;
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

        this.staticErrListen();
        this.promiseErrListen();
    }

    // 发送数据
    public send(obj?: StatData) {
        if (obj) {
            console.log('send single', [obj]);
            return;
        }
        this.data = [];
        console.log('send batch', this.data);
    }

    // 插入数据
    public push(obj: StatData) {
        if (this.config.delay) {
            console.log('push', obj);
            this.data.push(obj);
            localStorage.setItem('statData', JSON.stringify(this.data));
            return;
        }
        // this.send();
    }

    // 埋点
    public burry(full?: boolean) {
        if (full) {
            window.addEventListener('click', (e: PointerEvent) => {
                console.log('click', e, (e.target as any).tagName);
                if (BURRY_TAGS.includes((e.target as any).tagName)) {
                    this.push({
                        type: 'action',
                        time: Date.now(),
                        value: JSON.stringify({tagName: (e.target as any).tagName, text: (e.target as any).innerText}),
                        url: location.href
                    })
                }
            })
        }
    }

    // 监控
    public monitor() {

    }
}