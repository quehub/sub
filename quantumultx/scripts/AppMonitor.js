/*
* 监控app价格和版本升级
*  可自定义priceLimit和upgradeLimit 都设置较大数值将不会有通知
*  ✅:升级， 📈:涨价  📉: 降价
* 排序策略: 价格变动 > 有升级 > 新加app > app更新时间
* [QX]
* 32 7 * * * Tasks/AppMonitor.js, enabled=true
* */

const config = {
    name: 'app监控',
    apps:{
        us:[{
            name: 'Procreate',
            id: 425073498,
            enabled: true
        },{
            name: 'Notablity',
            id: 360593530,
            enabled: true
        },{
            name: 'Loon',
            id: 1373567447,
            enabled: true
        },{
            name: 'Thor',
            id: 1210562295,
            enabled: true
        },{
            name: '网易邮箱Pro',
            id: 909587083,
            enabled: true
        },{
            name: 'AdGuardPro',
            id: 1126386264,
            enabled: true
        },{
            name: 'pythonista3',
            id: 1085978097,
            enabled: true
        },{
            name: 'nPlayerPlus',
            id: 539397400,
            enabled: true
        },{
            name: 'Things 3',
            id: 904237743,
            enabled: true
        },{
            name: 'infusePro6',
            id: 1444671526,
            enabled: true
        },{
            name: 'prompt2',
            id: 917437289,
            enabled: true
        },{
            name: 'QuantumultX',
            id: 1443988620,
            enabled: true
        },{
            name: 'MathStudio',
            id: 956033107,
            enabled: true
        },{
            name: '熊猫吃短信',
            id: 1319191852,
            enabled: true
        },{
            name: '小历',
            id: 1031088612,
            enabled: true
        },{
            name: '菜谱大全Pro',
            id: 1183632694,
            enabled: true
        },{
            name: '黑白短信',
            id: 1444392450,
            enabled: true
        },{
            name: 'HyperApp',
            id: 1179750280,
            enabled: true
        },{
            name: 'Tweebot',
            id: 1018355599,
            enabled: true
        },{
            name: 'PharosPro',
            id: 1456610173,
            enabled: true
        },{
            name: 'ServerCat',
            id: 1501532023,
            enabled: true
        }],
        // cn: [1373567447,1210562295,909587083,1126386264,1085978097,539397400,904237743,1444671526,917437289,1443988620,956033107,1319191852,1031088612,1183632694,1444392450,1179750280,1018355599,1456610173]
    },
    notification: {
        priceLimit: 0,     // 当价格修改的app数量大于等于priceLimit时，触发通知
        upgradeLimit: 0    // 当新版本升级的app数量大于等于upgradeLimit时，触发通知
    },
    storeKey:'app_monitor_apps_key'
}
// console.time("run time")
let $tool = Tool()
$tool.log.level('warn')
if ($tool.env.cron) {
    AppMonitor()
}
$tool.done()
async function AppMonitor() {
    let requests = []
    try {
        config.countryes = []
        Object.keys(config.apps).forEach((country)=>{
            // format app config
            let apps = config.apps[country].map((app)=>{
                if (typeof app == 'number'){
                    return {id:app, enabled: true}
                } else if (typeof app == 'object'){
                    if (typeof app.enabled == 'undefined'){
                        app['enabled'] = true
                    }
                    if (typeof app.id == 'number'){
                        return app
                    }
                }
                $tool.log.error(`user config error: ${app}`)
                return {id:0,enabled:false}
            })
            config.apps[country] = apps

            let enabledApps = apps.filter(app => app.enabled)
            let appids = enabledApps.map((app) => app.id)
            $tool.log.debug(appids)
            if (appids.length > 0) {
                let options = {
                    url:`https://itunes.apple.com/lookup?country=${country}&id=${appids}&entity=software`,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36',
                        'X-Requested-With': 'Quantumult'
                    },
                    method: 'POST'
                }
                requests.push(options)
                config.countryes.push(country)
            }
        })
        if (requests.length > 0) {
            $tool.log.debug(requests)
            return getInfo(requests)
        }
    } catch (error) {
        $tool.log.error(error)
        $tool.notify(config.name, requests, error)
    }
}

async function getInfo(requests) {
    try {
        let responses = await Promise.all(requests.map(options => $tool.fetch(options)))
        return parseData(responses)
    } catch (error) {
        $tool.log.error(error)
        $tool.log.error(responses)
        $tool.notify(config.name,'request error', error)
    }
}

async function parseData(responses) {
    try {
        let datas = []
        for (let index in responses) {
            let country = config.countryes[index]
            let response = responses[index]
            if (response.status == 200) {
                let body = JSON.parse(response.body)
                let results = body.results.map((item)=>{
                    item['country'] = country
                    return item
                })
                datas = datas.concat(results)
            }
        }
        $tool.log.debug(datas)
        let appsIndex = mapApps()
        $tool.log.debug(appsIndex)
        let results = datas.map((item)=> {
            let country = item.country
            let app = appsIndex[item.trackId + country.toUpperCase()]
            if (typeof app.name == 'undefined'){
                app.name = item.trackName
            }
            return {
                name: app.name,
                country: country,
                trackName: item.trackName,
                trackId: item.trackId,
                formattedPrice: item.formattedPrice,
                price: item.price,
                currency: item.currency,
                currencyName: currencyName(item.currency),
                version: item.version,
                releaseDate: item.releaseDate,
                currentVersionReleaseDate: item.currentVersionReleaseDate,
                rating: item.averageUserRating.toFixed(1),
                bundleId: item.bundleId
            }
        })
        $tool.log.debug(results)
        return formatNotify(results)
    } catch (error) {
        $tool.log.error(error)
        $tool.notify(config.name,'', error)
    }
}

async function formatNotify(results) {
    let old = $tool.read(config.storeKey)
    let data = {}
    if (old) {
        let oldData = JSON.parse(old)
        if (oldData instanceof Array) {
            oldData.forEach((item)=>{
                let key = item.bundleId + item.country.toUpperCase()
                data[key] = item
            })
            $tool.log.debug(data)
        }
    }
    let isChanged = false
    let priceNumber = 0
    let upgradeNumber = 0
    let messages = []
    results.forEach((item)=>{
        let key = item.bundleId+item.country.toUpperCase()
        let store = data[key]
        // 权重高的放前面1，2，4 按位表示，价格变动是4，版本变动是2，新增为1
        let level = 0
        if (store) {
            let msg = `${flag(item.country)} ${item.name} `
            if (store.price != item.price) {
                level = level + 4
                let f = store.price < item.price ? '📈' : '📉'
                msg = msg + `💰${store.formattedPrice} => ${item.formattedPrice}${f} `
                priceNumber = priceNumber + 1
            } else {
                msg = msg + `💰${item.formattedPrice} `
            }
            if (store.version != item.version) {
                level = level + 2
                msg = msg + `[${item.version}]✅`
                upgradeNumber = upgradeNumber + 1
            } else {
                let releaseDate = formatTime(new Date(item.currentVersionReleaseDate))
                msg = msg + `[${item.version}] ${releaseDate}`
            }
            messages.push({msg, level, app:item})
        } else {
            let msg = `${flag(item.country)} ${item.name} 💰${item.formattedPrice} [${item.version}]➕`
            level = level + 1
            messages.push({msg, level, app:item})
        }
        if (level > 0) {
            isChanged = true
        }
    })
    if (messages.length > 0) {
         messages.sort((a, b) => {
             if (a.level == b.level) {
                 let atime = a.app.currentVersionReleaseDate
                 let btime = b.app.currentVersionReleaseDate
                 return  btime.localeCompare(atime)
             }
             return b.level - a.level
         })
        $tool.log.info(messages)
        if (config.notification.priceLimit <= priceNumber || config.notification.upgradeLimit <= upgradeNumber) {
            let subtitle = `价格变动: ${priceNumber}  版本升级: ${upgradeNumber}`
            $tool.notify(config.name, subtitle, messages.map(m => m.msg).join('\n'))
        } else {
            $tool.log.warn(messages)
        }
        // console.timeEnd('run time')
        // 通知了才更新数据
        if (isChanged) {
            if (results instanceof Array){
                $tool.write(JSON.stringify(results), config.storeKey)
            }
        }

    }
}

function mapApps() {
    let obj = {}
    Object.keys(config.apps).forEach((country)=>{
        config.apps[country].forEach((app)=>{
            // app['country'] = country
            obj[app.id + country.toUpperCase()] = app
        })
    })
    return obj
}

function formatTime(date) {
    const addZero = number => (number < 10 ? "0" + number : number)
    let year = date.getFullYear()
    let month = addZero(date.getMonth() + 1)
    let day = addZero(date.getDate())
    let current = new Date()
    if (current.getFullYear() == year) {
        return month + '-' + day
    }
    return year + '-' + month + '-' + day
}

function flag(country) {
    const flags = new Map([["AC", "🇦🇨"], ["AF", "🇦🇫"], ["AI", "🇦🇮"], ["AL", "🇦🇱"], ["AM", "🇦🇲"], ["AQ", "🇦🇶"], ["AR", "🇦🇷"], ["AS", "🇦🇸"], ["AT", "🇦🇹"], ["AU", "🇦🇺"], ["AW", "🇦🇼"], ["AX", "🇦🇽"], ["AZ", "🇦🇿"], ["BB", "🇧🇧"], ["BD", "🇧🇩"], ["BE", "🇧🇪"], ["BF", "🇧🇫"], ["BG", "🇧🇬"], ["BH", "🇧🇭"], ["BI", "🇧🇮"], ["BJ", "🇧🇯"], ["BM", "🇧🇲"], ["BN", "🇧🇳"], ["BO", "🇧🇴"], ["BR", "🇧🇷"], ["BS", "🇧🇸"], ["BT", "🇧🇹"], ["BV", "🇧🇻"], ["BW", "🇧🇼"], ["BY", "🇧🇾"], ["BZ", "🇧🇿"], ["CA", "🇨🇦"], ["CF", "🇨🇫"], ["CH", "🇨🇭"], ["CK", "🇨🇰"], ["CL", "🇨🇱"], ["CM", "🇨🇲"], ["CN", "🇨🇳"], ["CO", "🇨🇴"], ["CP", "🇨🇵"], ["CR", "🇨🇷"], ["CU", "🇨🇺"], ["CV", "🇨🇻"], ["CW", "🇨🇼"], ["CX", "🇨🇽"], ["CY", "🇨🇾"], ["CZ", "🇨🇿"], ["DE", "🇩🇪"], ["DG", "🇩🇬"], ["DJ", "🇩🇯"], ["DK", "🇩🇰"], ["DM", "🇩🇲"], ["DO", "🇩🇴"], ["DZ", "🇩🇿"], ["EA", "🇪🇦"], ["EC", "🇪🇨"], ["EE", "🇪🇪"], ["EG", "🇪🇬"], ["EH", "🇪🇭"], ["ER", "🇪🇷"], ["ES", "🇪🇸"], ["ET", "🇪🇹"], ["EU", "🇪🇺"], ["FI", "🇫🇮"], ["FJ", "🇫🇯"], ["FK", "🇫🇰"], ["FM", "🇫🇲"], ["FO", "🇫🇴"], ["FR", "🇫🇷"], ["GA", "🇬🇦"], ["GB", "🇬🇧"], ["HK", "🇭🇰"], ["ID", "🇮🇩"], ["IE", "🇮🇪"], ["IL", "🇮🇱"], ["IM", "🇮🇲"], ["IN", "🇮🇳"], ["IS", "🇮🇸"], ["IT", "🇮🇹"], ["JP", "🇯🇵"], ["KR", "🇰🇷"], ["MO", "🇲🇴"], ["MX", "🇲🇽"], ["MY", "🇲🇾"], ["NL", "🇳🇱"], ["PH", "🇵🇭"], ["RO", "🇷🇴"], ["RS", "🇷🇸"], ["RU", "🇷🇺"], ["RW", "🇷🇼"], ["SA", "🇸🇦"], ["SB", "🇸🇧"], ["SC", "🇸🇨"], ["SD", "🇸🇩"], ["SE", "🇸🇪"], ["SG", "🇸🇬"], ["TH", "🇹🇭"], ["TN", "🇹🇳"], ["TO", "🇹🇴"], ["TR", "🇹🇷"], ["TV", "🇹🇻"], ["TW", "🇨🇳"], ["UK", "🇬🇧"], ["UM", "🇺🇲"], ["US", "🇺🇸"], ["UY", "🇺🇾"], ["UZ", "🇺🇿"], ["VA", "🇻🇦"], ["VE", "🇻🇪"], ["VG", "🇻🇬"], ["VI", "🇻🇮"], ["VN", "🇻🇳"]])
    return flags.get(country.toUpperCase())
}

function currencyName(code) {
    const currencys = new Map([["AED","阿联酋迪拉姆"],["AFN","阿富汗尼"],["ALL","阿尔巴尼亚列克"],["AMD","亚美尼亚德拉姆"],["AOA","安哥拉宽扎"],["ANG","列斯荷兰盾"],["ARS","阿根廷比索"],["AUD","澳元"],["AWG","阿鲁巴岛弗罗林"],["AZN","阿塞拜疆马纳特"],["BAM","波黑可兑换马克"],["BBD","巴巴多斯元"],["BDT","孟加拉塔卡"],["BGN","保加利亚列瓦"],["BHD","巴林第纳尔"],["BIF","布隆迪法郎"],["BMD","百慕大元"],["BND","汶莱元"],["BOB","玻利维亚诺"],["MVDOL","玻利维亚"],["BOV","（资金代码）"],["BRL","巴西里亚伊（雷亚尔）"],["BSD","巴哈马元"],["BTN","不丹卢比"],["BWP","博茨瓦纳普拉"],["BYR","白俄罗斯卢布"],["BZD","伯利兹元"],["CAD","加拿大元"],["CDF","刚果法郎"],["CHF","瑞士法郎"],["CLP","智利比索"],["CNY","人民币"],["COP","哥伦比亚比索"],["CRC","哥斯达黎加科朗"],["CUP","古巴比索"],["CUC","古巴可兑换比索"],["CVE","佛得角埃斯库多"],["CZK","捷克克朗"],["DJF","吉布提法郎"],["DKK","丹麦克朗"],["DOP","多米尼加比索"],["DZD","阿尔及利亚第纳尔"],["EUR","欧元"],["EGP","埃及镑"],["ERN","厄立特里亚纳克法"],["ETB","埃塞俄比亚比尔"],["FJD","斐济元"],["FKP","福克兰群岛镑"],["GBP","英镑"],["GEL","格鲁吉亚拉里"],["GHS","加纳塞地"],["GIP","直布罗陀镑"],["GMD","冈比亚达拉西"],["GNF","几内亚法郎"],["GTQ","危地马拉格查尔"],["GYD","圭亚那元"],["HKD","港元"],["HNL","洪都拉斯伦皮拉"],["HRK","克罗地亚库纳"],["HTG","海地古德"],["HUF","匈牙利福林"],["IDR","印度尼西亚卢比盾"],["ILS","以色列新谢克尔"],["INR","印度卢比"],["IQD","伊拉克第纳尔"],["IRR","伊朗里亚尔"],["ISK","冰岛克朗"],["JMD","牙买加元"],["JOD","约旦第纳尔"],["JPY","日圆"],["KES","肯尼亚先令"],["KGS","吉尔吉斯斯坦索姆"],["KHR","柬埔寨利尔斯"],["KMF","科摩罗法郎"],["KRW","韩圆"],["KPW","朝鲜圆"],["KWD","科威特第纳尔"],["KYD","开曼群岛元"],["KZT","哈萨克斯坦腾格"],["LAK","老挝基普"],["LBP","黎巴嫩镑"],["LKR","斯里兰卡卢比"],["LRD","利比里亚元"],["LSL","莱索托洛提"],["LYD","利比亚第纳尔"],["MAD","摩洛哥道拉姆"],["MDL","摩尔多瓦列伊"],["MGA","马达加斯加阿里亚里"],["MRO","毛里塔尼亚乌吉亚"],["MKD","马其顿代纳尔"],["MMK","缅甸元"],["MNT","蒙古图格里克"],["MOP","澳门币"],["MUR","毛里求斯卢比"],["MVR","马尔代夫拉菲亚"],["MWK","马拉维克瓦查"],["MXN","墨西哥比索"],["MYR","马来西亚林吉特"],["MZN","莫桑比克梅蒂卡尔"],["NAD","纳米比亚元"],["NGN","尼日利亚奈拉"],["NIO","尼加拉瓜科多巴"],["NOK","挪威克朗"],["NPR","尼泊尔卢比"],["NZD","新西兰元"],["OMR","阿曼里亚尔"],["PAB","巴拿马巴尔博亚"],["PEN","秘鲁索尔"],["PGK","巴布亚新几内亚基那"],["PHP","菲律宾披索"],["PKR","巴基斯坦卢比"],["PLN","波兰兹罗提"],["PYG","巴拉圭瓜拉尼"],["QAR","卡塔尔里亚尔"],["RON","罗马尼亚列伊"],["RSD","塞尔维亚第纳尔"],["RUB","俄罗斯卢布"],["RWF","卢旺达法郎"],["SAR","沙特里亚尔"],["SBD","所罗门群岛元"],["SCR","塞舌尔卢比"],["SDG","苏丹第纳尔"],["SEK","瑞典克朗"],["SGD","新加坡元"],["SHP","圣赫勒拿镑"],["SLL","塞拉利昂利昂"],["SOS","索马里先令"],["SRD","苏里南元"],["SSP","南苏丹镑"],["STD","圣多美和普林西比多布拉"],["SYP","叙利亚镑"],["SZL","斯威士兰里兰吉尼"],["THB","泰铢"],["TJS","塔吉克斯坦索莫尼"],["TMT","土库曼斯坦马纳特"],["TND","突尼斯第纳尔"],["TOP","汤加潘加"],["TRY","土耳其里拉"],["TTD","特立尼达和多巴哥元"],["TWD","新台币"],["TZS","坦桑尼亚先令"],["UAH","乌克兰赫夫米"],["UGX","乌干达先令"],["USD","美元"],["UYU","乌拉圭比索"],["UZS","乌兹别克斯坦索姆"],["VEF","委内瑞拉博利瓦"],["VND","越南盾"],["VUV","瓦努阿图瓦图"],["WST","萨摩亚塔拉"],["XAF","中非法郎"],["XAU","金"],["XAG","银"],["XPT","铂"],["XPD","钯"],["XDR","特别提款权"],["XCD","格林纳达东加勒比元"],["XOF","西非法郎"],["XPF","太平洋法郎"],["XSU","苏克雷"],["YER","也门里亚尔"],["ZAR","南非兰特"],["ZMW","赞比亚克瓦查"],["XOF","西非法郎"]])
    return currencys.get(code.toUpperCase())
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
