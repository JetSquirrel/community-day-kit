/**
 * 材料页 HTML。规范先于上传框出现；照片在浏览器里按 4:5 框选并导出统一尺寸 JPEG；
 * 每个文件上传后立即显示「程序检查 + AI 预审」报告，讲者可反复替换，最后统一提交。
 * 零前端依赖，单文件内联，手机可用。
 */
import { t, type EventConfig } from '@cdkit/core';

export interface PageCtx {
  name: string;
  talk: string;
  track: string;
  minutes: number;
  status: string;
  level: string;
  photo: string;
  deck: string;
  deckFinal: string;
  logo: string;
  reviews: Record<string, string>;
}

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function css(ev: EventConfig) {
  const c = ev.theme.colors;
  return `:root{--bg:${c.bg};--ink:${c.ink};--pri:${c.primary};--ok:#1a9d55;--warn:#c98a00;--err:#d93025}
*{box-sizing:border-box}body{margin:0;background:#f4f4f2;color:var(--ink);font:15px/1.65 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
header{background:var(--bg);border-bottom:4px solid var(--ink);padding:18px 16px}header b{font-size:18px}header div{font-size:13px}
main{max-width:760px;margin:0 auto;padding:16px}section{background:#fff;border:2px solid var(--ink);margin:16px 0;padding:18px}
h2{margin:0 0 8px;font-size:18px}h3{margin:14px 0 6px;font-size:15px}ul{padding-left:20px;margin:6px 0}small,.muted{color:#666}
.rules{background:#fafaf5;border-left:4px solid var(--pri);padding:8px 12px;margin:8px 0}
button,.btn{background:var(--ink);color:var(--bg);border:0;padding:10px 18px;font-weight:700;cursor:pointer;font-size:15px}
button.ghost{background:#fff;color:var(--ink);border:2px solid var(--ink)}button:disabled{opacity:.4;cursor:default}
.crop{display:none;gap:16px;flex-wrap:wrap;align-items:flex-start;margin-top:10px}.crop.on{display:flex}
canvas{touch-action:none;border:2px solid var(--ink);background:#ddd;max-width:100%}
.badge{display:inline-block;padding:2px 10px;font-weight:700;color:#fff}.pass,.ready{background:var(--ok)}.fix,.minor,.warn{background:var(--warn)}.reject,.major,.fail,.error{background:var(--err)}
.report{margin-top:10px;border-top:1px dashed #bbb;padding-top:8px}.report li{margin:4px 0}
table{border-collapse:collapse;width:100%;font-size:14px}td{border-top:1px solid #eee;padding:6px 4px;vertical-align:top}
.status{font-size:13px;padding:6px 10px;background:#fafaf5;border:1px solid #ddd;margin:8px 0}
.spin{display:inline-block;width:14px;height:14px;border:2px solid #999;border-top-color:transparent;border-radius:50%;animation:s 1s linear infinite;vertical-align:-2px}@keyframes s{to{transform:rotate(360deg)}}
select{font-size:15px;padding:6px}`;
}

export function renderError(ev: EventConfig, title: string, detail: string): string {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css(ev)}</style></head>
<body><header><b>${esc(t(ev.name))}</b></header><main><section><h2>${esc(title)}</h2><p>${esc(detail)}</p><p class="muted">${esc(ev.contactEmail)}</p></section></main></body></html>`;
}

export function renderPage(ev: EventConfig, who: 'speaker' | 'sponsor', c: PageCtx): string {
  const p = ev.materials.photo;
  const d = ev.materials.deck;
  const maxSlides = Math.ceil(c.minutes * d.maxSlidesPerMinute);
  const cfg = {
    who,
    photo: { aspect: p.aspect, minWidth: p.minWidth, minHeight: p.minHeight, maxBytes: p.maxBytes, formats: p.formats },
    deck: { maxBytes: d.maxBytes, formats: d.formats },
    has: { photo: !!c.photo, deck: !!c.deck, deckFinal: !!c.deckFinal, logo: !!c.logo },
  };
  const speaker = `
<section>
  <h2>${esc(c.name)}，你好 👋</h2>
  <p>议题：<b>${esc(c.talk)}</b><br><small>${esc(c.track)} · ${c.minutes} 分钟</small></p>
  ${c.status === '已通知' ? `<div class="status">提交材料即视为<b>确认出席</b>（请在 ${ev.deadlines.speakerConfirm} 前完成）。Submitting materials confirms your attendance.</div>` : `<div class="status">当前状态：${esc(c.status)}</div>`}
  <p class="muted">以下每一项都可以多次上传替换，确认无误后点页面底部「提交」。</p>
</section>

<section id="sec-photo">
  <h2>① 个人照片 <small>Photo · 用于嘉宾海报</small></h2>
  <div class="rules"><b>上传前请先看要求：</b><ul>${p.guidelines.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
  ${c.photo ? `<p>✅ 已有照片：<a href="${esc(c.photo)}" target="_blank">查看</a>（重新上传将替换）</p>` : ''}
  <input type="file" id="photoFile" accept="image/jpeg,image/png,image/webp">
  <div class="crop" id="crop">
    <div><canvas id="cv" width="320" height="400"></canvas><br>
      <label>缩放 <input type="range" id="zoom" min="1" max="3" step="0.01" value="1"></label><br>
      <small>拖动图片调整位置：头顶贴近虚线，脸在椭圆内</small></div>
    <div><p id="cropInfo" class="muted"></p><button id="photoUp">使用这个裁剪并上传</button></div>
  </div>
  <div id="photoReport" class="report" hidden></div>
</section>

<section id="sec-deck">
  <h2>② 演讲 PPT <small>Slides</small></h2>
  <div class="rules"><b>PPT 规范（AI 会逐条预审）：</b><ul>${d.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  <small>本场 ${c.minutes} 分钟，建议不超过 ${maxSlides} 页 · 支持 ${d.formats.join(' / ')}，≤${Math.round(d.maxBytes / 1048576)}MB</small>
  ${d.templateUrl ? `<br><a href="${esc(d.templateUrl)}" target="_blank">⬇ 下载官方模板</a>` : ''}</div>
  <h3>初稿（${ev.deadlines.deckDraft} 前）${c.deck ? ' ✅ 已提交' : ''}</h3>
  <input type="file" id="deckFile" accept=".pptx,.pdf,.key"><div id="deckReport" class="report" hidden></div>
  <h3>终稿（${ev.deadlines.deckFinal} 前）${c.deckFinal ? ' ✅ 已提交' : ''}</h3>
  <input type="file" id="deckFinalFile" accept=".pptx,.pdf,.key"><div id="deckFinalReport" class="report" hidden></div>
  ${c.reviews.deck ? `<details><summary>上次预审结果</summary><pre style="white-space:pre-wrap">${esc(c.reviews.deck)}</pre></details>` : ''}
</section>

<section>
  <h2>③ 难度等级与提交</h2>
  <label>议题难度：<select id="level"><option value="">请选择</option>${['100', '200', '300', '400'].map((l) => `<option ${c.level.startsWith(l) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <small class="muted">100 入门 · 200 介绍 · 300 进阶 · 400 专家</small>
  <p><button id="submit">提交 Submit</button> <span id="submitMsg"></span></p>
  ${['已通知', '已确认'].includes(c.status) ? '<p><button class="ghost" id="decline">无法出席</button></p>' : ''}
</section>`;

  const sponsor = `
<section>
  <h2>${esc(c.name)}，感谢支持 ${esc(t(ev.name))}</h2>
  <div class="rules"><b>Logo 要求：</b><ul>
    <li>优先提供矢量源文件：SVG / AI / EPS / PDF（印刷物料需要）</li>
    <li>如只有位图：透明背景 PNG，宽度 ≥ 2000px</li>
    <li>如有横版 / 竖版 / 反白版本，请打包后分别上传最常用的一版并在群内补充</li>
  </ul></div>
  ${c.logo ? `<p>✅ 已提交：<a href="${esc(c.logo)}" target="_blank">查看</a></p>` : ''}
  <input type="file" id="logoFile" accept=".svg,.ai,.eps,.pdf,.png"><div id="logoReport" class="report" hidden></div>
  <p><button id="submit">提交</button> <span id="submitMsg"></span></p>
</section>`;

  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${who === 'speaker' ? '讲者材料' : '合作伙伴材料'} · ${esc(t(ev.name))}</title><style>${css(ev)}</style></head>
<body><header><b>${esc(t(ev.name))}</b><div>${esc(t(ev.slogan))} · ${ev.date} · ${esc(t(ev.city))}</div></header>
<main>${who === 'speaker' ? speaker : sponsor}<p class="muted" style="text-align:center">遇到问题？${esc(ev.contactEmail)}</p></main>
<script>const CFG=${JSON.stringify(cfg).replace(/</g, '\\u003c')};${CLIENT_JS}</script></body></html>`;
}

/** 客户端脚本（ES2019，无依赖） */
const CLIENT_JS = String.raw`
const $=s=>document.querySelector(s);
const q=location.search;
const keys={};
async function api(path,body){const r=await fetch(location.pathname.replace(/\/$/,'')+path+q,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({error:'网络错误'}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
async function upload(kind,blob,filename,box){
  box.hidden=false;box.innerHTML='<span class="spin"></span> 上传中…';
  const p=await api('/presign',{kind,contentType:blob.type||'application/octet-stream',size:blob.size,filename});
  const put=await fetch(p.url,{method:'PUT',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});
  if(!put.ok)throw new Error('上传失败（'+put.status+'），请重试');
  box.innerHTML='<span class="spin"></span> '+(kind==='photo'?'AI 正在检查照片，约 5–10 秒…':kind==='logo'?'检查中…':'程序检查 + AI 逐页预审中，约 30–90 秒，请勿关闭页面…');
  const r=await api('/review',{kind,key:p.key});
  renderReport(box,r);
  if(r.ok)keys[kind]=p.key;else delete keys[kind];
}
const LV={error:'✗',warn:'⚠',info:'ℹ'};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function renderReport(box,r){
  const ai=r.ai;let h='';
  const verdict=ai?ai.verdict:(r.ok?'pass':'reject');
  const label={pass:'可以使用',fix:'建议更换',reject:'无法使用',ready:'可以上台',minor:'小修即可',major:'需要较大修改'}[verdict]||verdict;
  h+='<p><span class="badge '+verdict+'">'+label+'</span> '+(r.ok?'':'<b>请按以下提示修改后重新上传</b>')+'</p>';
  if(r.findings.length)h+='<ul>'+r.findings.map(f=>'<li>'+(LV[f.level]||'')+' '+esc(f.rule||'')+(f.rule?'：':'')+esc(f.message)+(f.slides?' <small>（第 '+f.slides.join(', ')+' 页）</small>':'')+'</li>').join('')+'</ul>';
  if(ai&&ai.message)h+='<p>'+esc(ai.message)+'</p>';
  if(ai&&ai.checks)h+='<ul>'+ai.checks.map(c=>'<li>'+(c.ok?'✅':'⚠')+' '+esc(c.rule)+(c.ok?'':'<br><small>'+esc(c.note)+'</small>')+'</li>').join('')+'</ul>';
  if(ai&&ai.summary)h+='<p><b>AI 总评：</b>'+esc(ai.summary)+'</p>';
  if(ai&&ai.items)h+='<table>'+ai.items.map(i=>'<tr><td><span class="badge '+i.status+'">'+i.status+'</span></td><td><b>'+esc(i.rule)+'</b>'+(i.slides.length?' <small>P'+i.slides.join(',')+'</small>':'')+'<br>'+esc(i.comment)+(i.suggestion?'<br><small>👉 '+esc(i.suggestion)+'</small>':'')+'</td></tr>').join('')+'</table>';
  if(r.aiNote)h+='<p class="muted">'+esc(r.aiNote)+'</p>';
  h+='<p class="muted">AI 意见仅供参考，可直接提交，组委会会再看一遍。</p>';
  box.innerHTML=h;
}
function fail(box,e){box.hidden=false;box.innerHTML='<p style="color:var(--err)">✗ '+esc(e.message)+'</p>'}

// ——— 照片裁剪 ———
(function(){
  const file=$('#photoFile');if(!file)return;
  const cv=$('#cv'),ctx=cv.getContext('2d'),zoom=$('#zoom'),info=$('#cropInfo'),box=$('#photoReport');
  const P=CFG.photo,A=P.aspect[0]/P.aspect[1];
  let img=null,base=0,s=1,x=0,y=0,drag=null;
  const cw=()=>base/s, ch=()=>base/s/A;
  function clamp(){x=Math.max(0,Math.min(img.naturalWidth-cw(),x));y=Math.max(0,Math.min(img.naturalHeight-ch(),y))}
  function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(img,x,y,cw(),ch(),0,0,cv.width,cv.height);
    ctx.setLineDash([6,6]);ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,cv.height*.08);ctx.lineTo(cv.width,cv.height*.08);ctx.stroke();
    ctx.beginPath();ctx.ellipse(cv.width/2,cv.height*.36,cv.width*.22,cv.height*.2,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    const outW=Math.round(cw());
    info.innerHTML='裁剪区域 '+outW+'×'+Math.round(ch())+' 像素'+(outW<P.minWidth?'<br><b style="color:var(--err)">放得太大了，清晰度不足（至少 '+P.minWidth+' 宽），请缩小</b>':'<br>✓ 清晰度满足要求');
    $('#photoUp').disabled=outW<P.minWidth;
  }
  file.onchange=()=>{
    const f=file.files[0];if(!f)return;box.hidden=true;
    if(!P.formats.includes(f.type)){fail(box,new Error('格式不支持（'+(f.type||'未知')+'）。iPhone 照片请在「设置 → 相机 → 格式」选「兼容性最佳」，或先转成 JPG'));return}
    const im=new Image();im.onload=()=>{
      base=Math.min(im.naturalWidth,im.naturalHeight*A);
      if(base<P.minWidth){fail(box,new Error('原图分辨率 '+im.naturalWidth+'×'+im.naturalHeight+' 过低，竖版裁剪后不足 '+P.minWidth+'×'+P.minHeight+'。请上传原图，不要截图或聊天软件里保存的图'));return}
      img=im;s=1;zoom.value=1;zoom.max=Math.max(1,base/P.minWidth).toFixed(2);
      x=(im.naturalWidth-cw())/2;y=Math.max(0,im.naturalHeight*.35-ch()*.4);clamp();
      $('#crop').classList.add('on');draw();
    };im.src=URL.createObjectURL(f);
  };
  zoom.oninput=()=>{const cx=x+cw()/2,cy=y+ch()/2;s=+zoom.value;x=cx-cw()/2;y=cy-ch()/2;clamp();draw()};
  cv.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId)};
  cv.onpointermove=e=>{if(!drag||!img)return;const k=cw()/cv.getBoundingClientRect().width;x-=(e.clientX-drag.x)*k;y-=(e.clientY-drag.y)*k;drag={x:e.clientX,y:e.clientY};clamp();draw()};
  cv.onpointerup=()=>drag=null;
  $('#photoUp').onclick=async()=>{
    const w=Math.min(1600,Math.max(P.minWidth,Math.round(cw()))),h=Math.round(w/A);
    const out=document.createElement('canvas');out.width=w;out.height=h;
    out.getContext('2d').drawImage(img,x,y,cw(),ch(),0,0,w,h);
    out.toBlob(async b=>{try{await upload('photo',b,'photo.jpg',box)}catch(e){fail(box,e)}},'image/jpeg',0.92);
  };
})();

// ——— PPT / Logo ———
function bindFile(id,kind,boxId,maxBytes){
  const el=$(id);if(!el)return;const box=$(boxId);
  el.onchange=async()=>{const f=el.files[0];if(!f)return;
    if(maxBytes&&f.size>maxBytes){fail(box,new Error('文件超过 '+Math.round(maxBytes/1048576)+'MB，请压缩图片或导出 PDF'));return}
    try{await upload(kind,f,f.name,box)}catch(e){fail(box,e)}};
}
bindFile('#deckFile','deck','#deckReport',CFG.deck.maxBytes);
bindFile('#deckFinalFile','deckFinal','#deckFinalReport',CFG.deck.maxBytes);
bindFile('#logoFile','logo','#logoReport',30*1048576);

const sb=$('#submit');if(sb)sb.onclick=async()=>{
  const msg=$('#submitMsg');
  if(CFG.who==='speaker'&&!keys.photo&&!CFG.has.photo){msg.textContent='请先上传照片';return}
  if(CFG.who==='speaker'&&!$('#level').value){msg.textContent='请选择难度等级';return}
  sb.disabled=true;msg.innerHTML='<span class="spin"></span>';
  try{await api('/submit',{level:$('#level')&&$('#level').value,photoKey:keys.photo,deckKey:keys.deck,deckFinalKey:keys.deckFinal,logoKey:keys.logo});msg.textContent='✅ 已提交，感谢！可随时回到此页面更新';}
  catch(e){msg.textContent='✗ '+e.message}finally{sb.disabled=false}
};
const dc=$('#decline');if(dc)dc.onclick=async()=>{if(!confirm('确定无法出席吗？席位将释放给候补讲者。'))return;try{await api('/decline');dc.outerHTML='<p>已登记。感谢告知，期待下次相见！</p>'}catch(e){alert(e.message)}};
`;
