/**
 * 下载安装 天翼账号中心 登陆 获取authToken
 * [注] 版本号 >= 1.0.6(211) 才可以使用
 * quantumultx
 [rewrite_local]
 ^https?:\/\/e\.189\.cn\/store\/tysuit\/unifyLessLogin\.do\?token= url script-request-header Tasks/china_telecom_qx.js
 # MITM = e.189.cn
 [task_local]
 10 8 * * * Tasks/china_telecom_qx.js
 # MITM = e.189.cn
 */

// 配置信息
let config = {
    name: "中国电信套餐",
    authTokenKey: "china_telecom_qx_token_10000",
    cookie_uuid_key: "china_telecom_qx_cookie_uuid_10000",
    czsson_key: "china_telecom_qx_czsson_10000"
}


const $tool = Tool()
// $tool.log.level("error")

let AUTHTOKEN = $tool.read(config.authTokenKey)

if ($tool.ishttp) {
    GetCookie()
    $tool.done()
} else {
    cron()
    $tool.done()
}

function GetCookie() {
    if ($request && $request.url) {
        let authRegex = /token=(\S+?)&/
        var cookieVal = authRegex.exec($request.url)
        if (cookieVal) {
            if ($tool.write(cookieVal, config.authTokenKey)) {
                $tool.notify(config.name, '获取authToken: 成功', '')
                $tool.log.info(`[${config.name}] 获取authToken: 成功, authToken: ${cookieVal}`)
            }
        }
    }
}

async function cron(login=false) {
    if (!AUTHTOKEN) {
        $tool.notify(config.name, "请获取authToken", "下载安装APP[天翼账号中心]获取")
        return
    }
    // 是否重新登陆
    let isLogin = login
    let cookie_uuid = $tool.read(config.cookie_uuid_key)
    let czsson = $tool.read(config.czsson_key)
    if (!cookie_uuid || !czsson) {
        isLogin = true
    }

    try {
        let loginReq =  {
            url: `https://e.189.cn/store/tysuit/unifyLessLogin.do?token=${AUTHTOKEN}&url=https%3A%2F%2Fe.189.cn%2Fstore%2Fwap%2Fquery.do%3Ft%3Dtysuitnew`,
                headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EsurfingAccount_iOS_v2.6.1;",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br"
            },
            opts:{
                redirection: false
            },
            followRedirect: false,
                method: "GET"
        }
        if (isLogin) {
            let loginRes = await $tool.fetch(loginReq)
            $tool.log.debug(loginRes.headers)
            let cookies = loginRes.headers["Set-Cookie"]
            if (!cookies) {
                cookies = loginRes.headers['set-cookie']
            }
            let cookieRegex = /cookie_uuid=(\S+?);/
            let czssonRegex = /CZSSON=(\S+?);/
            if (loginRes.statusCode != 302) {
                $tool.notify(config.name, "登陆出错", loginRes.body)
                $tool.log.error(loginRes)
                return
            }
            if (!cookies) {
                $tool.notify(config.name, "未发现cookie", "请看日志")
                $tool.log.error(loginRes.headers)
                return
            }
            if (typeof cookies == 'string') {
                cookies = new Array(cookies)
            }
            cookies.forEach((item)=>{
                let cookie = cookieRegex.exec(item)
                let czs = czssonRegex.exec(item)
                if (cookie) {
                    cookie_uuid = cookie[1]
                }
                if (czs) {
                    czsson = czs[1]
                }
            })
            if (cookie_uuid && czsson) {
                $tool.write(cookie_uuid, config.cookie_uuid_key)
                $tool.write(czsson, config.czsson_key)
            }
        }
        $tool.log.debug(cookie_uuid)
        $tool.log.debug(czsson)
        if (!cookie_uuid || !czsson) {
            $tool.notify(config.name, "登陆失败", '无法获取cookie')
            $tool.log.error(loginRes)
            return
        }

        let detailReq = {
            url: "https://e.189.cn/store/user/package_detail.do?t=tysuitnew",
            method: "GET",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EsurfingAccount_iOS_v2.6.1;",
                "Referer": "https://e.189.cn/store/wap/query.do?t=tysuitnew",
                "Cookie": `CZSSON=${czsson};SSON=${czsson};cookie_uuid=${cookie_uuid}`,
                "X-Requested-With": "XMLHttpRequest"
            }

        }
        let r = Math.random()
        let balanceReq = {
            url: `https://e.189.cn/store/user/balance_new.do?t=tysuitnew&r=${r}`,
            method: "GET",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EsurfingAccount_iOS_v2.6.1;",
                "Referer": "https://e.189.cn/store/wap/query.do?t=tysuitnew",
                "Cookie": `CZSSON=${czsson};SSON=${czsson};cookie_uuid=${cookie_uuid}`,
                "X-Requested-With": "XMLHttpRequest"
            }

        }
        const [detail, balance] = await Promise.all([
            $tool.fetch(detailReq),
            $tool.fetch(balanceReq)
        ]);

        await parseData(detail, balance, isLogin)

    } catch (error) {
        $tool.notify(config.name, "网络请求出错", error)
        $tool.log.error(error)
        $tool.log.error(detail)
        $tool.log.error(balance)
    }
}

async function parseData(detail, balance, isLogin) {
    if (detail.statusCode != 200) {
        $tool.log.error(detail)
        $tool.notify(config.name, "获取套餐信息失败", `${detail.statusCode}:${detail.body}`)
        return
    }
    $tool.log.debug(detail.body)
    if (balance.statusCode != 200) {
        $tool.log.error(balance)
        $tool.notify(config.name, "获取话费信息失败", `${balance.statusCode}:${balance.body}`)
        return
    }
    $tool.log.debug(balance.body)
    let balanceBody = JSON.parse(balance.body)
    let detailBody = JSON.parse(detail.body)
    if (balanceBody.result == -10001 || detailBody.result == -10001) {
        if (isLogin) {
            $tool.notify(config.name, "用户登陆失败", "")
        } else {
            $tool.notify(config.name, "用户未登陆", "重新登陆一次")
            await cron(true)
        }
        return
    }
    if (balanceBody.result != 0) {
        $tool.log.error(balanceBody)
        $tool.notify(config.name, "获取话费信息失败", `${balanceBody.msg}`)
        return
    }
    if (detailBody.result != 0) {
        $tool.log.error(detailBody)
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
    var message = "[套餐] " + productname + "\n" + "[话费] 剩余: " + (balance / 100).toFixed(2) + "元"
    if (typeof data.voiceAmount != "undefined") {
        var voice = "[通话] 已用: " + data.voiceUsage + "分, 剩余: " + data.voiceBalance + "分,  合计: " + data.voiceAmount + "分"
        message = message + "\n" + voice
    }
    if (typeof data.totalCommon != "undefined" && data.totalCommon > 0) {
        var flow = "[流量] 已用: " + formatFlow(data.usedCommon / 1024) + ", 剩余: " + formatFlow(data.balanceCommon / 1024) + ", 合计: " + formatFlow(data.totalCommon / 1024)
        message = message + "\n" + flow
    }

    $tool.notify(config.name, subtitle, message)
    $tool.log.info(config.name + "\n" + subtitle + "\n" + message)
}

// MB 和 GB 自动转换
function formatFlow(number) {
    if (number < 1024) {
        return number.toFixed(0) + "M"
    }
    return (number / 1024).toFixed(2) + "G"
}

function Tool() {
    // environment
    const env = {
        request: typeof $request != "undefined",
        response: typeof $response != "undefined",
        cron: typeof $request == "undefined" && typeof $response == "undefined",
        app: {
            surge: typeof $httpClient != "undefined",
            quanx: typeof $task != "undefined",
            node: typeof require == "function" && typeof $app == "undefined"
        }
    }

    // config
    const _nodeStoreName = "prefs.json"

    // custom log
    // if you want to add log level, just add to _logLevels
    const _log = (() => {
        // default log value
        let _logLevel = "debug"

        const _logLevels = new Array("trace", "debug", "info", "warn", "error", "fatal")

        // 设置日志等级，返回值为当前等级
        const _setLogLevel = (level = "") => {
            if (_logLevels.indexOf(level) > -1) {
                _logLevel = level
            }
            return _logLevel
        }

        // 过滤低等级日志信息
        const _filterLog = (level, callback) => {
            let index = _logLevels.indexOf(level)
            let current = _logLevels.indexOf(_setLogLevel())
            if (index > -1) {
                if (index >= current) {
                    callback()
                }
            } else {
                callback()
            }
        }

        const _setLogFunction = (level) => {
            return (message) => {
                _filterLog(level, (() => {
                    console.log(message)
                }))
            }
        }

        var logFunc = {level: _setLogLevel, log: _filterLog}
        _logLevels.forEach((item) => {
            logFunc[item] = _setLogFunction(item)
        })

        return logFunc
    })

    const log = _log()

    // notification
    const notify = (title, subtitle, message) => {
        if (env.app.quanx) {
            $notify(title, subtitle, message)
        }
        if (env.app.surge) {
            $notification.post(title, subtitle, message)
        }
        if (env.app.node) {
            console.log(JSON.stringify({title, subtitle, message}))
        }
    }

    // store
    const read = (key) => {
        if (env.app.quanx) return $prefs.valueForKey(key)
        if (env.app.surge) return $persistentStore.read(key)
        if (env.app.node) return _nodeRead(key)
    }

    const write = (value, key) => {
        if (env.app.quanx) return $prefs.setValueForKey(value, key)
        if (env.app.surge) return $persistentStore.write(value, key)
        if (env.app.node) return _nodeWrite(value, key)
    }

    const _nodeRead = (key) => {
        try {
            let fs = require("fs")
            var data = JSON.parse(fs.readFileSync(_nodeStoreName))
            if (typeof data[key] != "undefined") {
                return data[key]
            }
        } catch (error) {
            log.error(error)
        }
        return ""
    }

    const _nodeWrite = (value, key) => {
        try {
            let fs = require("fs")
            if (!fs.existsSync(_nodeStoreName)) {
                fs.writeFileSync(_nodeStoreName, JSON.stringify({}))
            }
            var data = JSON.parse(fs.readFileSync(_nodeStoreName))
            data[key] = value
            fs.writeFileSync(_nodeStoreName, JSON.stringify(data))
            return true
        } catch (error) {
            log.error(error)
        }
        return false
    }

    const fetch = async (options) => new Promise((resolve, reject) => {
        if (typeof options == "string") {
            options = {url: options}
            options["method"] = "GET"
        }
        if (env.app.quanx) {
            $task.fetch(options).then((response) => {
                resolve(_status(response))
            }).catch((error) => {
                reject(error.error)
            })
            setTimeout(()=>{
                reject('request time out' + JSON.stringify(options))
            },7000)
        } else if (env.app.surge) {
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
        } else if (env.app.node) {
            let request = require('request')
            request(options.url, options, (error, response, data) => {
                if (!error) {
                    resolve(_status(response))
                } else {
                    reject(error)
                }
            })

        }
    })

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
        if (env.app.quanx) env.cron ? "" : $done(value)
        if (env.app.surge) env.cron ? $done() : $done(value)
    }

    return {read, write, notify, fetch, env, log, done}
}


// 致谢
// https://github.com/yichahucha/surge/blob/master/tool.js
//https://github.com/chavyleung/scripts/blob/master/chavy.js

