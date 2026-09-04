// JSON助手 - 核心逻辑 移植自 https://www.json.cn/jsononline/
// 原站: json-format.js + jquery.json.js + bignumber.js + jsonlint
import BigNumber from "bignumber.js";
import jsonlint from "jsonlint-mod";

// ===== Toast =====
function toast(msg, type = "default") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ===== XML <-> JSON 简化版 (移植 jquery.xml2json / jquery.json2xml) =====
function xml2json(xmlStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, "text/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error(parseError.textContent || "XML 解析失败");

  function parseNode(node) {
    let obj = {};
    let hasElement = false;
    let text = "";

    // attributes
    if (node.attributes && node.attributes.length) {
      for (const attr of node.attributes) {
        obj["@" + attr.name] = attr.value;
      }
    }
    // children
    for (const child of node.childNodes) {
      if (child.nodeType === 3 || child.nodeType === 4) { // text/cdata
        const t = child.nodeValue.trim();
        if (t) text += t;
      } else if (child.nodeType === 1) {
        hasElement = true;
        const name = child.localName || child.nodeName;
        const val = parseNode(child);
        if (obj[name] !== undefined) {
          if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
          obj[name].push(val);
        } else {
          obj[name] = val;
        }
      }
    }
    if (!hasElement) {
      if (Object.keys(obj).length === 0) return text || "";
      if (text) obj["text"] = text;
      return obj;
    }
    if (text) obj["text"] = text;
    return obj;
  }

  const root = doc.documentElement;
  const result = {};
  result[root.localName || root.nodeName] = parseNode(root);
  return result;
}

function json2xml(obj) {
  function toXml(o, name) {
    if (o === null || o === undefined) return `<${name}/>`;
    if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") {
      const esc = String(o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      return `<${name}>${esc}</${name}>`;
    }
    if (Array.isArray(o)) {
      return o.map(v => toXml(v, name)).join("\n");
    }
    if (typeof o === "object") {
      let attrs = "";
      let inner = "";
      for (const k in o) {
        const v = o[k];
        if (k.startsWith("@")) {
          attrs += ` ${k.slice(1)}="${String(v).replace(/"/g,"&quot;")}"`;
        } else if (k === "text" || k === "#text") {
          inner += String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        } else {
          inner += toXml(v, k);
        }
      }
      if (!inner) return `<${name}${attrs}/>`;
      return `<${name}${attrs}>${inner}</${name}>`;
    }
    return `<${name}>${String(o)}</${name}>`;
  }
  // 根可能是 {root: {...}} 或直接对象
  if (typeof obj === "object" && obj !== null && Object.keys(obj).length === 1) {
    const rootKey = Object.keys(obj)[0];
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + toXml(obj[rootKey], rootKey);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n` + toXml(obj, "root");
}

// ===== JSONFormat 类 - 完整移植 jquery.json.js 的 format 逻辑 (去 jQuery) =====
const JSONFormat = (function () {
  const _toString = Object.prototype.toString;
  function _typeof(o) {
    const tf = typeof o, ts = _toString.call(o);
    return o === null ? "Null" : tf === "undefined" ? "Undefined" : tf === "boolean" ? "Boolean" : tf === "number" ? "Number" : tf === "string" ? "String" : ts === "[object Function]" ? "Function" : ts === "[object Array]" ? "Array" : ts === "[object Date]" ? "Date" : "Object";
  }
  function indent_tab(count) {
    return new Array(count + 1).join('<span class="json_nbsp">%yxpnbspyxp;%yxpnbspyxp;%yxpnbspyxp;%yxpnbspyxp;</span>');
  }
  function _format_null() { return '<span class="json_null" contenteditable="true">null</span>'; }
  function _format_boolean(o) { return '<span class="json_boolean" contenteditable="true">' + o + '</span>'; }
  function _format_number(o) { return '<span class="json_number" contenteditable="true">' + o + '</span>'; }
  function _format_string(o) {
    o = o.replace(/\</g, "%yxplt;");
    o = o.replace(/\>/g, "%yxpgt;");
    if (0 <= o.search(/^http/)) {
      o = '<a href="' + o + '" target="_blank" class="json_link">' + o + '</a>';
    }
    return '<span class="json_string" contenteditable="true">"' + o + '"</span>';
  }
  function _format_array(obj, indent) {
    const tmp = [];
    for (let i = 0; i < obj.length; i++) tmp.push(indent_tab(indent) + format(obj[i], indent + 1));
    return '<span data-type="array" data-size="' + tmp.length + '"><span class="fold-btn" data-fold="collapse" title="折叠/展开">⊖</span>[<br/>' + tmp.join(',<br/>') + '<br/>' + indent_tab(indent - 1) + ']</span>';
  }
  function _format_object(obj, indent) {
    const tmp = [];
    for (const key in obj) {
      const keyRe = key.replace('jsondotcnprefixyxp', '');
      tmp.push(indent_tab(indent) + '<span class="json_key" contenteditable="true">"' + keyRe + '"</span>:<span class="json_nbsp">%yxpnbspyxp;</span>' + format(obj[key], indent + 1));
    }
    return '<span data-type="object"><span class="fold-btn" data-fold="collapse" title="折叠/展开">⊖</span>{<br/>' + tmp.join(',<br/>') + '<br/>' + indent_tab(indent - 1) + '}</span>';
  }
  function format(object, indent_count) {
    let html = "";
    switch (_typeof(object)) {
      case "Null": html = _format_null(object); break;
      case "Boolean": html = _format_boolean(object); break;
      case "Number": html = _format_number(object); break;
      case "String":
        object = object.replace(/ /g, "%yxpnbspyxp;");
        html = _format_string(object); break;
      case "Array": html = _format_array(object, indent_count); break;
      case "Object":
        if (object instanceof BigNumber) html = _format_number(object.toFixed());
        else html = _format_object(object, indent_count);
        break;
      default: html = _format_string(String(object));
    }
    return html;
  }

  const Cls = function (origin_data) {
    // 大数保护 - 完整复刻原站 8 步正则
    let stringedJSON = origin_data.replace(/([^\\]")\s*:\s*([-+Ee0-9.]+)\s*(,)?/g, function (match, p1, p2, p3) {
      return ((p1 || '') + ': ' + '"jsondotcnprefix' + (p2 || '') + '"' + (p3 || ''));
    });
    stringedJSON = stringedJSON.replace(/("\s*)((\\"|[^"])*)\s*(")/g, function (match, p1, p2, p3, p4) {
      let replaceStr = p2.replace(/(,|^)(\s*)(\d+)(\s*)(?=,|$)/g, function (m, a, b, c) { return (a || '') + 'jsondotyxpprefixyxp' + (b || '') + (c || ''); });
      replaceStr = replaceStr.replace(/(\[)\s*(\d+)/g, (m, a, b) => (a || '') + 'jsondotyxpprefixyxp' + (b || ''));
      replaceStr = replaceStr.replace(/(\d+)(])/g, (m, a, b) => 'jsondotyxpprefixyxp' + (a || '') + (b || ''));
      return p1 + replaceStr + p4;
    });
    stringedJSON = stringedJSON.replace(/(,|^)\s*(\d+)\s*(?=,|$)/g, (m, p1, p2) => p1 + '"jsondotcnprefix' + (p2 || '') + '"');
    stringedJSON = stringedJSON.replace(/([^\\]")\s*:\s*(\[)\s*([-+Ee0-9.]+)\s*(,)?\s*(])?/g, (m, p1, p2, p3, p4, p5) => (p1 || '') + ': ' + (p2 || '') + '"jsondotcnprefix' + (p3 || '') + '"' + (p4 || '') + (p5 || ''));
    stringedJSON = stringedJSON.replace(/(,)\s*([-+Ee0-9.]+)\s*(])\s*/g, (m, p1, p2, p3) => (p1 || '') + '"jsondotcnprefix' + (p2 || '') + '"' + (p3 || ''));
    stringedJSON = stringedJSON.replace(/"([-+Ee0-9.]+)"\s*:\s*/g, (m, p1) => '"jsondotcnprefixyxp' + (p1 || '') + '": ');
    stringedJSON = stringedJSON.replace(/jsondotyxpprefixyxp/g, '');
    try {
      const temp = JSON.parse(stringedJSON, (key, value) => {
        if (typeof value !== "string") return value;
        if (!value.startsWith("jsondotcnprefix")) return value;
        value = value.slice("jsondotcnprefix".length);
        return new BigNumber(value);
      });
      this.data = temp;
    } catch (e) {
      // 回退用原生解析（会丢失大数精度但保证可用）
      this.data = JSON.parse(origin_data);
      console.warn("JSONFormat BigNumber parse fallback", e);
    }
  };
  Cls.prototype.toString = function () { return format(this.data, 1); };
  return Cls;
})();

// ===== Worker + Virtual Scroll =====
let worker = null;
let reqId = 0;
let virtualLines = [];
let virtualEnabled = false;
const ROW_H = 20;
const VIRTUAL_THRESHOLD = 2000; // 超过此行数启用虚拟滚动
const WORKER_THRESHOLD = 500 * 1024; // 超过 500KB 走 Worker
try {
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
} catch (e) { console.warn("Worker not supported, fallback to sync", e); }

function enableVirtual(lines){
  virtualEnabled = true;
  virtualLines = lines;
  jsonTarget.style.display = "none";
  const scroller = document.getElementById("virtualScroller");
  const spacer = document.getElementById("virtualSpacer");
  scroller.style.display = "block";
  spacer.style.height = (lines.length * ROW_H) + "px";
  document.getElementById("jsonFormatContainer").classList.add("virtual-mode");
  scroller.onscroll = renderVirtual;
  renderVirtual();
  setTimeout(renderVirtual, 0);
}
function disableVirtual(){
  virtualEnabled = false;
  virtualLines = [];
  jsonTarget.style.display = "";
  document.getElementById("virtualScroller").style.display = "none";
  document.getElementById("jsonFormatContainer").classList.remove("virtual-mode");
  document.getElementById("virtualScroller").onscroll = null;
}
function renderVirtual(){
  if(!virtualEnabled) return;
  const scroller = document.getElementById("virtualScroller");
  const content = document.getElementById("virtualContent");
  const scrollTop = scroller.scrollTop;
  const viewH = scroller.clientHeight || 400;
  const visible = Math.ceil(viewH / ROW_H) + 10;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 5);
  const end = Math.min(virtualLines.length, start + visible);
  content.style.transform = `translateY(${start * ROW_H}px)`;
  let html = "";
  for(let i=start;i<end;i++) html += `<div class="virtual-row">${virtualLines[i]}</div>`;
  content.innerHTML = html;
  let lineHtml = "";
  for(let i=start;i<end;i++) lineHtml += `<div style="height:${ROW_H}px;line-height:${ROW_H}px">${i+1}</div>`;
  lineNumEl.innerHTML = lineHtml;
  lineNumEl.style.transform = `translateY(${start*ROW_H}px)`;
}

// ===== DOM & State =====
const $ = (s) => document.querySelector(s);
const jsonSrc = $("#json-src");
const jsonTarget = $("#json-target");
const lineNumEl = $("#line-num");
const lineNumbersEl = $("#line-numbers");
const inputHint = $("#inputHint");
const inputStats = $("#inputStats");
const inputError = $("#inputError");
const footerStatus = $("#footerStatus");
const statusDot = $("#statusDot");
const statusText = $("#statusText");
const editableTip = $("#editableTip");
const cancelZY = $("#cancelZY");

let current_json = null;
let current_content = "";
let current_json_str = "";
let xml_flag = false;
let zip_flag = false;
let shown_flag = false;
let compress_flag = false;
let isXml = false;

// ===== Helpers =====
function setStatus(msg, type = "ok") {
  footerStatus.textContent = msg;
  statusText.textContent = type === "error" ? "解析错误" : type === "ok" ? "已格式化" : "就绪";
  statusDot.className = "status-dot" + (type === "error" ? " error" : type === "warn" ? " warn" : "");
}

function countChinese(str) {
  const m = str.match(/[\u4e00-\u9fa5\u3000-\u303f\uff01-\uffee]/g);
  return m ? m.length : 0;
}
function calcMaxWordsWidth(txt) {
  const cn = countChinese(txt);
  return cn * 16 + (txt.length - cn) * 8;
}
function calcMaxWords(txt) {
  let maxW = 0, maxTxt = "";
  for (const line of txt.split("\n")) {
    const w = calcMaxWordsWidth(line);
    if (w > maxW) { maxW = w; maxTxt = line; }
  }
  return Math.ceil(countChinese(maxTxt) * 15 / 8 + (maxTxt.length - countChinese(maxTxt)));
}

function renderLine() {
  const h = jsonTarget.offsetHeight || 0;
  const lines = Math.max(1, Math.ceil(h / 20));
  let html = "";
  for (let i = 1; i <= lines; i++) html += `<div>${i}</div>`;
  lineNumEl.innerHTML = html;

  // 左侧行号
  const srcLines = jsonSrc.value.split("\n").length || 1;
  let leftHtml = "";
  for (let i = 1; i <= srcLines; i++) leftHtml += `<div>${i}</div>`;
  lineNumbersEl.innerHTML = leftHtml;
}

function initFlags() {
  xml_flag = false;
  zip_flag = false;
  compress_flag = false;
  isXml = false;
  document.querySelectorAll(".toolbar .btn-icon").forEach(b => b.classList.remove("active"));
  // 不重置 shown_flag
}

// 核心渲染 - Worker 优先，虚拟滚动兜底
function doParseAndRender() {
  initFlags();
  disableVirtual();
  const raw = jsonSrc.value.trim();
  inputStats.textContent = `${jsonSrc.value.length} 字符 · ${jsonSrc.value.split("\n").length} 行`;
  if (!raw) {
    jsonTarget.innerHTML = "";
    editableTip.style.display = "block";
    inputError.textContent = "";
    setStatus("就绪 | 等待输入", "idle");
    current_content = ""; current_json = null; current_json_str = "";
    renderLine();
    return;
  }
  editableTip.style.display = "none";
  if (shown_flag) jsonSrc.cols = calcMaxWords(raw);
  let content = raw;
  // XML 自动识别
  if (content[0] === "<" && content[content.length - 1] === ">") {
    isXml = true;
    try {
      const j = xml2json(content);
      content = JSON.stringify(j);
    } catch (e) {
      const result = `解析错误：<span style="color:#f1592a;font-weight:bold;">${e.message}</span>`;
      jsonTarget.innerHTML = result;
      inputError.textContent = e.message;
      setStatus("XML 解析失败: " + e.message, "error");
      return;
    }
  }
  let parseContent = content;
  if (cancelZY.checked) {
    parseContent = parseContent.replace(/\\/g, "\\\\").replace(/\\"/g, '\\\\"');
  }
  // 大文件走 Worker + 虚拟滚动
  const useWorker = worker && (parseContent.length > WORKER_THRESHOLD || parseContent.split("\n").length > VIRTUAL_THRESHOLD);
  if (useWorker) {
    reqId++;
    const curId = reqId;
    setStatus("解析中... (Worker)", "warn");
    statusDot.className = "status-dot warn";
    // 超时回退
    const timer = setTimeout(()=>{
      if(reqId===curId && pending!==curId){
        toast("Worker 解析超时，回退同步","warn");
        worker.terminate?.();
        try{ worker = new Worker(new URL("./worker.js", import.meta.url), { type:"module" }); }catch{}
        fallbackSync(parseContent);
      }
    }, 8000);
    worker.onmessage = (e)=>{
      clearTimeout(timer);
      const { id, ok, lines, topCount, error, ms } = e.data;
      if(id !== curId) return;
      pending = id;
      if(ok){
        const useVirtual = lines.length >= VIRTUAL_THRESHOLD;
        if(useVirtual){
          enableVirtual(lines);
          inputError.textContent = "";
          setStatus(`已格式化 · ${lines.length} 行 · ${topCount} 顶级字段 · ${ms}ms (虚拟滚动)`, "ok");
          footerStatus.textContent = `虚拟滚动 · ${lines.length} 行 | ${ms}ms | ${Math.round(parseContent.length/1024)} KB`;
        } else {
          disableVirtual();
          jsonTarget.innerHTML = lines.join("<br/>");
          inputError.textContent = "";
          setStatus(`已格式化 | ${topCount} 顶级字段 · ${ms}ms`, "ok");
          setTimeout(renderLine,0);
        }
        current_content = parseContent;
        current_json_str = parseContent.replace(/[\r\n]/g,"");
        try{ current_json = JSON.parse(parseContent); }catch{ try{ current_json = jsonlint.parse(parseContent);}catch{ current_json=null; } }
      } else {
        disableVirtual();
        jsonTarget.innerHTML = `<span style="color:#f1592a;font-weight:bold;">${error.replace(/</g,"&lt;")}</span>`;
        inputError.textContent = String(error).split("\n")[0].slice(0,120);
        setStatus("解析错误", "error");
      }
    };
    worker.onerror = (e)=>{ clearTimeout(timer); console.error(e); toast("Worker 错误，回退同步","warn"); fallbackSync(parseContent); };
    worker.postMessage({ id: curId, type:"parse", content: parseContent, cancelZY:false }); // cancelZY 已在主线程处理
    return;
  }
  // 小文件同步回退
  fallbackSync(parseContent);
}
function fallbackSync(parseContent){
  let result = "";
  try {
    current_json = jsonlint.parse(parseContent);
    current_json_str = parseContent.replace(/[\r\n]/g, "");
    current_content = parseContent;
    result = new JSONFormat(parseContent).toString();
    inputError.textContent = "";
    setStatus(`已格式化 | ${Object.keys(current_json).length || (Array.isArray(current_json)? current_json.length:1)} 顶级字段`, "ok");
  } catch (e) {
    result = `<span style="color:#f1592a;font-weight:bold;">${String(e).replace(/</g,"&lt;")}</span>`;
    current_json_str = result;
    inputError.textContent = String(e).split("\n")[0].slice(0,120);
    setStatus("解析错误", "error");
  }
  result = result.replace(/&/g, "&amp;").replace(/%yxpnbspyxp;/g, "&nbsp;").replace(/%yxplt;/g, "&lt;").replace(/%yxpgt;/g, "&gt;");
  jsonTarget.innerHTML = result;
  setTimeout(renderLine, 0);
}

// ===== 拖拽 =====
(function initDrag(){
  const dragEle = $("#dragEle");
  const dragParent = $("#dragParent");
  const inputArea = $("#inputArea");
  const formatArea = $("#formatArea");
  let isDragging = false;
  dragEle.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragEle.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const rect = dragParent.getBoundingClientRect();
    const total = rect.width;
    let x = e.clientX - rect.left;
    const min = 260, max = total - 400;
    if (x < min) x = min;
    if (x > max) x = max;
    const leftPct = (x / total * 100).toFixed(2) + "%";
    const rightPct = (100 - x / total * 100).toFixed(2) + "%";
    inputArea.style.width = leftPct;
    formatArea.style.width = rightPct;
  });
  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      dragEle.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      renderLine();
    }
  });
})();

// ===== 事件绑定 =====
jsonSrc.addEventListener("input", doParseAndRender);
jsonSrc.addEventListener("keyup", doParseAndRender);
cancelZY.addEventListener("change", doParseAndRender);

// 右侧可编辑回写
let keyCodePass = true;
$("#jsonFormatArea").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.keyCode === 67) keyCodePass = false;
  else if (e.keyCode >= 37 && e.keyCode <= 40) keyCodePass = false;
  else keyCodePass = true;
});
$("#jsonFormatArea").addEventListener("keyup", () => {
  if (!keyCodePass || xml_flag) return;
  const text = jsonTarget.innerHTML
    .replace(/<br\/>/g, "\n").replace(/<br>/g, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/Object\{...\}/g, "").replace(/Array\[[0-9]+\]/g, "");
  jsonSrc.value = text;
  current_content = text;
  try {
    current_json = jsonlint.parse(current_content);
    current_json_str = JSON.stringify(current_json).replace(/[\r\n]/g, "");
    if (shown_flag) jsonSrc.cols = calcMaxWords(current_content);
    else jsonSrc.cols = "";
  } catch {}
  setTimeout(renderLine, 0);
});

// 折叠 - 支持 ⊖⊕ 字符与旧图标兼容
jsonTarget.addEventListener("click", (e) => {
  const t = e.target;
  const isCollapse = t.classList.contains("fold-btn") && t.getAttribute("data-fold")==="collapse" || t.classList.contains("ti-square-rounded-minus");
  const isExpand = t.classList.contains("fold-btn") && t.getAttribute("data-fold")==="expand" || t.classList.contains("ti-square-rounded-plus") || (t.parentElement && t.parentElement.classList.contains("custom-plus"));
  if (isCollapse) {
    const parent = t.parentElement;
    const type = parent.getAttribute("data-type");
    const size = parent.getAttribute("data-size");
    parent.style.display = "none";
    const span = document.createElement("span");
    span.className = "custom-plus";
    if (type === "array") span.innerHTML = `<span class="fold-btn" data-fold="expand" title="展开">⊕</span>Array[<span class="json_number">${size}</span>]`;
    else span.innerHTML = `<span class="fold-btn" data-fold="expand" title="展开">⊕</span>Object{...}`;
    parent.before(span);
  } else if (t.classList.contains("ti-square-rounded-plus") || (t.classList.contains("fold-btn") && t.getAttribute("data-fold")==="expand")) {
    // 点击 ⊕ 时，plus 的父级是 custom-plus
    let plus = t;
    if (t.classList.contains("fold-btn")) plus = t.parentElement;
    else plus = t.parentElement;
    // 兼容直接点 custom-plus 区域
    if (plus.classList.contains("custom-plus")) {
      const next = plus.nextElementSibling;
      if (next) next.style.display = "";
      plus.remove();
    } else {
      // 旧逻辑
      const p = t.parentElement;
      const next = p.nextElementSibling;
      if (next) next.style.display = "";
      // 找到 custom-plus
      let cp = t.closest(".custom-plus");
      if (cp) cp.remove(); else p.remove();
    }
  } else if (t.classList.contains("custom-plus")) {
    const next = t.nextElementSibling;
    if (next) next.style.display = "";
    t.remove();
  }
});

// 工具栏按钮
$("#btnZip").addEventListener("click", function(){
  if (!current_content) return;
  xml_flag = false; compress_flag = false;
  document.querySelectorAll(".toolbar .btn-icon").forEach(b=>b.classList.remove("active"));
  if (zip_flag) {
    doParseAndRender();
    this.classList.remove("active");
    zip_flag = false;
    this.title = "压缩";
  } else {
    let s = current_json_str;
    s = s.replace(/(")\s*((\\"|[^"])*)\s*(")/g, (m,p1,p2,p3,p4)=> p1 + p2.replace(/\s/g,'yxpnbsp') + p4);
    s = s.replace(/\s/g,'').replace(/yxpnbsp/g,' ').replace(/\\\\/g,'\\');
    jsonTarget.innerHTML = `<xmp class="mt-0" style="white-space:pre-wrap;word-break:break-all;margin:0;">${s.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</xmp>`;
    zip_flag = true;
    this.classList.add("active");
    this.title = "格式化";
  }
});

$("#btnXml").addEventListener("click", function(){
  zip_flag=false; compress_flag=false;
  if (xml_flag) {
    doParseAndRender();
    this.classList.remove("active");
    xml_flag = false;
    this.title = "转XML";
  } else {
    if (!current_content) return;
    try {
      const result = json2xml(current_json || JSON.parse(current_content));
      const cls = shown_flag ? 'xml-textarea text-nowrap w-auto' : 'xml-textarea';
      const cols = shown_flag ? `cols="${calcMaxWords(result)}"` : '';
      jsonTarget.innerHTML = `<textarea class="${cls}" id="autosize-demo" ${cols}>${result.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</textarea>`;
      xml_flag = true;
      this.classList.add("active");
      this.title = "转JSON";
      setTimeout(renderLine,0);
    } catch(e){ toast("转XML失败: "+e.message,"error"); }
  }
});

$("#btnShown").addEventListener("click", function(){
  const lineNumContainer = $("#lineNumContainer");
  const lineGap = $("#jsonTxtAreaGap");
  const formatContainer = $("#jsonFormatContainer");
  if (!shown_flag) {
    shown_flag = true;
    lineNumContainer.style.display = "flex";
    lineGap.style.display = "flex";
    formatContainer.classList.add("ps-2");
    this.classList.add("active");
    jsonTarget.classList.add("text-nowrap");
    jsonSrc.classList.add("text-nowrap");
    jsonSrc.cols = calcMaxWords(current_content || jsonSrc.value);
    if (xml_flag) {
      const ta = document.getElementById("autosize-demo");
      if (ta) { ta.classList.add("text-nowrap","w-auto"); ta.cols = calcMaxWords(ta.value); }
    }
    this.title = "隐藏行号";
  } else {
    shown_flag = false;
    lineNumContainer.style.display = "none";
    lineGap.style.display = "none";
    formatContainer.classList.remove("ps-2");
    this.classList.remove("active");
    jsonTarget.classList.remove("text-nowrap");
    jsonSrc.classList.remove("text-nowrap");
    jsonSrc.cols = "";
    if (xml_flag) {
      const ta = document.getElementById("autosize-demo");
      if (ta) ta.classList.remove("text-nowrap","w-auto");
    }
    this.title = "显示行号";
  }
  renderLine();
});

$("#btnClear").addEventListener("click", ()=>{
  current_content=""; current_json=null; current_json_str="";
  jsonSrc.value=""; jsonSrc.cols="";
  jsonTarget.innerHTML=""; lineNumEl.innerHTML="<div>1</div>"; lineNumbersEl.innerHTML="<div>1</div>";
  editableTip.style.display="block";
  inputStats.textContent="0 字符"; inputError.textContent="";
  setStatus("已清空","idle");
  initFlags(); shown_flag=false;
  $("#lineNumContainer").style.display="none";
  $("#jsonTxtAreaGap").style.display="none";
});

$("#btnSave").addEventListener("click", async ()=>{
  const text = jsonTarget.innerText || jsonSrc.value;
  if (!text) return toast("没有可保存的内容","warn");
  // Tauri 优先
  if (window.__TAURI__) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({ defaultPath: `format.${Date.now()}.json`, filters: [{ name:"JSON", extensions:["json"] },{ name:"All", extensions:["*"] }] });
      if (path) { await writeTextFile(path, text); toast("已保存: "+path,"success"); }
      return;
    } catch(e){ console.warn(e); }
  }
  // 浏览器回退
  const blob = new Blob([text], {type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `format.${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
  toast("已下载","success");
});

$("#btnCopy").addEventListener("click", async ()=>{
  // 先展开全部再复制
  jsonTarget.querySelectorAll('.fold-btn[data-fold="expand"], .ti-square-rounded-plus').forEach(el=>el.click());
  // 也处理遗留 custom-plus
  jsonTarget.querySelectorAll(".custom-plus").forEach(el=>{ const n=el.nextElementSibling; if(n) n.style.display=""; el.remove(); });
  compress_flag=false;
  const text = jsonTarget.innerText || jsonSrc.value;
  if (!text) return;
  try { await navigator.clipboard.writeText(text); toast("已复制到剪贴板","success"); }
  catch { 
    const ta = document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast("已复制","success");
  }
});

$("#btnCompress").addEventListener("click", function(){
  if (xml_flag || zip_flag || !current_content) return;
  if (!compress_flag) {
    this.classList.add("active");
    // 折叠全部（从最深层开始）
    const arr = Array.from(jsonTarget.querySelectorAll('.fold-btn[data-fold="collapse"], .ti-square-rounded-minus')).reverse();
    arr.forEach(el=>el.click());
    compress_flag=true;
    this.title="展开";
  } else {
    jsonTarget.querySelectorAll('.fold-btn[data-fold="expand"], .ti-square-rounded-plus').forEach(el=>el.click());
    jsonTarget.querySelectorAll(".custom-plus").forEach(el=>{ const n=el.nextElementSibling; if(n) n.style.display=""; el.remove(); });
    compress_flag=false;
    this.classList.remove("active");
    this.title="折叠";
  }
});

$("#btnExample").addEventListener("click", ()=>{
  jsonSrc.value = '{"title":"JSON在线解析","json.url":"https://www.json.cn","keywords":"JSON在线解析","Function":["JSON美化","JSON数据类型显示","JSON数组显示角标","高亮显示","错误提示","\\u003e","&nbsp;","\\\\","<h1>JSON在线解析</h1>",{"备注":["www.json.cn","json.cn"]}],"About":{"QQ":661275469},"Special":["&currency","&timestamp","&region","&params","&lt;&lt;sane&gt;&gt;","gbk -> utf-8"],"numbers":[305667554401374209,103248655202358790,123456789012345679,987654321098765432,246813579246813579,135792468013579246,864209864209864209],"id2":22022621134265013,"BigNumber":71357798191653192098,"content":"永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭，修禊事也。"}';
  doParseAndRender();
  toast("已加载示例","success");
});

$("#btnFullscreen").addEventListener("click", ()=>{
  document.documentElement.classList.toggle("format-fullscreen");
  const isFs = document.documentElement.classList.contains("format-fullscreen");
  $("#btnFullscreen").innerHTML = isFs ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 8l-4 0l0 -4"/><path d="M16 8l4 0l0 -4"/><path d="M8 16l-4 0l0 4"/><path d="M16 16l4 0l0 4"/></svg><span>退出全屏</span>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4l4 0l0 4"/><path d="M14 10l6 -6"/><path d="M8 20l-4 0l0 -4"/><path d="M10 14l-6 6"/></svg><span>全屏</span>';
  setTimeout(renderLine, 50);
});
document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape" && document.documentElement.classList.contains("format-fullscreen")) {
    document.documentElement.classList.remove("format-fullscreen");
    $("#btnFullscreen").innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4l4 0l0 4"/><path d="M14 10l6 -6"/><path d="M8 20l-4 0l0 -4"/><path d="M10 14l-6 6"/></svg><span>全屏</span>';
  }
  if ((e.ctrlKey||e.metaKey) && e.key === "s") { e.preventDefault(); $("#btnSave").click(); }
  if ((e.ctrlKey||e.metaKey) && e.key === "o") { e.preventDefault(); $("#btnOpen").click(); }
  if (e.key === "F11") { e.preventDefault(); $("#btnFullscreen").click(); }
});

// 打开文件 (Tauri dialog + 浏览器 input 回退)
$("#btnOpen").addEventListener("click", async ()=>{
  if (window.__TAURI__) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const selected = await open({ multiple:false, filters:[{ name:"JSON", extensions:["json","txt","xml"] }] });
      if (selected) {
        const content = await readTextFile(selected);
        jsonSrc.value = content;
        doParseAndRender();
        toast("已打开: "+selected,"success");
        return;
      }
    } catch(e){ console.warn(e); }
  }
  // 浏览器回退
  const input = document.createElement("input");
  input.type="file"; input.accept=".json,.txt,.xml,.js";
  input.onchange = async()=>{
    const file = input.files[0]; if(!file) return;
    const text = await file.text();
    jsonSrc.value = text;
    doParseAndRender();
    toast("已打开: "+file.name,"success");
  };
  input.click();
});

// 拖拽文件到输入区
["dragenter","dragover"].forEach(ev=>{
  jsonSrc.addEventListener(ev, e=>{ e.preventDefault(); jsonSrc.style.background="var(--drag-hover)"; });
});
["dragleave","drop"].forEach(ev=>{
  jsonSrc.addEventListener(ev, e=>{ e.preventDefault(); jsonSrc.style.background=""; });
});
jsonSrc.addEventListener("drop", async (e)=>{
  const file = e.dataTransfer.files[0];
  if (!file) {
    const text = e.dataTransfer.getData("text");
    if (text) { jsonSrc.value = text; doParseAndRender(); }
    return;
  }
  // Tauri 环境可读路径，浏览器直接读
  try {
    const text = await file.text();
    jsonSrc.value = text;
    doParseAndRender();
    toast("已加载: "+file.name,"success");
  } catch(err){ toast("读取失败","error"); }
});

// 滚动同步
$("#jsonTxtAreaContainer").addEventListener("scroll", ()=>{
  if (!shown_flag) return;
  const st = $("#jsonTxtAreaContainer").scrollTop;
  lineNumbersEl.style.transform = `translateY(-${st}px)`;
});
$("#jsonFormatContainer").addEventListener("scroll", ()=>{
  if (!shown_flag) return;
  const st = $("#jsonFormatContainer").scrollTop;
  lineNumEl.style.transform = `translateY(-${st}px)`;
});

// ===== 设置弹窗 =====
const settingsModal = document.getElementById("settingsModal");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const settingsClose = document.getElementById("settingsClose");
const settingsConfirm = document.getElementById("settingsConfirm");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
function openSettings(){
  settingsModal.style.display = "flex";
  // 同步当前值
  const fs = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--_fontSize") || 13);
  if (fontSizeRange) { fontSizeRange.value = String(fs || 13); fontSizeValue.textContent = (fs||13)+"px"; }
}
function closeSettings(){ settingsModal.style.display = "none"; }
document.getElementById("btnSettings").addEventListener("click", openSettings);
settingsBackdrop.addEventListener("click", closeSettings);
settingsClose.addEventListener("click", closeSettings);
settingsConfirm.addEventListener("click", closeSettings);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && settingsModal.style.display!=="none") closeSettings(); });
// 主题切换
document.querySelectorAll('input[name="theme"]').forEach(r=>{
  r.addEventListener("change", ()=>{
    const v = document.querySelector('input[name="theme"]:checked').value;
    localStorage.setItem("jsoncn-theme", v);
    applyTheme(v);
  });
});
function applyTheme(v){
  if(v==="light") document.documentElement.setAttribute("data-theme","light");
  else if(v==="dark") document.documentElement.setAttribute("data-theme","dark");
  else document.documentElement.removeAttribute("data-theme");
  // 兼容 style.css 的 :root 媒体查询，显式设置时覆盖
  if(v==="light") document.documentElement.style.colorScheme="light";
  else if(v==="dark") document.documentElement.style.colorScheme="dark";
  else document.documentElement.style.colorScheme="";
}
// 字体大小
if(fontSizeRange){
  fontSizeRange.addEventListener("input", ()=>{
    const v = fontSizeRange.value;
    fontSizeValue.textContent = v+"px";
    document.documentElement.style.setProperty("--_fontSize", v+"px");
    document.querySelectorAll(".json-src, .json-target, .line-num, .textarea-lines, .xml-textarea").forEach(el=>{
      el.style.fontSize = v+"px";
    });
    localStorage.setItem("jsoncn-fontSize", v);
  });
}
// 初始化设置
(function initSettings(){
  const t = localStorage.getItem("jsoncn-theme") || "system";
  const el = document.querySelector(`input[name="theme"][value="${t}"]`);
  if(el) el.checked = true;
  applyTheme(t);
  const fs = localStorage.getItem("jsoncn-fontSize");
  if(fs){
    document.documentElement.style.setProperty("--_fontSize", fs+"px");
    document.querySelectorAll(".json-src, .json-target").forEach(el=>el.style.fontSize=fs+"px");
    if(fontSizeRange){ fontSizeRange.value=fs; fontSizeValue.textContent=fs+"px"; }
  }
  const keep = localStorage.getItem("jsoncn-keepEscape");
  if(keep!==null) {
    const chk = document.getElementById("settingKeepEscape");
    const mainChk = document.getElementById("cancelZY");
    if(chk) chk.checked = keep==="1";
    if(mainChk) mainChk.checked = keep==="1";
  }
  document.getElementById("settingKeepEscape")?.addEventListener("change", (e)=>{
    localStorage.setItem("jsoncn-keepEscape", e.target.checked?"1":"0");
    document.getElementById("cancelZY").checked = e.target.checked;
    doParseAndRender();
  });
  document.getElementById("cancelZY")?.addEventListener("change", (e)=>{
    localStorage.setItem("jsoncn-keepEscape", e.target.checked?"1":"0");
    const sc = document.getElementById("settingKeepEscape");
    if(sc) sc.checked = e.target.checked;
  });
})();

// 初始化
renderLine();
setStatus("就绪 | 等待输入","idle");

// Tauri 启动参数 - 文件关联
if (window.__TAURI__) {
  import("@tauri-apps/api/event").then(({ listen })=>{
    listen("tauri://open-file", (e)=>{ if(e.payload) { jsonSrc.value = e.payload; doParseAndRender(); }});
  }).catch(()=>{});
  // 检查启动时文件路径通过 window.__TAURI_INVOKE__? 简化：监听 deep link
}

// 对外暴露用于调试
window._JSONFormat = JSONFormat;
window._doParse = doParseAndRender;
