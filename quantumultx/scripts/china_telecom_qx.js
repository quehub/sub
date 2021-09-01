/**
 * 下载安装 天翼账号中心 登陆 获取authToken
 */

// 配置信息
let SSON = ""

const config = {
    name: "中国电信套餐",
    sson_key: "china_telecom_qx_sson_key"
}


const $tool = Tool()
//$tool.write(SSON, config.sson_key)
main()

async function main() {
    if (!(SSON)) {
        SSON = $tool.read(config.sson_key)
    }
    if (!(SSON)) {
        $tool.notify(config.name, "", "请修改文件SSON 或者 写入存储")
        return
    }

    let headers = {
        "Accept-Encoding": "gzip, deflate, br",
        "Cookie": `SSON=${SSON}`,
        "Connection": "keep-alive",
        "Referer": "https://e.189.cn/store/wap/query.do?t=tysuitnew",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Host": "e.189.cn",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EsurfingAccount_iOS_v2.8;",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest"
    }

    let detailReq = {
        url: "https://e.189.cn/store/user/package_detail.do?t=tysuitnew",
        method: "GET",
        headers: headers
    }
    let balanceReq = {
        url: "https://e.189.cn/store/user/balance_new.do",
        method: "GET",
        headers: headers
    }
    try {
        let detail = await $tool.fetch(detailReq)
        let balance = await $tool.fetch(balanceReq)
        await parseData(detail, balance)
        $tool.done()
    } catch (error) {
        console.log(error)
    }
}

async function parseData(detail, balance) {
    if (detail.statusCode != 200) {
        console.log(detail)
        $tool.notify(config.name, "获取套餐信息失败", `${detail.statusCode}:${detail.body}`)
        return
    }
    if (balance.statusCode != 200) {
        console.log(balance)
        $tool.notify(config.name, "获取话费信息失败", `${balance.statusCode}:${balance.body}`)
        return
    }
    let balanceBody = JSON.parse(balance.body)
    let detailBody = JSON.parse(detail.body)
    if (balanceBody.result == -10001 || detailBody.result == -10001) {
        $tool.notify(config.name, "用户未登陆", "重新登陆一次")
        return
    }
    if (balanceBody.result != 0) {
        console.log(balanceBody)
        $tool.notify(config.name, "获取话费信息失败", `${balanceBody.msg}`)
        return
    }
    if (detailBody.result != 0) {
        console.log(detailBody)
        $tool.notify(config.name, "获取套餐信息失败", `${detailBody.msg}`)
        return
    }
    let balanceAvailable = parseInt(balanceBody.totalBalanceAvailable)
    await notify(detailBody, balanceAvailable)
}


async function notify(data, balance) {
    // voiceAmount 总语音 voiceUsage voiceBalance
    // totalCommon usedCommon balanceCommon

    var subtitle = ""
    var productname = "中国电信"
    if (typeof data.items[0].productOFFName != "undefined") {
        productname = data.items[0].productOFFName
    }
    //var message = "[套餐] " + productname + "\n" + 
    var message = "[话费] 剩余: " + (balance / 100).toFixed(2) + "元"
    if (typeof data.voiceAmount != "undefined") {
        var voice = "[通话] 已用: " + data.voiceUsage + "分, 剩余: " + data.voiceBalance + "分,  合计: " + data.voiceAmount + "分"
        message = message + "\n" + voice
    }
    if (typeof data.total != "undefined" && data.total > 0) {
        var flow = "[流量] 已用: " + formatFlow(data.used) + ", 剩余: " + formatFlow(data.balance-999999995904) + ", 合计: " + formatFlow(data.total-999999995904)
        message = message + "\n" + flow
    }

    $tool.notify(config.name, subtitle, message)
    console.log(config.name + "\n" + subtitle + "\n" + message)
}

// MB 和 GB 自动转换
function formatFlow(number, digits=2) {
    // let units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "BB"]
    let units = ["B", "K", "M", "G", "T", "P", "E", "Z", "B"]
    let index = 1
    while (number >= 1024) {
        number /= 1024
        index++
    }
    return parseFloat(number.toFixed(digits)) + units[index]
}


function Tool() {
    // environment
    const env = {
        request: typeof $request !== "undefined",
        response: typeof $response !== "undefined",
        cron: typeof $request === "undefined" && typeof $response === "undefined",
        app: {
            surge: 'undefined' !== typeof $httpClient && 'undefined' === typeof $loon,
            loon: 'undefined' !== typeof $loon,
            quanx: typeof $task !== "undefined",
            shadowrocket: 'undefined' !== typeof $rocket,
            node: 'undefined' !== typeof module && !!module.exports
        }
    }


    // notification
    const notify = (title, subtitle, message) => {
        if (env.app.quanx) {
            $notify(title, subtitle, message)
        }
        if (env.app.surge || env.app.loon) {
            $notification.post(title, subtitle, message)
        }
        if (env.app.node) {
            console.log(JSON.stringify({title, subtitle, message}))
        }
    }

    // store
    const read = (key) => {
        if (env.app.quanx) return $prefs.valueForKey(key)
        if (env.app.surge || env.app.loon) return $persistentStore.read(key)
    }

    const write = (value, key) => {
        if (env.app.quanx) return $prefs.setValueForKey(value, key)
        if (env.app.surge || env.app.loon) return $persistentStore.write(value, key)
    }

    const fetch = async (options) => {
        // if (options.headers) {
        //     // delete options.headers['Content-Type']
        //     delete options.headers['Content-Length']
        //     if (env.app.quanx) {
        //         options.opts = options.opts || {}
        //         Object.assign(options.opts, { hints: false })
        //     } else if (env.app.surge || env.app.loon) {
        //         Object.assign(options.headers, { 'X-Surge-Skip-Scripting': false })
        //     }
        // }
        if (env.app.quanx) {
            return $task.fetch(options)
        } else if (env.app.node) {
            const axios = require('axios');
            options["transformResponse"] = []
            axios.interceptors.response.use(function (response) {
                // console.log(typeof response.data)
                response.body = response.data
                return Promise.resolve(_status(response));
            });
            return axios(options)
        }else if (env.app.loon || env.app.surge) {
            return new Promise((resolve, reject) => {
                let method = "get"
                if (options["method"]) {
                    method = options["method"].toLowerCase()
                }
                $httpClient[method](options, (error, response, data) => {
                    if (error) {
                        reject(error)
                    } else {
                        response.body = data
                        resolve(_status(response))
                    }
                })
            })
        }
    }

    const _status = (response) => {
        if (response) {
            if (response.status) {
                response["statusCode"] = response.status
            } else if (response.statusCode) {
                response["status"] = response.statusCode
            }
        }
        return response
    }

    // done
    const done = (value = {}) => {
        console.log("done")
        if (env.app.loon || env.app.surge || env.app.quanx) {
            $done(value)
        } else if (env.app.node) {
            console.log("system exit")
        }
    }

    return {read, write, notify, fetch, env, done}
}
