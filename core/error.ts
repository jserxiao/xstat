/** @ts-ignore */
export default class Error {
    [key: string]: any;
    
    public promiseErrListen() {
        window.addEventListener('unhandledrejection', e => {
            console.log('xstat unhandledrejection', e, this.push);
            
            this.push({
                type: 'promiseError',
                time: Date.now(),
                value: e.reason.stack,
                url: location.href
            });
            setTimeout(() => {
                console.log('statdata', this.data);
                
            }, 100)
        })
    }
    public staticErrListen() {
        window.addEventListener('error', (e: ErrorEvent) => {
            const target: any = e.target;
            
            //资源加载错误
            if (target && (target.src || target.href)) {
                console.log('error static', e);
                
                this.push({
                    type: 'staticError',
                    time: Date.now(),
                    value: e.message,
                    url: location.href
                })
            }
            else { //js错误
                console.log('error js', e, this.push);
                
                this.push({
                    type: 'jsError',
                    time: Date.now(),
                    value: e.message,
                    url: location.href
                })
            }
            
          },
          true // 静态资源不冒泡只在捕获阶段报错
        );
    }
}