/**
 * Bandwagon flow
 * 查询搬瓦工流量
 *
 *
 * 写入veid和api_key方法 (二选一)
 * 方法一: 修改文件的 config 中的值
 *
 * 方法二，配置读取response, 打开https://bandwagonhost.com/clientarea.php?action=products 网站 登陆 (需翻墙)
 * 依次点击 (KiwiVM Control Panel) => (API) => (Show API Key) 会分别通知veid和api_key写入成功
 * 写入脚本，通知写入成功之后，脚本即可禁用
 * [quantumult x]
 * ^https?:\/\/kiwivm\.64clouds\.com\/main-exec\.php\?mode=api url script-response-body bandwagon.js
 * hostname = kiwivm.64clouds.com
 *
 * [Loon] & [surge]
 * http-response ^https?:\/\/kiwivm\.64clouds\.com\/main-exec\.php\?mode=api requires-body=1,script-path=https://raw.githubusercontent.com/cronscript/script/master/bandwagon.js
 * hostname = kiwivm.64clouds.com
 *
 *
 *
 * 定时任务
 * [quantumult x]
 * 30 8 * * * bandwagon.js
 * [Loon] & [surge]
 * cron "0 30 8 * * *" script-path=https://raw.githubusercontent.com/cronscript/script/master/bandwagon.js
 */

//
// 修改veid和api_key

var config = {
    veid: 0,       // 方法一，在此填入veid
    api_key: ""    // 方法一, 在此填入api_key
};

// 订阅使用key，存储在本地,卸载app会消失
const subConfig = {
    name: "搬瓦工流量查询",
    veid_key: "bandwagon_veid_key",
    api_key: "bandwagon_api_key"
}

const $tool = Tool();
$tool.log.level("error")

if ($tool.ishttp) {
    getLoginValue();
    $tool.done();
} else {
    check_flow();
    $tool.done();
}

// get login value
function getLoginValue() {
    let veidRegex = /getServiceInfo\?veid=(\d+)/;
    let keyRegex = /value='(private_[a-zA-z0-9]+)/;
    let veidResult = veidRegex.exec($response.body);
    if (veidResult) {
        let veid = veidResult[1];
        if (veid) {
            $tool.write(`${veid}`, subConfig.veid_key);
            $tool.notify(subConfig.name, "veid写入成功", veid);
        }
    }
    let apiKeyResult = keyRegex.exec($response.body);
    if (apiKeyResult) {
        let api_key = apiKeyResult[1];
        if (api_key) {
            $tool.write(`${api_key}`, subConfig.api_key);
            $tool.notify(subConfig.name, "api_key写入成功", api_key);
        }
    }


}

// 格式化时间
function formatTime(date) {
    var Y = date.getFullYear() + '-';
    var M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    // var D = date.getDate() + ' ';
    var D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
    var h = date.getHours() + ':';
    var m = date.getMinutes() + ':';
    var s = date.getSeconds();
    return Y + M + D + h + m + s;
}

// 前一个月时间
function preMonthTime(resetTime) {
    var date = new Date(resetTime);
    date.setMonth(date.getMonth() - 1);
    return date;
}

// 当前月份天数
function monthDays(currentTime) {
    var date = new Date(currentTime)
    //将当前月份加1，下移到下一个月
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.getDate();
}

// 计算当前时间 间隔
function intervalTimes(startTime, endTime) {
    var stime = Date.parse(startTime);
    var etime = Date.parse(endTime);
    // 两个时间戳相差的毫秒数
    var usedTime = etime - stime;
    // 计算相差的天数
    var days = Math.floor(usedTime / (24 * 3600 * 1000));
    // 计算天数后剩余的毫秒数
    var leave1 = usedTime % (24 * 3600 * 1000);
    // 计算出小时数
    var hours = Math.floor(leave1 / (3600 * 1000));
    // 计算小时数后剩余的毫秒数
    var leave2 = leave1 % (3600 * 1000);
    // 计算相差分钟数
    var minutes = Math.floor(leave2 / (60 * 1000));
    var time = days + "天" + hours + "时" + minutes + "分";
    return time;
}

// 平均每天使用流量
function averageFlow(startTime, endTime, flow, isUsed = true) {
    var stime = Date.parse(startTime);
    var etime = Date.parse(endTime);
    // 两个时间戳相差的毫秒数
    var usedTime = etime - stime;
    var dayFlow = flow / 1073741824 / usedTime * 1000 * 3600 * 24;
    // 剩余最后一天，修复流量计算过大
    if (!isUsed && usedTime < 1000 * 3600 * 24) {
        dayFlow = flow / 1073741824
    }
    return dayFlow.toFixed(3)
}


function parse_flow(data) {
    var currentTime = new Date();
    var resetTime = new Date(data.data_next_reset * 1000);
    var startTime = preMonthTime(resetTime);

    var use_plan = (data.data_counter / 1073741824).toFixed(2) + "/" + data.plan_monthly_data / 1073741824 + "G";
    var percent = (data.data_counter * 100 / data.plan_monthly_data).toFixed(2) + "%";
    var ip = data.ip_addresses[0];
    var reset_date = formatTime(resetTime);
    var start_date = formatTime(startTime);

    var days = monthDays(startTime);
    var residue = ((data.plan_monthly_data - data.data_counter) / 1073741824).toFixed(2) + "G"

    var subTitle = "已用: " + percent + ", " + use_plan + " 剩余: " + residue;

    var usedTimes = intervalTimes(startTime, currentTime);
    var residueTimes = intervalTimes(currentTime, resetTime);

    var residueFlow = averageFlow(currentTime, resetTime, data.plan_monthly_data - data.data_counter, false);
    var usedFlow = averageFlow(startTime, currentTime, data.data_counter, true);

    var msg1 = "已用: " + usedTimes + ", 平均每天: " + usedFlow + "GB";
    var msg2 = "剩余: " + residueTimes + ", 剩余每天: " + residueFlow + "GB";
    var msg3 = "本月: " + days + "天, 重置: " + reset_date;
    var message = msg1 + "\n" + msg2 + "\n" + msg3;

    $tool.notify(subConfig.name, subTitle, message);
    $tool.log.debug(subTitle);
    $tool.log.debug(message);
    // push(subConfig.name, subTitle+"\n"+ message)
}

function check_flow() {
    if (!(config.veid && config.api_key)) {
        config.veid = parseInt($tool.read(subConfig.veid_key));
        config.api_key = $tool.read(subConfig.api_key);
    }
    if (!(config.veid && config.api_key)) {
        $tool.notify(subConfig.name, "", "请修改文件veid和api_key 或者 写入存储")
        return
    }
    var request = {
        url: `https://api.64clouds.com/v1/getServiceInfo?veid=${config.veid}&api_key=${config.api_key}`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 - mmbWebBrowse - ios"
        }
    };
    $tool.fetch(request).then((response) => {
        if (response.statusCode == 200) {
            parse_flow(JSON.parse(response.body))
        } else {
            $tool.log.error(response)
            $tool.notify(subConfig.name, "接口返回出错", response);
        }
    }).catch((error) => {
        $tool.log.error(error)
        $tool.notify(subConfig.name, "接口查询错误", error);
    })
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
        if (env.app.quanx) env.cron ? $done() : $done(value)
        if (env.app.surge) env.cron ? $done() : $done(value)
    }

    return {read, write, notify, fetch, env, log, done}
}


// 致谢
// https://github.com/yichahucha/surge/blob/master/tool.js
//https://github.com/chavyleung/scripts/blob/master/chavy.js

