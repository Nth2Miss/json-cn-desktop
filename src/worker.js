// Worker: 负责大 JSON 的解析 + BigNumber + 格式化，按 <br/> 切行为虚拟滚动
import jsonlint from "jsonlint-mod";
import BigNumber from "bignumber.js";

const JSONFormat = (function () {
  const _toString = Object.prototype.toString;
  function _typeof(o) {
    const tf = typeof o, ts = _toString.call(o);
    return o === null ? "Null" : tf === "undefined" ? "Undefined" : tf === "boolean" ? "Boolean" : tf === "number" ? "Number" : tf === "string" ? "String" : ts === "[object Function]" ? "Function" : ts === "[object Array]" ? "Array" : ts === "[object Date]" ? "Date" : "Object";
  }
  function indent_tab(c) { return new Array(c + 1).join('<span class="json_nbsp">%yxpnbspyxp;%yxpnbspyxp;%yxpnbspyxp;%yxpnbspyxp;</span>'); }
  function _f_null() { return '<span class="json_null">null</span>'; }
  function _f_bool(o) { return '<span class="json_boolean">' + o + '</span>'; }
  function _f_num(o) { return '<span class="json_number">' + o + '</span>'; }
  function _f_str(o) {
    o = o.replace(/\</g, "%yxplt;").replace(/\>/g, "%yxpgt;");
    if (0 <= o.search(/^http/)) o = '<a href="' + o + '" target="_blank" class="json_link">' + o + '</a>';
    return '<span class="json_string">"' + o + '"</span>';
  }
  function _f_arr(obj, indent) {
    const tmp = [];
    for (let i = 0; i < obj.length; i++) tmp.push(indent_tab(indent) + format(obj[i], indent + 1));
    return '<span data-type="array" data-size="' + tmp.length + '"><span class="fold-btn" data-fold="collapse" title="折叠/展开">⊖</span>[<br/>' + tmp.join(',<br/>') + '<br/>' + indent_tab(indent - 1) + ']</span>';
  }
  function _f_obj(obj, indent) {
    const tmp = [];
    for (const k in obj) {
      const kr = k.replace('jsondotcnprefixyxp', '');
      tmp.push(indent_tab(indent) + '<span class="json_key">"' + kr + '"</span>:<span class="json_nbsp">%yxpnbspyxp;</span>' + format(obj[k], indent + 1));
    }
    return '<span data-type="object"><span class="fold-btn" data-fold="collapse" title="折叠/展开">⊖</span>{<br/>' + tmp.join(',<br/>') + '<br/>' + indent_tab(indent - 1) + '}</span>';
  }
  function format(o, c) {
    switch (_typeof(o)) {
      case "Null": return _f_null();
      case "Boolean": return _f_bool(o);
      case "Number": return _f_num(o);
      case "String": o = o.replace(/ /g, "%yxpnbspyxp;"); return _f_str(o);
      case "Array": return _f_arr(o, c);
      case "Object": return o instanceof BigNumber ? _f_num(o.toFixed()) : _f_obj(o, c);
      default: return _f_str(String(o));
    }
  }
  const Cls = function (d) {
    let s = d.replace(/([^\\]")\s*:\s*([-+Ee0-9.]+)\s*(,)?/g, (m,p1,p2,p3)=> (p1||'') + ': ' + '"jsondotcnprefix' + (p2||'') + '"' + (p3||''));
    s = s.replace(/("\s*)((\\"|[^"])*)\s*(")/g, (m,p1,p2,p3,p4)=>{ let r=p2.replace(/(,|^)(\s*)(\d+)(\s*)(?=,|$)/g,(m,a,b,c)=>(a||'')+'jsondotyxpprefixyxp'+(b||'')+(c||'')); r=r.replace(/(\[)\s*(\d+)/g,(m,a,b)=>(a||'')+'jsondotyxpprefixyxp'+(b||'')); r=r.replace(/(\d+)(])/g,(m,a,b)=>'jsondotyxpprefixyxp'+(a||'')+(b||'')); return p1+r+p4; });
    s = s.replace(/(,|^)\s*(\d+)\s*(?=,|$)/g,(m,p1,p2)=>p1+'"jsondotcnprefix'+(p2||'')+'"');
    s = s.replace(/([^\\]")\s*:\s*(\[)\s*([-+Ee0-9.]+)\s*(,)?\s*(])?/g,(m,p1,p2,p3,p4,p5)=>(p1||'')+': '+(p2||'')+'"jsondotcnprefix'+(p3||'')+'"'+(p4||'')+(p5||''));
    s = s.replace(/(,)\s*([-+Ee0-9.]+)\s*(])\s*/g,(m,p1,p2,p3)=>(p1||'')+'"jsondotcnprefix'+(p2||'')+'"'+(p3||''));
    s = s.replace(/"([-+Ee0-9.]+)"\s*:\s*/g,(m,p1)=>'"jsondotcnprefixyxp'+(p1||'')+'": ');
    s = s.replace(/jsondotyxpprefixyxp/g,'');
    try {
      this.data = JSON.parse(s, (k,v)=> typeof v!=="string"||!v.startsWith("jsondotcnprefix")?v:new BigNumber(v.slice(15)));
    } catch(e){ this.data = JSON.parse(d); }
  };
  Cls.prototype.toString = function(){ return format(this.data,1); };
  return Cls;
})();

let seq = 0;
self.onmessage = (e) => {
  const { id, type, content, cancelZY } = e.data;
  if (type === "parse") {
    const start = performance.now();
    try {
      let parseContent = content;
      if (cancelZY) parseContent = parseContent.replace(/\\/g, "\\\\").replace(/\\"/g, '\\\\"');
      // 先用 jsonlint 校验（带行号）
      const parsed = jsonlint.parse(parseContent);
      const html = new JSONFormat(parseContent).toString();
      // 按 <br/> 切行，保留空行
      const rawLines = html.split(/<br\/?>/g);
      // 后期替换占位
      const lines = rawLines.map(l => l.replace(/&/g,"&amp;").replace(/%yxpnbspyxp;/g,"&nbsp;").replace(/%yxplt;/g,"&lt;").replace(/%yxpgt;/g,"&gt;"));
      // 统计顶级字段
      let topCount = 0;
      if (parsed && typeof parsed === "object") topCount = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
      postMessage({ id, ok:true, lines, topCount, ms: Math.round(performance.now()-start), parsed: topCount<100 ? parsed : null });
    } catch (err) {
      postMessage({ id, ok:false, error: String(err), ms: Math.round(performance.now()-start) });
    }
  }
};
