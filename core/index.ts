import Core from './core';
import Error from './error';


const copyProperties = (target, source)=>{ //加一个拷贝函数，用来拷贝传入的所有class的静态，及其prototype。
    Object.getOwnPropertyNames(source).forEach((prop)=>{
        
        // 过滤条件
        if(!prop?.match?.(/constructor|prototype|arguments|name/)) {
            Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(source, prop))
        }
    });
}

// 创建Mixins主体
const Mixins = (BaseClass, ...mixins)=>{
    // 创建一个基础Base。将其他mixin与其绑定
    class Base extends BaseClass {
        constructor(...props){
            super(...props)
        }
    }
    // 将其余需要被继承的class 与Base绑定。其类及其prototype
    mixins.forEach((mixin) => {
        copyProperties(Base, mixin)
        copyProperties(Base.prototype, mixin.prototype)
    });
    return Base;
}
export default Mixins(Core, Error);