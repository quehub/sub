/**
 * 资源解析器
 * 作用: 1. 去掉注释 2. surge规则加REJECT规则
 */


let content = $resource.content
let url = decodeURIComponent($resource.link)
// 去掉注释信息
content = content.replace(/^\s*[#;；].*/mg, '').replace(/\n{2,}/g, '\n')

// surge规则自动加reject
let ruleRegex = /(^(GEOIP|IP-CIDR|IP-CIDR6|IP6-CIDR|USER-AGENT|DOMAIN-KEYWORD|DOMAIN-SUFFIX|DOMAIN),\s?\S+)(,\s?no-resolve)?$/mig
content = content.replace(ruleRegex, '$1,REJECT')

$done({content: content})

// $done({error : "error description"});
// $done({content : "the modified content"});