/* Глифомат — интерфейс: панель параметров, слои, пресеты, экспорт. */
(function(){
"use strict";
var DEF={quality:480,aspect:"original",bg:"#000000",style:"classic",font:"Helvetica Neue",charset:"standard",customChars:" .:-=+*#%@",dither:"floyd",
  brightness:0,contrast:1,ditherStrength:0.8,bgDither:0,invDither:0,vignette:0,fontSize:10,spacing:1,opacity:1,glow:0,
  colorMode:"gray",invert:false,customColor:"#00ff99",hue:156,
  fx:"noise",fxStrength:0.45,dir:"E",noiseScale:24,noiseSpeed:1,intSpacing:12,intSpeed:1,intWidth:2,matScale:15,matSpeed:1,
  mouse:"attract",hover:24,area:180,spread:1,
  brailleDensity:"standard",htShape:"circle",htSize:1,htRot:0,lineLen:1,lineWidth:1,lineThick:1.6,lineRot:0,partChar:"*",partDensity:0.5,
  retroPalette:"amber",retroNoise:0.45,termSet:"binary",transparent:false,layers:[]};
var LDEF={type:"starfield",affects:"sep",place:"behind",intensity:0.45,spread:0.25,pulse:1,mouseInf:0.5,grain:0.02,color:"#9cc4ff"};
var LTYPES=[["lightning","Lightning Rails"],["folds","Atmospheric Folds"],["dome","Network Dome"],["starfield","Ambient Starfield"],["terrain","Terrain Mesh"],["topo","Topology Dots"],["burst","Radial Burst"]];
var LNAME={};LTYPES.forEach(function(x){LNAME[x[0]]=x[1];});
var MAXL=3,tab="ascii";
function normLayers(){S.layers=(Array.isArray(S.layers)?S.layers:[]).slice(0,MAXL).map(function(l){var o=Object.assign({},LDEF,l);if(!LNAME[o.type])o.type=LDEF.type;return o;});}
var S=Object.assign({},DEF);
try{var saved=JSON.parse(localStorage.getItem("glifomat:state")||"null");if(saved&&typeof saved==="object")Object.assign(S,saved);}catch(e){}
S.transparent=false;

var cv=document.getElementById("cv"),wrap=document.getElementById("wrap");
var R=Glyphomat.create(cv);
var mouse={x:0,y:0,on:false};
var source=makeSample(),sourceKind="demo",srcLabel="Демо-сцена",stream=null;
var paused=false,tAcc=0,prev=performance.now(),lastInfo={cols:0,rows:0},fpsVal=0,fpsN=0,fpsT=performance.now();
var DL=null;
try{if(window.claude&&window.claude.use)window.claude.use("downloads").then(function(d){DL=d;}).catch(function(){});}catch(e){}

/* demo scene */
function makeSample(){
  var c=document.createElement("canvas");c.width=1200;c.height=800;var g=c.getContext("2d");
  g.fillStyle="#000";g.fillRect(0,0,1200,800);
  var gr=g.createLinearGradient(0,470,0,800);gr.addColorStop(0,"#000");gr.addColorStop(1,"#4a4a56");g.fillStyle=gr;g.fillRect(0,470,1200,330);
  function ring(a0,a1){g.save();g.translate(600,420);g.rotate(-0.32);g.scale(1,0.27);g.lineWidth=46;var rg=g.createLinearGradient(-470,0,470,0);rg.addColorStop(0,"#1d1d2a");rg.addColorStop(.55,"#f4efe6");rg.addColorStop(1,"#2b2b38");g.strokeStyle=rg;g.beginPath();g.arc(0,0,450,a0,a1);g.stroke();g.restore();}
  ring(Math.PI,Math.PI*2);
  gr=g.createRadialGradient(520,300,20,600,400,290);gr.addColorStop(0,"#fff6e6");gr.addColorStop(.32,"#f0a066");gr.addColorStop(.7,"#5a2d6e");gr.addColorStop(1,"#08040c");
  g.fillStyle=gr;g.beginPath();g.arc(600,400,280,0,Math.PI*2);g.fill();
  ring(0,Math.PI);
  gr=g.createRadialGradient(990,170,5,1010,190,90);gr.addColorStop(0,"#e9ffff");gr.addColorStop(.5,"#3fa7b8");gr.addColorStop(1,"#02080a");g.fillStyle=gr;g.beginPath();g.arc(1010,190,86,0,Math.PI*2);g.fill();
  for(var i=0;i<120;i++){var x=(i*937%1200),y=(i*571%420),r=(i%7===0)?2.4:1.2;g.fillStyle="rgba(255,255,255,"+(0.35+(i%5)*0.12)+")";g.beginPath();g.arc(x,y,r,0,7);g.fill();}
  return c;
}

/* UI helpers */
var C=document.getElementById("controls"),vis=[],setters={};
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function add(p,node,when){p.appendChild(node);if(when)vis.push({node:node,when:when});return node;}
function section(title,when){var s=el("section","sec");s.appendChild(el("h2",null,title));add(C,s,when);return s;}
function pair(p,when){return add(p,el("div","pair"),when);}
function num(v){return String(+(+v).toFixed(2));}
function fill(inp){var mn=+inp.min,mx=+inp.max,p=mx>mn?(inp.value-mn)/(mx-mn)*100:0;inp.style.setProperty("--p",p+"%");}
function slider(p,k,label,min,max,step,fmt,when){
  var r=el("div","ctl"),id="c-"+k;
  r.innerHTML='<div class="lab"><label for="'+id+'">'+label+'</label><output for="'+id+'"></output><span class="of">/ '+(fmt||num)(max)+'</span></div><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'">';
  var inp=r.querySelector("input"),out=r.querySelector("output"),f=fmt||num;
  setters[k]=function(v){inp.value=v;out.textContent=f(v);fill(inp);};
  inp.addEventListener("input",function(){S[k]=parseFloat(inp.value);out.textContent=f(S[k]);fill(inp);changed(k);});
  inp.addEventListener("dblclick",function(){S[k]=DEF[k];setters[k](S[k]);changed(k);});
  add(p,r,when);
}
function seg(p,k,label,opts,cols,when,cls){
  var r=el("div","ctl");if(label)r.appendChild(el("div","lab","<span>"+label+"</span>"));
  var g=el("div","opts"+(cls?" "+cls:""));g.style.setProperty("--cols",cols||opts.length);g.setAttribute("role","group");if(label)g.setAttribute("aria-label",label);
  var bs=opts.map(function(o){var b=el("button","opt",o[1]==null?String(o[0]):o[1]);b.type="button";if(o[2])b.title=o[2];
    b.addEventListener("click",function(){S[k]=o[0];setters[k](o[0]);changed(k);});g.appendChild(b);return [o[0],b];});
  r.appendChild(g);
  setters[k]=function(v){bs.forEach(function(x){var on=x[0]===v;x[1].classList.toggle("on",on);x[1].setAttribute("aria-pressed",on);});};
  add(p,r,when);return g;
}
function select(p,k,label,opts,when,isNum){
  var r=el("div","ctl"),id="c-"+k;r.innerHTML='<div class="lab"><label for="'+id+'">'+label+'</label></div>';
  var s=el("select");s.id=id;opts.forEach(function(o){var op=el("option",null,o[1]);op.value=o[0];s.appendChild(op);});r.appendChild(s);
  setters[k]=function(v){s.value=v;};
  s.addEventListener("change",function(){S[k]=isNum?+s.value:s.value;changed(k);});
  add(p,r,when);
}
function text(p,k,label,when,max){
  var r=el("div","ctl"),id="c-"+k;r.innerHTML='<div class="lab"><label for="'+id+'">'+label+'</label></div>';
  var t=el("input","txt");t.id=id;t.type="text";t.maxLength=max||120;t.spellcheck=false;r.appendChild(t);
  setters[k]=function(v){if(t.value!==v)t.value=v;};
  t.addEventListener("input",function(){S[k]=t.value;changed(k);});
  add(p,r,when);
}
function check(p,k,label,when){
  var r=el("label","check");var c=el("input");c.type="checkbox";c.id="c-"+k;r.appendChild(c);r.appendChild(document.createTextNode(label));
  setters[k]=function(v){c.checked=!!v;};c.addEventListener("change",function(){S[k]=c.checked;changed(k);});
  add(p,r,when);
}
function colorPick(p,k,label,when){
  var r=el("div","ctl"),id="c-"+k;r.innerHTML='<div class="lab"><label for="'+id+'">'+label+'</label></div>';
  var row=el("div","colorrow"),inp=el("input");inp.type="color";inp.id=id;var code=el("code");row.appendChild(inp);row.appendChild(code);r.appendChild(row);
  setters[k]=function(v){inp.value=v;code.textContent=v.toUpperCase();};
  inp.addEventListener("input",function(){S[k]=inp.value;code.textContent=inp.value.toUpperCase();changed(k);});
  add(p,r,when);
}
function note(p,html,when){add(p,el("p","note",html),when);}

var px=function(v){return v+"px";},xx=function(v){return num(v)+"×";},deg=function(v){return v+"°";};
var glyphish=function(S){return ["classic","claude","terminal","retro","particles","braille"].indexOf(S.style)>=0;};

/* SOURCE */
var sSrc=section("Источник");
var srcCtl=el("div","ctl");
srcCtl.innerHTML='<div class="opts" style="--cols:2" role="group" aria-label="Тип источника"><button class="opt on" id="srcFile" type="button" aria-pressed="true">Картинка / видео</button><button class="opt" id="srcCam" type="button" aria-pressed="false">Камера</button></div>'+
  '<button class="dz" id="dz" type="button"><span>Перетащи файл сюда или нажми, чтобы выбрать</span><small>JPG, PNG, GIF, MP4, WebM — без лимита по весу</small><small class="srcname" id="srcName">Сейчас: демо-сцена</small></button>';
sSrc.appendChild(srcCtl);
select(sSrc,"quality","Качество сэмплинга",[[320,"320 — быстро"],[480,"480 — баланс"],[720,"720 — детально"]],null,true);

/* STYLE */
var sSt=section("Стиль");
seg(sSt,"style",null,[["classic","Classic ASCII"],["braille","Braille"],["halftone","Halftone"],["dotcross","Dot Cross"],["line","Line"],["particles","Particles"],["claude","Claude Code"],["retro","Retro Art"],["terminal","Terminal"]],3);
seg(sSt,"brailleDensity","Плотность брайля",[["standard","Стандарт"],["sparse","Реже"],["dense","Плотнее"]],3,function(S){return S.style==="braille";});
select(sSt,"htShape","Форма растра",[["circle","Круг"],["square","Квадрат"],["diamond","Ромб"],["pentagon","Пятиугольник"],["hexagon","Шестиугольник"]],function(S){return S.style==="halftone";});
var pHt=pair(sSt,function(S){return S.style==="halftone";});
slider(pHt,"htSize","Размер точки",0.4,2.2,0.05,xx);slider(pHt,"htRot","Поворот",-180,180,1,deg);
var pLn=pair(sSt,function(S){return S.style==="line";});
slider(pLn,"lineLen","Длина",0.1,2.5,0.05,xx);slider(pLn,"lineWidth","Ширина",0.2,2.5,0.05,xx);slider(pLn,"lineThick","Толщина",0.2,8,0.1,px);slider(pLn,"lineRot","Поворот",-180,180,1,deg);
var pPt=pair(sSt,function(S){return S.style==="particles";});
text(pPt,"partChar","Символ частицы",null,2);slider(pPt,"partDensity","Плотность",0.1,1,0.05);
select(sSt,"retroPalette","Палитра",[["amber","Amber Classic"],["cyan","Cyan Night"],["violet","Violet Haze"],["lime","Lime Pulse"],["ice","Mono Ice"]],function(S){return S.style==="retro";});
slider(sSt,"retroNoise","Ретро-шум",0,1,0.05,null,function(S){return S.style==="retro";});
select(sSt,"termSet","Набор терминала",[["binary","101010"],["brackets","[]/\\<>"],["dollar","$_+"],["mixed","Mixed Terminal"],["braces","{}[]|/\\_+-"]],function(S){return S.style==="terminal";});
note(sSt,"Спиннеры в светлых зонах крутятся сами — как индикатор в Claude Code.",function(S){return S.style==="claude";});

/* CHARS */
var sCh=section("Символы и дизеринг");
select(sCh,"font","Шрифт",[["Helvetica Neue","Helvetica Neue"],["Inter","Inter"],["Poppins","Poppins"],["Space Grotesk","Space Grotesk"],["VT323","VT323 (пиксельный)"],["JetBrains Mono","JetBrains Mono"],["IBM Plex Mono","IBM Plex Mono"]],glyphish);
select(sCh,"charset","Набор символов",[["standard","Standard  @%#*+=-:."],["blocks","Blocks  █▓▒░"],["detailed","Detailed  $@B%8&WM…"],["minimal","Minimal  ·░█"],["binary","Binary  01"],["custom","Свой набор"],["az","Letters  A–Z"],["azl","Letters  a–z"],["aa","Letters  Aa"],["sym","Letters  Symbols"]],function(S){return S.style==="classic";});
text(sCh,"customChars","Свои символы — от пустого к плотному",function(S){return S.style==="classic"&&S.charset==="custom";},120);
select(sCh,"dither","Алгоритм дизеринга",[["none","Без дизеринга"],["floyd","Floyd–Steinberg"],["bayer","Bayer (упорядоченный)"],["atkinson","Atkinson"]]);

/* TONE */
var sTo=section("Тон");
var pTo=pair(sTo);
slider(pTo,"brightness","Яркость",-50,50,1);slider(pTo,"contrast","Контраст",0.5,2.5,0.1);
slider(pTo,"ditherStrength","Сила дизеринга",0,2,0.05);slider(pTo,"bgDither","Дизер в тенях",0,3,0.05);
slider(pTo,"invDither","Дизер в светах",0,3,0.05);slider(pTo,"vignette","Виньетка",0,1,0.05);

/* GRID */
var sGr=section("Сетка и свечение");
var pGr=pair(sGr);
slider(pGr,"fontSize","Размер ячейки",6,20,1,px);slider(pGr,"spacing","Интервал",0.7,2,0.05,xx);
slider(pGr,"opacity","Непрозрачность",0,1,0.05);slider(pGr,"glow","Свечение",0,1,0.05);

/* COLOR */
var sCo=section("Цвет");
seg(sCo,"colorMode",null,[["gray","Серый"],["full","Цвет"],["matrix","Matrix"],["amber","Amber"],["custom","Свой"]],5,function(S){return S.style!=="retro";});
note(sCo,"В стиле Retro Art цвет задаёт палитра из раздела «Стиль».",function(S){return S.style==="retro";});
check(sCo,"invert","Инвертировать");
var pCu=pair(sCo,function(S){return S.colorMode==="custom"&&S.style!=="retro";});
colorPick(pCu,"customColor","Цвет символов");slider(pCu,"hue","Оттенок",0,360,1,deg);

/* FX */
var sFx=section("Эффект");
seg(sFx,"fx",null,[["none","Нет"],["noise","Noise Field"],["intervals","Intervals"],["beam","Beam Sweep"],["glitch","Glitch"],["crt","CRT"],["matrix","Matrix Rain"],["__r","Случайный","Выбрать эффект наугад"]],4);
slider(sFx,"fxStrength","Сила эффекта",0.05,1,0.05,null,function(S){return S.fx!=="none";});
seg(sFx,"dir","Направление",[["N","↑"],["S","↓"],["W","←"],["E","→"],["NW","↖"],["NE","↗"],["SW","↙"],["SE","↘"]],4,function(S){return ["noise","intervals","beam"].indexOf(S.fx)>=0;},"arrows");
var pNo=pair(sFx,function(S){return S.fx==="noise";});slider(pNo,"noiseScale","Масштаб шума",4,96,1);slider(pNo,"noiseSpeed","Скорость шума",0,3,0.1);
var pIn=pair(sFx,function(S){return S.fx==="intervals";});slider(pIn,"intSpacing","Шаг полос",4,36,1);slider(pIn,"intSpeed","Скорость",0,3,0.1);slider(pIn,"intWidth","Ширина полосы",1,8,1);
var pMa=pair(sFx,function(S){return S.fx==="matrix";});slider(pMa,"matScale","Длина струй",6,48,1);slider(pMa,"matSpeed","Скорость",0.1,3.5,0.1);

/* MOUSE */
var sMo=section("Мышь");
seg(sMo,"mouse",null,[["attract","Притяжение"],["push","Отталкивание"],["off","Выкл"]],3);
var pMo=pair(sMo,function(S){return S.mouse!=="off";});
slider(pMo,"hover","Сила",4,64,1);slider(pMo,"area","Радиус",40,640,1,px);slider(pMo,"spread","Мягкость края",0.25,3,0.05,xx);

/* stage bar */
var aspHost=document.getElementById("aspectHost");
(function(){var opts=[["original","Исходник"],["16:9","16:9"],["4:3","4:3"],["1:1","1:1"],["3:4","3:4"],["9:16","9:16"]];
  var bs=opts.map(function(o){var b=el("button","opt",o[1]);b.type="button";b.addEventListener("click",function(){S.aspect=o[0];setters.aspect(o[0]);changed("aspect");});aspHost.appendChild(b);return [o[0],b];});
  setters.aspect=function(v){bs.forEach(function(x){var on=x[0]===v;x[1].classList.toggle("on",on);x[1].setAttribute("aria-pressed",on);});};})();
var bgIn=document.getElementById("c-bg");
setters.bg=function(v){bgIn.value=v;};bgIn.addEventListener("input",function(){S.bg=bgIn.value;changed("bg");});

/* state change */
var saveTimer=0;
function changed(k){
  if(k==="fx"&&S.fx==="__r"){var list=["noise","intervals","beam","glitch","crt","matrix"];S.fx=list[Math.random()*list.length|0];setters.fx(S.fx);}
  if(k==="hue"){S.customColor=hsl2hex(S.hue,100,58);setters.customColor(S.customColor);}
  if(k==="aspect"||k==="quality")resize();
  if(k==="font")loadFont(S.font);
  updateVis();readout();
  clearTimeout(saveTimer);saveTimer=setTimeout(function(){try{localStorage.setItem("glifomat:state",JSON.stringify(clean(S)));}catch(e){}},300);
}
function clean(o){var r={};for(var k in DEF)r[k]=o[k];return r;}
function updateVis(){vis.forEach(function(v){v.node.hidden=!v.when(S);});}
function applyAll(){normLayers();if(tab!=="ascii"&&tab>=S.layers.length)tab="ascii";
  for(var k in setters)if(k in S)setters[k](S[k]);updateVis();resize();loadFont(S.font);readout();showTab();
  try{localStorage.setItem("glifomat:state",JSON.stringify(clean(S)));}catch(e){}}

/* layers UI */
var TABS=document.getElementById("layerTabs"),LP=document.getElementById("layerPanel");
function renderTabs(){
  TABS.innerHTML="";
  var mk=function(label,sub,on,fn,cls){var b=el("button","tab"+(on?" on":"")+(cls?" "+cls:""),label+(sub?"<small>"+sub+"</small>":""));b.type="button";b.setAttribute("role","tab");b.setAttribute("aria-selected",on);b.addEventListener("click",fn);TABS.appendChild(b);return b;};
  mk("ASCII","",tab==="ascii",function(){tab="ascii";showTab();});
  S.layers.forEach(function(L,i){mk("Слой "+(i+1),LNAME[L.type],tab===i,function(){tab=i;showTab();});});
  var add=mk("+ Слой","",false,function(){if(S.layers.length>=MAXL)return;S.layers=S.layers.concat([Object.assign({},LDEF)]);tab=S.layers.length-1;layerChanged();showTab();},"add");
  add.setAttribute("role","button");add.removeAttribute("aria-selected");
  if(S.layers.length>=MAXL){add.disabled=true;add.title="Максимум "+MAXL+" слоя";}
}
function showTab(){renderTabs();var asc=tab==="ascii";C.hidden=!asc;LP.hidden=asc;if(!asc)buildLayer(tab);}
function layerChanged(){readout();clearTimeout(saveTimer);saveTimer=setTimeout(function(){try{localStorage.setItem("glifomat:state",JSON.stringify(clean(S)));}catch(e){}},300);}
function lseg(p,L,k,label,opts,cols,rebuild){
  var r=el("div","ctl");if(label)r.appendChild(el("div","lab","<span>"+label+"</span>"));
  var g=el("div","opts");g.style.setProperty("--cols",cols);g.setAttribute("role","group");if(label)g.setAttribute("aria-label",label);
  opts.forEach(function(o){var b=el("button","opt"+(L[k]===o[0]?" on":""),o[1]);b.type="button";b.setAttribute("aria-pressed",L[k]===o[0]);
    b.addEventListener("click",function(){L[k]=o[0];layerChanged();if(rebuild){renderTabs();buildLayer(tab);}else{g.querySelectorAll(".opt").forEach(function(x){x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",x===b);});}});g.appendChild(b);});
  r.appendChild(g);p.appendChild(r);
}
function lslider(p,L,k,label,min,max,step,fmt){
  var r=el("div","ctl"),id="l-"+k;
  r.innerHTML='<div class="lab"><label for="'+id+'">'+label+'</label><output for="'+id+'"></output><span class="of">/ '+(fmt||num)(max)+'</span></div><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'">';
  var inp=r.querySelector("input"),out=r.querySelector("output"),f=fmt||num;inp.value=L[k];out.textContent=f(L[k]);fill(inp);
  inp.addEventListener("input",function(){L[k]=parseFloat(inp.value);out.textContent=f(L[k]);fill(inp);layerChanged();});
  inp.addEventListener("dblclick",function(){L[k]=LDEF[k];inp.value=L[k];out.textContent=f(L[k]);fill(inp);layerChanged();});
  p.appendChild(r);
}
function buildLayer(i){
  var L=S.layers[i];LP.innerHTML="";if(!L)return;
  var s1=el("section","sec");s1.appendChild(el("h2",null,"WebGL-слой "+(i+1)));LP.appendChild(s1);
  lseg(s1,L,"type","Тип слоя",LTYPES,2,true);
  var s2=el("section","sec");s2.appendChild(el("h2",null,"Как ложится"));LP.appendChild(s2);
  lseg(s2,L,"affects","Влияние",[["sep","Отдельно"],["fx","Через ASCII"]],2,true);
  if(L.affects==="sep")lseg(s2,L,"place","Положение",[["behind","Под символами"],["above","Над символами"]],2,false);
  s2.appendChild(el("p","note",L.affects==="fx"?"Слой подмешивается в исходник до перевода в символы: его рисуют сами глифы, со всем дизерингом, цветом и эффектами.":"Слой рисуется своей графикой и складывается с ASCII светом, без перевода в символы."));
  var s3=el("section","sec");s3.appendChild(el("h2",null,"Параметры"));LP.appendChild(s3);
  var pr=el("div","pair");s3.appendChild(pr);
  lslider(pr,L,"intensity","Интенсивность",0,1,0.05);lslider(pr,L,"spread","Разброс линий",0,1,0.05);
  lslider(pr,L,"pulse","Скорость пульса",0,3,0.05,xx);lslider(pr,L,"mouseInf","Влияние мыши",0,1,0.05);
  lslider(pr,L,"grain","Плёночное зерно",0,0.3,0.01);
  var cr=el("div","ctl");cr.innerHTML='<div class="lab"><label for="l-color">Цвет слоя</label></div>';
  var row=el("div","colorrow"),ci=el("input");ci.type="color";ci.id="l-color";ci.value=L.color;var code=el("code",null,L.color.toUpperCase());row.appendChild(ci);row.appendChild(code);cr.appendChild(row);pr.appendChild(cr);
  ci.addEventListener("input",function(){L.color=ci.value;code.textContent=ci.value.toUpperCase();layerChanged();});
  var del=el("button","danger","Удалить слой");del.type="button";s3.appendChild(del);
  del.addEventListener("click",function(){S.layers=S.layers.filter(function(x){return x!==L;});tab="ascii";layerChanged();showTab();});
}
function hsl2hex(h,s,l){s/=100;l/=100;var k=function(n){return (n+h/30)%12;},a=s*Math.min(l,1-l),f=function(n){return l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));};
  return "#"+[f(0),f(8),f(4)].map(function(x){return Math.round(x*255).toString(16).padStart(2,"0");}).join("");}
function loadFont(f){if(!document.fonts||f==="Helvetica Neue"){R.invalidate();return;}document.fonts.load('500 20px "'+f+'"').then(function(){R.invalidate();}).catch(function(){});}

/* sizing */
function srcDims(){var s=source;return [s.videoWidth||s.naturalWidth||s.width||16,s.videoHeight||s.naturalHeight||s.height||9];}
function resize(){
  var r=wrap.getBoundingClientRect(),aw=Math.max(40,r.width),ah=Math.max(40,r.height),dims=srcDims(),ar;
  if(S.aspect==="original")ar=dims[0]/dims[1];else{var p=S.aspect.split(":");ar=(+p[0])/(+p[1]);}
  var w=aw,h=aw/ar;if(h>ah){h=ah;w=ah*ar;}
  w=Math.floor(w);h=Math.floor(h);
  var d=Math.min(window.devicePixelRatio||1,2);S._dpr=d;
  cv.style.width=w+"px";cv.style.height=h+"px";cv.width=Math.max(1,Math.round(w*d));cv.height=Math.max(1,Math.round(h*d));
}
new ResizeObserver(function(){resize();}).observe(wrap);

/* loop */
function frame(now){
  requestAnimationFrame(frame);
  var dt=(now-prev)/1000;prev=now;if(!paused)tAcc+=Math.min(dt,0.1);
  try{lastInfo=R.render(source,S,tAcc,mouse);}catch(e){console.error(e);}
  fpsN++;if(now-fpsT>600){fpsVal=Math.round(fpsN*1000/(now-fpsT));fpsN=0;fpsT=now;document.getElementById("fps").textContent=paused?"Пауза":String(fpsVal);document.getElementById("tkGrid").textContent=lastInfo.cols+"×"+lastInfo.rows;}
}

/* readout */
var NAMES={classic:"Classic",braille:"Braille",halftone:"Halftone",dotcross:"Dot Cross",line:"Line",particles:"Particles",claude:"Claude Code",retro:"Retro Art",terminal:"Terminal",none:"Нет",noise:"Noise",intervals:"Intervals",beam:"Beam",glitch:"Glitch",crt:"CRT",matrix:"Matrix",gray:"Серый",full:"Цвет",amber:"Amber",custom:"Свой"};
function readout(){
  var rows=[["Стиль",NAMES[S.style]],["Шрифт",S.font],["Формат",S.aspect==="original"?"Исходник":S.aspect],["FX",NAMES[S.fx]||S.fx],["Цвет",S.style==="retro"?"Палитра":(NAMES[S.colorMode]||S.colorMode)],["Фон",S.bg.toUpperCase()],["Слои",(S.layers||[]).length?String(S.layers.length):"Нет"]];
  document.getElementById("readout").innerHTML=rows.map(function(r){return '<div class="tick"><dt>'+r[0]+"</dt><dd>"+r[1]+"</dd></div>";}).join("");
}

/* mouse */
cv.addEventListener("pointermove",function(e){var r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;mouse.on=true;});
cv.addEventListener("pointerdown",function(e){var r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;mouse.on=true;});
cv.addEventListener("pointerleave",function(){mouse.on=false;});

/* sources */
var fileIn=document.getElementById("fileIn"),btnFile=document.getElementById("srcFile"),btnCam=document.getElementById("srcCam");
function markSrc(cam){btnFile.classList.toggle("on",!cam);btnCam.classList.toggle("on",cam);btnFile.setAttribute("aria-pressed",!cam);btnCam.setAttribute("aria-pressed",cam);}
function stopOld(){if(sourceKind==="video"&&source.pause){source.pause();if(source._url)URL.revokeObjectURL(source._url);}
  if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}}
function setSource(obj,kind,label){stopOld();source=obj;sourceKind=kind;srcLabel=label;
  document.getElementById("srcName").textContent="Сейчас: "+label;document.getElementById("statusLine").textContent=label;markSrc(kind==="cam");resize();}
function loadFile(f){
  if(!f)return;
  if(f.type.indexOf("video")===0){var v=document.createElement("video");v.muted=true;v.loop=true;v.playsInline=true;v._url=URL.createObjectURL(f);v.src=v._url;
    v.addEventListener("loadedmetadata",function(){setSource(v,"video",f.name);v.play().catch(function(){});},{once:true});
    v.addEventListener("error",function(){toast("Этот видеоформат браузер не открыл. Попробуй MP4 или WebM.");},{once:true});}
  else if(f.type.indexOf("image")===0){var im=new Image();var u=URL.createObjectURL(f);im.onload=function(){setSource(im,"image",f.name);};im.onerror=function(){toast("Картинку не получилось открыть. Подойдут JPG, PNG, GIF, WebP.");};im.src=u;}
  else toast("Нужна картинка или видео.");
}
document.getElementById("dz").addEventListener("click",function(){fileIn.click();});
document.getElementById("btnUpload").addEventListener("click",function(){fileIn.click();});
btnFile.addEventListener("click",function(){if(sourceKind==="cam")setSource(makeSample(),"demo","Демо-сцена");fileIn.click();});
fileIn.addEventListener("change",function(){loadFile(fileIn.files[0]);fileIn.value="";});
document.getElementById("btnCamBar").addEventListener("click",function(){btnCam.click();});
btnCam.addEventListener("click",function(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast("Камера здесь недоступна.");return;}
  navigator.mediaDevices.getUserMedia({video:{width:1280,height:720}}).then(function(st){var v=document.createElement("video");v.muted=true;v.playsInline=true;v.srcObject=st;
    v.play().then(function(){setSource(v,"cam","Камера");stream=st;}).catch(function(){st.getTracks().forEach(function(t){t.stop();});});})
  .catch(function(){toast("Камеру это окно не пускает. Открой Глифомат по ссылке GitHub Pages или локально — там она работает.");markSrc(false);});
});
var stage=document.getElementById("stage"),drop=document.getElementById("drop"),dragN=0;
stage.addEventListener("dragenter",function(e){e.preventDefault();dragN++;drop.hidden=false;});
stage.addEventListener("dragover",function(e){e.preventDefault();});
stage.addEventListener("dragleave",function(){dragN=Math.max(0,dragN-1);if(!dragN)drop.hidden=true;});
stage.addEventListener("drop",function(e){e.preventDefault();dragN=0;drop.hidden=true;loadFile(e.dataTransfer.files[0]);});
document.getElementById("dz").addEventListener("dragover",function(e){e.preventDefault();});
document.getElementById("dz").addEventListener("drop",function(e){e.preventDefault();e.stopPropagation();loadFile(e.dataTransfer.files[0]);});

/* pause */
var btnPause=document.getElementById("btnPause");
function togglePause(){paused=!paused;btnPause.classList.toggle("on",paused);btnPause.setAttribute("aria-pressed",paused);btnPause.textContent=paused?"Пуск":"Пауза";
  if(sourceKind==="video"){paused?source.pause():source.play().catch(function(){});}}
btnPause.addEventListener("click",togglePause);
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){document.querySelectorAll(".modal").forEach(function(m){m.hidden=true;});return;}
  var tg=e.target.tagName;if(e.code==="Space"&&tg!=="INPUT"&&tg!=="SELECT"&&tg!=="BUTTON"&&tg!=="TEXTAREA"){e.preventDefault();togglePause();}
});

/* toast */
var toastT=0;function toast(m){var t=document.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},3600);}

/* modals */
function openM(id){document.getElementById(id).hidden=false;}
document.querySelectorAll(".modal").forEach(function(m){m.addEventListener("click",function(e){if(e.target===m||e.target.hasAttribute("data-close"))m.hidden=true;});});

/* random */
function pick(a){return a[Math.random()*a.length|0];}
function rr(a,b,st){return Math.round((a+Math.random()*(b-a))/st)*st;}
var rndN=0;
document.getElementById("btnRandom").addEventListener("click",function(){
  rndN++;document.getElementById("rndCount").textContent=String(rndN).padStart(2,"0");
  S.style=pick(["classic","classic","braille","halftone","dotcross","line","particles","claude","retro","terminal"]);
  S.charset=pick(["standard","blocks","detailed","minimal","binary","az","sym"]);
  S.font=pick(["Helvetica Neue","Inter","Space Grotesk","VT323","JetBrains Mono","IBM Plex Mono"]);
  S.dither=pick(["none","floyd","bayer","atkinson"]);
  S.colorMode=pick(["gray","full","matrix","amber","custom"]);
  S.fx=pick(["none","noise","noise","intervals","beam","glitch","crt","matrix"]);S.dir=pick(["N","S","W","E","NW","NE","SW","SE"]);
  S.contrast=+rr(0.9,1.8,0.1).toFixed(1);S.brightness=rr(-8,14,1);S.ditherStrength=+rr(0.4,1.3,0.05).toFixed(2);
  S.fontSize=rr(7,14,1);S.spacing=+rr(0.9,1.3,0.05).toFixed(2);S.glow=Math.random()<.5?0:+rr(.15,.6,.05).toFixed(2);
  S.fxStrength=+rr(.25,.7,.05).toFixed(2);S.hue=rr(0,360,1);S.customColor=hsl2hex(S.hue,100,58);
  S.htShape=pick(["circle","square","diamond","pentagon","hexagon"]);S.htRot=pick([0,0,15,45]);
  S.retroPalette=pick(["amber","cyan","violet","lime","ice"]);S.termSet=pick(["binary","brackets","dollar","mixed","braces"]);
  S.mouse=pick(["attract","push"]);
  applyAll();toast("Случайный набор: "+NAMES[S.style]+" + "+(NAMES[S.fx]||S.fx));
});

/* presets */
var PRESETS=[
  {n:"Классика",d:"ASCII · Noise",o:{}},
  {n:"Матрица",d:"Binary · Matrix Rain",o:{charset:"binary",colorMode:"matrix",fx:"matrix",fxStrength:0.6,glow:0.4,font:"JetBrains Mono",matSpeed:1.2}},
  {n:"ЭЛТ-монитор",d:"Amber · CRT",o:{font:"VT323",fontSize:12,colorMode:"amber",fx:"crt",fxStrength:0.6,glow:0.5,contrast:1.3}},
  {n:"Растр",d:"Halftone · ромб 45°",o:{style:"halftone",htShape:"diamond",htRot:45,htSize:1.15,fontSize:9,fx:"none",dither:"none",contrast:1.3}},
  {n:"Гравюра",d:"Line · по контуру",o:{style:"line",lineLen:1.5,lineThick:1.1,lineWidth:1.2,fontSize:8,fx:"none",contrast:1.4,dither:"none"}},
  {n:"Брайль-поток",d:"Braille · Noise",o:{style:"braille",brailleDensity:"dense",fx:"noise",fxStrength:0.55,colorMode:"custom",customColor:"#7ad7ff",hue:197,glow:0.25}},
  {n:"Ретро-кассета",d:"Retro · Glitch",o:{style:"retro",retroPalette:"cyan",retroNoise:0.5,fx:"glitch",fxStrength:0.35,fontSize:11}},
  {n:"Терминал",d:"Mixed · Intervals",o:{style:"terminal",termSet:"mixed",colorMode:"matrix",fx:"intervals",fxStrength:0.5,dir:"S",font:"IBM Plex Mono"}},
  {n:"Звёздная пыль",d:"Particles · Push",o:{style:"particles",partChar:"+",partDensity:0.75,fx:"noise",fxStrength:0.4,mouse:"push",hover:40,area:220,colorMode:"full",glow:0.35}},
  {n:"Купол сети",d:"ASCII + Network Dome",o:{fxStrength:0.3,layers:[{type:"dome",place:"behind",intensity:0.55,spread:0.5,color:"#8fb8ff"}]}},
  {n:"Туман",d:"Blocks + Folds через ASCII",o:{charset:"blocks",fx:"none",contrast:1.3,fontSize:9,dither:"bayer",colorMode:"full",layers:[{type:"folds",affects:"fx",intensity:0.5,spread:0.4,color:"#6fa8ff"}]}},
  {n:"Рельеф",d:"ASCII + Terrain Mesh",o:{fx:"none",fxStrength:0.3,layers:[{type:"terrain",place:"behind",intensity:0.5,spread:0.3,color:"#9cc4ff"}]}},
  {n:"Гроза",d:"Свой цвет + Lightning",o:{colorMode:"custom",customColor:"#b38cff",hue:262,glow:0.3,fx:"glitch",fxStrength:0.25,layers:[{type:"lightning",place:"above",intensity:0.5,spread:0.4,grain:0.04,color:"#c9a6ff"}]}}
];
var pg=document.getElementById("presetGrid");
PRESETS.forEach(function(p){var b=el("button","pbtn","<b>"+p.n+"</b><small>"+p.d+"</small>");b.type="button";
  b.addEventListener("click",function(){S=Object.assign({},DEF,p.o,{_dpr:S._dpr});applyAll();toast("Пресет «"+p.n+"»");});pg.appendChild(b);});
function getSaved(){try{return JSON.parse(localStorage.getItem("glifomat:presets")||"[]");}catch(e){return [];}}
function putSaved(a){try{localStorage.setItem("glifomat:presets",JSON.stringify(a));return true;}catch(e){return false;}}
function presetCount(){document.getElementById("presetCount").textContent=String(PRESETS.length+getSaved().length).padStart(2,"0");}
function renderSaved(){var l=document.getElementById("savedList"),a=getSaved();l.innerHTML="";presetCount();
  if(!a.length){l.appendChild(el("p","note","Пока пусто. Настрой картинку и сохрани её под своим именем — пресет останется в этом браузере."));return;}
  a.forEach(function(p,i){var it=el("div","it"),b1=el("button",null,""),b2=el("button","x","Удалить");b1.type=b2.type="button";b1.textContent=p.n;
    b1.addEventListener("click",function(){S=Object.assign({},DEF,p.s,{_dpr:S._dpr});applyAll();toast("Пресет «"+p.n+"»");});
    b2.addEventListener("click",function(){var arr=getSaved();arr.splice(i,1);putSaved(arr);renderSaved();});
    it.appendChild(b1);it.appendChild(b2);l.appendChild(it);});}
document.getElementById("saveForm").addEventListener("submit",function(e){e.preventDefault();var nm=document.getElementById("presetName").value.trim()||("Пресет "+(getSaved().length+1));
  var a=getSaved();a.unshift({n:nm,s:clean(S)});if(putSaved(a)){renderSaved();document.getElementById("presetName").value="";toast("Сохранено: «"+nm+"»");}else toast("Браузер не дал сохранить. Сохрани настройки в JSON через «Экспорт».");});
document.getElementById("btnPresets").addEventListener("click",function(){renderSaved();openM("mPresets");});

/* export */
document.getElementById("btnExport").addEventListener("click",function(){openM("mExport");});
function stamp(){var d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+"-"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")+String(d.getSeconds()).padStart(2,"0");}
function save(name,data){
  if(!DL){try{var blob=data instanceof Blob?data:new Blob([data]),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},4000);toast("Готово: "+name);}catch(e){toast("Не получилось сохранить файл: "+e.message);}return Promise.resolve();}
  return DL.save({filename:name,data:data}).then(function(r){toast(r&&r.status==="delivered"?"Файл передан":"Готово: "+name);})
  .catch(function(e){var c=e&&e.code;toast(c==="declined"?"Сохранение отменено":c==="rate_limited"?"Подожди секунду и нажми ещё раз":"Не получилось сохранить: "+((e&&e.message)||c||"ошибка"));});
}
function toBlob(c){return new Promise(function(res){c.toBlob(function(b){res(b);},"image/png");});}
document.getElementById("exPng").addEventListener("click",function(){toBlob(cv).then(function(b){save("glifomat-"+stamp()+".png",b);});});
document.getElementById("exPng2").addEventListener("click",function(){
  var c=document.createElement("canvas");c.width=cv.width*2;c.height=cv.height*2;var r2=Glyphomat.create(c);
  var S2=Object.assign({},S,{_dpr:(S._dpr||1)*2});r2.render(source,S2,tAcc,mouse);r2.dispose();toBlob(c).then(function(b){save("glifomat-"+stamp()+"@2x.png",b);});
});
document.getElementById("exSvg").addEventListener("click",function(){
  var tmp=document.createElement("canvas");tmp.width=cv.width;tmp.height=cv.height;var r2=Glyphomat.create(tmp);
  var out=r2.svg(source,S,tAcc,mouse);r2.dispose();save("glifomat-"+stamp()+".svg",out);
});
var vidSec=5,vd=document.getElementById("vidDur");
var vbs=[3,5,10].map(function(s){var b=el("button","opt",s+" сек");b.type="button";b.addEventListener("click",function(){vidSec=s;vbs.forEach(function(x){x[1].classList.toggle("on",x[0]===s);});});vd.appendChild(b);return [s,b];});
vbs[1][1].classList.add("on");
var exVid=document.getElementById("exVid");
exVid.addEventListener("click",function(){
  if(!window.MediaRecorder||!cv.captureStream){toast("Этот браузер не умеет записывать видео с холста.");return;}
  var types=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm"],type=types.find(function(t){return MediaRecorder.isTypeSupported(t);});
  if(!type){toast("Нет подходящего видеокодека в браузере.");return;}
  if(paused)togglePause();
  var st=cv.captureStream(60),rec=new MediaRecorder(st,{mimeType:type,videoBitsPerSecond:14e6}),chunks=[];
  rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data);};
  rec.onstop=function(){st.getTracks().forEach(function(t){t.stop();});exVid.disabled=false;exVid.textContent="Записать";
    var ext=type.indexOf("mp4")>=0?"mp4":"webm";save("glifomat-"+stamp()+"."+ext,new Blob(chunks,{type:type.split(";")[0]}));};
  exVid.disabled=true;var left=vidSec;exVid.textContent="Запись "+left;
  document.getElementById("mExport").hidden=true;toast("Пишу "+vidSec+" сек. Можно водить мышью по холсту.");
  rec.start(250);
  var iv=setInterval(function(){left--;exVid.textContent="Запись "+Math.max(0,left);if(left<=0){clearInterval(iv);rec.stop();}},1000);
});
function sourceDataURL(){
  var dims=srcDims(),m=Math.min(1,1600/Math.max(dims[0],dims[1])),c=document.createElement("canvas");c.width=Math.round(dims[0]*m);c.height=Math.round(dims[1]*m);
  try{c.getContext("2d").drawImage(source,0,0,c.width,c.height);}catch(e){}
  return c.toDataURL("image/jpeg",0.9);
}
document.getElementById("exHtml").addEventListener("click",function(){
  var opt={fps:+document.getElementById("exFps").value,mouse:document.getElementById("exMouse").checked};
  var cfg=clean(S);cfg.transparent=document.getElementById("exTr").checked;if(!opt.mouse)cfg.mouse="off";
  var gf={"Inter":"Inter:wght@500","Poppins":"Poppins:wght@500","Space Grotesk":"Space+Grotesk:wght@500","VT323":"VT323","JetBrains Mono":"JetBrains+Mono:wght@500","IBM Plex Mono":"IBM+Plex+Mono:wght@500"}[S.font];
  var eng=GlyphomatEngine.toString()+"\nGlyphomatEngine(window);";
  var html='<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>ASCII-фон</title>\n'+
    (gf?'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family='+gf+'&display=swap">\n':'')+
    '<style>\nhtml,body{margin:0;height:100%;background:'+(cfg.transparent?'transparent':cfg.bg)+'}\n[data-ascii-bg]{position:relative;width:100%;height:100%;overflow:hidden}\n[data-ascii-bg] canvas{position:absolute;inset:0;width:100%;height:100%;display:block}\n</style>\n</head>\n<body>\n<!-- Положи этот div в любую секцию: фон растянется по её размеру -->\n<div data-ascii-bg><canvas></canvas></div>\n<script>'+eng+'<\/script>\n<script>\n(function(){\nvar S='+JSON.stringify(cfg)+';\nvar OPT='+JSON.stringify(opt)+';\nvar box=document.querySelector("[data-ascii-bg]"),cv=box.querySelector("canvas"),R=Glyphomat.create(cv),m={x:0,y:0,on:false},img=new Image(),t0=performance.now(),last=0;\nfunction size(){var d=Math.min(window.devicePixelRatio||1,2),r=box.getBoundingClientRect();S._dpr=d;cv.width=Math.max(1,Math.round(r.width*d));cv.height=Math.max(1,Math.round(r.height*d));}\nnew ResizeObserver(size).observe(box);\nif(OPT.mouse){box.addEventListener("pointermove",function(e){var r=box.getBoundingClientRect();m.x=e.clientX-r.left;m.y=e.clientY-r.top;m.on=true;});box.addEventListener("pointerleave",function(){m.on=false;});}\nfunction loop(n){requestAnimationFrame(loop);if(n-last<1000/OPT.fps-2)return;last=n;R.render(img,S,(n-t0)/1000,m);}\nimg.onload=function(){size();if(document.fonts)document.fonts.ready.then(function(){R.invalidate();});requestAnimationFrame(loop);};\nimg.src='+JSON.stringify(sourceDataURL())+';\n})();\n<\/script>\n</body>\n</html>\n';
  save("glifomat-bg-"+stamp()+".html",html);
});
document.getElementById("exJson").addEventListener("click",function(){save("glifomat-settings-"+stamp()+".json",JSON.stringify(clean(S),null,2));});
var jsonIn=document.getElementById("jsonIn");
document.getElementById("imJson").addEventListener("click",function(){jsonIn.click();});
jsonIn.addEventListener("change",function(){var f=jsonIn.files[0];if(!f)return;var rd=new FileReader();
  rd.onload=function(){try{var o=JSON.parse(rd.result);var c={};for(var k in DEF)if(k in o)c[k]=o[k];S=Object.assign({},DEF,c,{_dpr:S._dpr});applyAll();toast("Настройки загружены");document.getElementById("mExport").hidden=true;}catch(e){toast("В файле не JSON настроек Глифомата.");}};
  rd.readAsText(f);jsonIn.value="";});

/* boot */
if(document.fonts)document.fonts.ready.then(function(){R.invalidate();});
applyAll();
presetCount();
requestAnimationFrame(frame);
})();
