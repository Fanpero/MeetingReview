// 各个状态常量
const PEDDING = 'pedding';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class Promise {
    // 原型
    constructor(executor) {
        this.status = PEDDING;
        this.value = undefined;
        this.reason = undefined;

        // 用来存放成功和失败的回调
        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];

        // 成功回调
        let resolve = value => {
            if (this.status === PEDDING) {
                this.status = FULFILLED;
                this.value = value;
                this.onResolvedCallbacks.forEach(fn => fn());
            }
        }

        // 失败回调
        let rejecte = reason => {
            if (this.status === PEDDING) {
                this.status = REJECTED;
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn => fn());
            }
        }

        try {
            // 执行器
            executor(resolve, rejecte);
        } catch (error) {
            rejecte(error);
        }
    }

    // 异步操作成功执行的函数
    then(onFulFilled, onRejected) {
        // 解决 onFulfilled / onRejected 没有传值的问题，如果的是函数，直接接受，不是函数转为匿名函数
        onFulFilled = typeof onFulFilled === 'function' ? onFulFilled : v => v;

        // 因为错误的值要让后面访问到，所以这里也要抛出错误，不然会在之后 then 的 resolve 中捕获
        onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };

        // 每次调用 then 都返回一个新的 promise
        let promise = new Promise((resolve, reject) => {
            // 异步操作成功
            if (this.status === FULFILLED) {
                // 使用 setTimeout 模拟异步
                setTimeout(() => {
                    try {
                        let x = onFulFilled(this.value);

                        // x 可能是一个Promise
                        resolvePromise(promise, x, resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                }, 0);
            }

            // 异步操作失败
            if (this.status === REJECTED) {
                // 使用 setTimeout 模拟异步
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason);

                        // x 可能是一个 promise
                        resolvePromise(promise, x, resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                }, 0);
            }

            // 异步操作等待中
            if (this.status === PEDDING) {
                this.onResolvedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulFilled(this.value);

                            resolvePromise(promise, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    }, 0);
                })

                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason);

                            resolvePromise(promise, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    }, 0);
                });
            }
        });

        return promise;
    }
}

// 解析 Promise 回调
const resolvePromise = (promise, x, resolve, reject) => {
    // 自己等待自己完成是错误的实现，用一个类型错误结束掉 promise --Promise/A+ 2.3.2
    if (promise === x) {
        return reject(new TypeError('Chaining cycle detected for promise #<Promise>'));
    }

    // Promise/A+ 2.3.3.3.3 只能触发一次
    let called;

    // 后续的条件要严格判断，保证代码能和别的库一起使用
    if ((typeof x === 'object' && c != null) || typeof x === 'function') {
        try {
            // 为了判断 resolve 过的就不用在 reject 了（比如 resolve 和 reject 同时调用的时候） Promise/A+ 2.3.3.1
            let then = x.then;
            if (typeof then === 'function') {
                // 不要写成 x.then ，直接 then.call 就可以了，因为 x.then 会再次取值，Object.defineProperty.  Promise/A+ 2.3.3.3
                then.call(
                    x,
                    y => {
                        // 根据 promise 的状态决定是成功还是失败
                        if (called) return;
                        called = true;

                        // 递归解析的过程（因为可能 promise 中还有 promise）。Promise/A+ 2.3.3.3.1
                        resolvePromise(promise, y, resolve, reject);
                    },
                    r => {
                        // 只要失败就失败 Promise/A+ 2.3.3.3.2
                        if (called) return;
                        called = true;

                        reject(r);
                    }
                );
            } else {
                // 如果 x.then 是个普通值就直接返回 resolve 作为结果  Promise/A+ 2.3.3.4
                resolve(x);
            }
        } catch (error) {
            // Promise/A+ 2.3.3.2
            if (called) return;
            called = true;

            reject(error);
        }
    } else {
        // 如果 x 是个普通值就直接返回 resolve 作为结果。  Promise/A+ 2.3.4
        resolve(x);
    }
}