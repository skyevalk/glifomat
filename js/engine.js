/* Глифомат — движок рендера. Без DOM-зависимостей от интерфейса: create(canvas) → render / svg / dispose.
   Экспорт HTML-фона вшивает этот файл целиком через GlyphomatEngine.toString(). */
function GlyphomatEngine(G){
"use strict";
var CHARSETS={
  standard:" .:-=+*#%@",
  blocks:" ░▒▓█",
  detailed:" .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  minimal:" ·░█",
  binary:" 01",
  az:" ILTJFCVYZXKSEPAUHNRDGOBQWM",
  azl:" ilrtjfcvxzsnuyeoakhdbpqgwm",
  aa:" iIlrtfjcJvxzLsTnuFyCeZoaYkVhSXdbEpqPgAUKwHNRDGOmBQWM",
  sym:" .,:;'~-^!+=?*<>/\\|()[]{}&%$#@"
};
var TERM={binary:"01",brackets:"[]/\\<>",dollar:"$_+",mixed:"01[]/\\<>$_+{}|=*#",braces:"{}[]|/\\_+-"};
var CLAUDE=Array.from(" ·∙•✢✳✶✻✽");
var SPIN=Array.from("·✢✳✶✻✽");
var RETRO={amber:["#3a1e00","#8a4800","#e08c00","#ffd469"],cyan:["#00303d","#007a8f","#12b9d6","#a6f6ff"],violet:["#2a1650","#5a32a0","#a066f2","#ead0ff"],lime:["#1b3300","#3f7d00","#8ad900","#e6ff92"],ice:["#26323a","#4f6370","#97adbb","#f0f7fb"]};
var MONO={gray:"#f1f1ec",matrix:"#3dff7a",amber:"#ffb12e"};
var DIRS={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0],NW:[-.7071,-.7071],NE:[.7071,-.7071],SW:[-.7071,.7071],SE:[.7071,.7071]};
var BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(function(v){return (v+.5)/16;});
var SHAPES={circle:null,square:[4,Math.PI/4,1.3],diamond:[4,0,1.2],pentagon:[5,-Math.PI/2,1.1],hexagon:[6,0,1.06]};
var BRAILLE=Array.from({length:256},function(_,i){return String.fromCharCode(0x2800+i);});
var BBITS=[[0,0,1],[0,1,2],[0,2,4],[1,0,8],[1,1,16],[1,2,32],[0,3,64],[1,3,128]];

function hash(x,y){var h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function noise(x,y){var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;xf=xf*xf*(3-2*xf);yf=yf*yf*(3-2*yf);var a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf;}
function fbm(x,y){return noise(x,y)*.65+noise(x*2.1+17.3,y*2.1-9.1)*.35;}
function fontStack(f){
  if(f==="Helvetica Neue")return '"Helvetica Neue", Helvetica, Arial, sans-serif';
  if(f==="VT323")return '"VT323", monospace';
  if(f==="JetBrains Mono"||f==="IBM Plex Mono")return '"'+f+'", ui-monospace, monospace';
  return '"'+f+'", "Helvetica Neue", Arial, sans-serif';
}
function hex2(n){n=Math.max(0,Math.min(255,n|0));return (n<16?"0":"")+n.toString(16);}
function esc(c){return c==="&"?"&amp;":c==="<"?"&lt;":c===">"?"&gt;":c;}
function polyPts(n,base,x,y,r,rot){var p=[];for(var i=0;i<n;i++){var a=base+rot+i*2*Math.PI/n;p.push(x+Math.cos(a)*r,y+Math.sin(a)*r);}return p;}
function rectPts(x,y,len,th,ang){var c=Math.cos(ang),s=Math.sin(ang),h=th/2;var pts=[[-len,-h],[len,-h],[len,h],[-len,h]],o=[];for(var i=0;i<4;i++){o.push(x+pts[i][0]*c-pts[i][1]*s,y+pts[i][0]*s+pts[i][1]*c);}return o;}
function f1(v){return (Math.round(v*10)/10).toString();}
function ptsStr(p){var s="";for(var i=0;i<p.length;i+=2)s+=(i?" ":"")+f1(p[i])+","+f1(p[i+1]);return s;}

/* ---------- WebGL layers ---------- */
var GL_HEAD="precision highp float;\nuniform vec2 uRes;uniform float uTime;uniform vec3 uMouse;uniform float uInt,uSpread,uPulse,uMInf,uGrain;uniform vec3 uCol;uniform vec3 uP[36];\n"+
"float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n"+
"float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}\n"+
"float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}\n"+
"float fbm3(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v/.875;}\n"+
"float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);return length(pa-ba*h);}\n";
var GL_MAIN="void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;vec2 m=(uMouse.xy-.5*uRes)/uRes.y;float mOn=uMouse.z*uMInf;float t=uTime*uPulse;"+
"float v=fx(uv,m,mOn,t);v=v*uInt*2.+(h21(gl_FragCoord.xy+fract(uTime*7.31)*91.7)-.5)*uGrain*2.;v=clamp(v,0.,1.);gl_FragColor=vec4(uCol*v,v);}\n";
var GL_FX={
lightning:"float fx(vec2 uv,vec2 m,float mOn,float t){float v=0.;float gap=mix(.06,.3,uSpread);"+
 "for(int i=0;i<7;i++){float fi=float(i);float y0=(fi-3.)*gap;float dm=exp(-pow(length(uv-m)*3.,2.))*mOn;"+
 "float j=(fbm3(vec2(uv.x*2.5+t*.9+fi*7.3,fi*3.1+t*.3))-.5)*.22+(vn(vec2(uv.x*14.-t*6.,fi*11.))-.5)*.035;"+
 "float y=y0+j+(m.y-y0)*dm*.8;float d=abs(uv.y-y);float fl=.55+.45*sin(t*3.+fi*1.7)*sin(t*7.3+fi);"+
 "float run=smoothstep(0.,.6,fract(uv.x*.25-t*.35+fi*.37));v+=(.0022/(d+.002))*fl*(.35+.8*run);}return v*.3;}",
folds:"float fx(vec2 uv,vec2 m,float mOn,float t){vec2 p=uv*mix(3.2,1.,uSpread);p+=(m-uv)*mOn*.6*exp(-length(uv-m)*2.5);"+
 "vec2 q=vec2(fbm(p+vec2(0.,t*.12)),fbm(p+vec2(5.2,1.3)-t*.1));float f=fbm(p+2.2*q+vec2(t*.05,0.));"+
 "float b=pow(.5+.5*sin(f*14.+t*.6),6.);return f*f*.75+b*.55*f;}",
dome:"float fx(vec2 uv,vec2 m,float mOn,float t){float v=0.;float thr=mix(.68,1.15,uSpread);"+
 "for(int k=0;k<36;k++){vec3 A=uP[k];vec2 a=A.xy;float fa=.25+.75*(A.z*.5+.5);float d=length(uv-a);"+
 "v+=fa*(exp(-d*d*9000.)*1.4+.00025/(d*d+.0004));"+
 "if(k<31){vec3 B=uP[k+5];float L=length(vec3((A.xy-B.xy)/.42,A.z-B.z));if(L<thr){float sd=seg(uv,a,B.xy);float fb=.25+.75*((A.z+B.z)*.25+.5);v+=.0011/(sd+.0010)*fb*.85*(.6+.4*sin(t*2.+float(k)*.7))*smoothstep(thr,thr*.72,L);}}"+
 "if(k<28){vec3 B=uP[k+8];float L=length(vec3((A.xy-B.xy)/.42,A.z-B.z));if(L<thr){float sd=seg(uv,a,B.xy);float fb=.25+.75*((A.z+B.z)*.25+.5);v+=.0011/(sd+.0010)*fb*.85*(.6+.4*sin(t*1.7+float(k)*1.3))*smoothstep(thr,thr*.72,L);}}"+
 "if(k<23){vec3 B=uP[k+13];float L=length(vec3((A.xy-B.xy)/.42,A.z-B.z));if(L<thr){float sd=seg(uv,a,B.xy);float fb=.25+.75*((A.z+B.z)*.25+.5);v+=.0011/(sd+.0010)*fb*.85*(.6+.4*sin(t*2.3+float(k)*.4))*smoothstep(thr,thr*.72,L);}}}"+
 "float r=length(uv);v+=exp(-abs(r-.47)*60.)*.12;return v*.55;}",
starfield:"float fx(vec2 uv,vec2 m,float mOn,float t){float v=fbm(uv*1.6+vec2(t*.02,0.))*.07;"+
 "for(int L=0;L<3;L++){float fl=float(L);float sc=mix(9.,30.,fl/2.)*mix(1.5,.6,uSpread);"+
 "vec2 p=uv*sc+vec2(t*.05*(3.-fl),t*.012)-m*mOn*(3.-fl)*1.2;vec2 id=floor(p),f=fract(p)-.5;float h=h21(id+fl*31.);"+
 "if(h>.68){vec2 o=(vec2(h21(id+3.1),h21(id+7.7))-.5)*.7;float d=length(f-o);float tw=.5+.5*sin(t*(1.+h*4.)+h*40.);"+
 "v+=(exp(-d*d*mix(500.,160.,fl/2.))*1.3+exp(-d*d*25.)*.08)*(.35+.65*tw)*(1.-fl*.22);}}return v;}",
terrain:"float fx(vec2 uv,vec2 m,float mOn,float t){float hor=.22,H=.95,dz=mix(.12,.4,uSpread),tr=t*.3;float base=floor(tr/dz)*dz;float v=0.;"+
 "for(int k=0;k<36;k++){float zw=base+float(k+1)*dz;float z=zw-tr+.1;float xw=uv.x*z*1.3;"+
 "float ht=fbm3(vec2(xw*.6,zw*.6))*1.1-.2;ht+=mOn*.8*exp(-pow((xw-m.x*z*1.3)*1.4,2.))*exp(-abs(z-1.4)*.7);"+
 "float y=hor+(ht-H)/z;float d=abs(uv.y-y);float fade=exp(-z*.13)*smoothstep(.25,.7,z);"+
 "float gs=abs(fract(xw*2.+.5)-.5)*.5/(z*1.3);v+=(.0007/(d+.0008))*fade*.55+exp(-(d*d+gs*gs)*60000.)*fade*1.1;}"+
 "return v;}",
topo:"float fx(vec2 uv,vec2 m,float mOn,float t){float s=mix(.011,.034,uSpread);vec2 p=uv/s;vec2 id=floor(p),f=fract(p)-.5;vec2 c=(id+.5)*s;"+
 "float f0=fbm(c*2.4+vec2(t*.07,-t*.05));f0+=mOn*.3*exp(-length(c-m)*5.);float ct=abs(fract(f0*9.)-.5)*2.;"+
 "float ln=smoothstep(.4,0.,ct);float r=.06+.34*ln+.08*f0;return smoothstep(r,r-.07,length(f))*(.2+.8*ln);}",
burst:"float fx(vec2 uv,vec2 m,float mOn,float t){vec2 c=m*mOn*.8;vec2 p=uv-c;float r=length(p);float a=atan(p.y,p.x);"+
 "float ry=pow(fbm(vec2(cos(a),sin(a))*mix(9.,3.,uSpread)+vec2(t*.15,-t*.1)),3.)*3.;"+
 "float rg=pow(.5+.5*sin(r*mix(60.,16.,uSpread)-t*4.),18.)*exp(-r*1.8);"+
 "return ry*exp(-r*1.4)*1.1+rg*.3+.008/(r+.015);}"
};
function hexRGB(h){h=String(h||"#ffffff").replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var n=parseInt(h,16)||0;return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
function createGL(){
  var c=document.createElement("canvas"),gl=null;
  try{gl=c.getContext("webgl",{premultipliedAlpha:true,alpha:true,preserveDrawingBuffer:true,antialias:false});}catch(e){}
  if(!gl)return null;
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var progs={},pts=new Float32Array(108);
  function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null;}return s;}
  function prog(type){
    if(progs[type]!==undefined)return progs[type];
    var vs=sh(gl.VERTEX_SHADER,"attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"),fs=sh(gl.FRAGMENT_SHADER,GL_HEAD+(GL_FX[type]||GL_FX.starfield)+"\n"+GL_MAIN);
    if(!vs||!fs){progs[type]=null;return null;}
    var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.warn(gl.getProgramInfoLog(pr));progs[type]=null;return null;}
    var u={};["uRes","uTime","uMouse","uInt","uSpread","uPulse","uMInf","uGrain","uCol","uP"].forEach(function(n){u[n]=gl.getUniformLocation(pr,n);});
    return progs[type]={p:pr,u:u,a:gl.getAttribLocation(pr,"p")};
  }
  function domePts(L,t,mxu,myu,on){
    var mi=on*L.mouseInf,ay=t*L.pulse*.22+mxu*mi*2,ax=.35+myu*mi*1.5,ca=Math.cos(ay),sa=Math.sin(ay),cb=Math.cos(ax),sb=Math.sin(ax);
    for(var i=0;i<36;i++){var y=1-2*(i+.5)/36,r=Math.sqrt(Math.max(0,1-y*y)),ph=i*2.39996,x=Math.cos(ph)*r,z=Math.sin(ph)*r;
      var x1=ca*x+sa*z,z1=-sa*x+ca*z,y2=cb*y-sb*z1,z2=sb*y+cb*z1,s=.42*(1.6/(2-z2*.5));
      pts[i*3]=x1*s;pts[i*3+1]=y2*s;pts[i*3+2]=z2;}
  }
  return {canvas:c,
    draw:function(L,t,mx,my,on,w,h){
      if(gl.isContextLost())return false;
      if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      var P=prog(L.type);if(!P)return false;
      gl.useProgram(P.p);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(P.a);gl.vertexAttribPointer(P.a,2,gl.FLOAT,false,0,0);
      var u=P.u,col=hexRGB(L.color);
      gl.uniform2f(u.uRes,w,h);gl.uniform1f(u.uTime,t);gl.uniform3f(u.uMouse,mx,my,on);
      gl.uniform1f(u.uInt,+L.intensity);gl.uniform1f(u.uSpread,+L.spread);gl.uniform1f(u.uPulse,+L.pulse);gl.uniform1f(u.uMInf,+L.mouseInf);gl.uniform1f(u.uGrain,+L.grain);
      gl.uniform3f(u.uCol,col[0],col[1],col[2]);
      if(L.type==="dome"&&u.uP){domePts(L,t,(mx-w/2)/h,(my-h/2)/h,on);gl.uniform3fv(u.uP,pts);}
      gl.drawArrays(gl.TRIANGLES,0,3);return true;
    },
    dispose:function(){var e=gl.getExtension("WEBGL_lose_context");if(e)e.loseContext();}
  };
}

function create(canvas){
  var ctx=canvas.getContext("2d");
  var gls=[];
  var layer=document.createElement("canvas"),lc=layer.getContext("2d");
  var q=document.createElement("canvas"),qc=q.getContext("2d");
  var grid=document.createElement("canvas"),gc=grid.getContext("2d",{willReadFrequently:true});
  var atlas=document.createElement("canvas"),ac=atlas.getContext("2d");
  var A=null,akey="",tinted={};
  var val=new Float32Array(1),work=new Float32Array(1),idx=new Uint8Array(1),over=new Int8Array(1);
  function ensure(n){if(val.length<n){val=new Float32Array(n);work=new Float32Array(n);idx=new Uint8Array(n);over=new Int8Array(n);}}
  function buildAtlas(chars,font,fs,dpr){
    var key=chars.join("")+"|"+font+"|"+fs+"|"+dpr;
    if(key===akey&&A)return;
    akey=key;tinted={};
    var gw=Math.ceil(fs*1.2*dpr)+2,gh=Math.ceil(fs*1.45*dpr)+2;
    atlas.width=Math.max(1,gw*chars.length);atlas.height=gh;
    ac.clearRect(0,0,atlas.width,gh);ac.fillStyle="#fff";ac.textAlign="center";ac.textBaseline="middle";
    ac.font="500 "+(fs*dpr)+"px "+fontStack(font);
    for(var i=0;i<chars.length;i++)ac.fillText(chars[i],i*gw+gw/2,gh/2);
    var m=new Map();chars.forEach(function(c,i){m.set(c,i);});
    A={gw:gw,gh:gh,map:m};
  }
  function tint(col){
    if(!tinted[col]){var c=document.createElement("canvas");c.width=atlas.width;c.height=atlas.height;var x=c.getContext("2d");x.drawImage(atlas,0,0);x.globalCompositeOperation="source-in";x.fillStyle=col;x.fillRect(0,0,c.width,c.height);tinted[col]=c;}
    return tinted[col];
  }

  function render(src,S,t,mouse,rec){
    if(src&&src.readyState!==undefined&&src.readyState<2)src=null;
    var dpr=S._dpr||1,W=canvas.width,H=canvas.height,Wc=W/dpr,Hc=H/dpr;
    if(layer.width!==W||layer.height!==H){layer.width=W;layer.height=H;}
    var st=S.style,fs=+S.fontSize,sp=+S.spacing;
    var square=st==="halftone"||st==="dotcross"||st==="line"||st==="particles";
    var cw=square?fs*sp:fs*0.62*sp,ch=square?fs*sp:fs*1.05*sp;
    var cols=Math.max(1,Math.ceil(Wc/cw)),rows=Math.max(1,Math.ceil(Hc/ch));
    var fx=st==="braille"?2:1,fy=st==="braille"?4:1,gx=cols*fx,gy=rows*fy,n=gx*gy;
    ensure(n);

    /* 1. source -> quality buffer -> sample grid */
    var qw=+S.quality||480,qh=Math.max(1,Math.round(qw*Hc/Wc));
    if(q.width!==qw||q.height!==qh){q.width=qw;q.height=qh;}
    qc.fillStyle="#000";qc.fillRect(0,0,qw,qh);
    if(src){var sw=src.videoWidth||src.naturalWidth||src.width,sh=src.videoHeight||src.naturalHeight||src.height;
      if(sw&&sh){var sc=Math.max(qw/sw,qh/sh),dw=sw*sc,dh=sh*sc;qc.drawImage(src,(qw-dw)/2,(qh-dh)/2,dw,dh);}}
    var LY=S.layers||[],sepB=[],sepA=[];
    if(LY.length){
      var glS=Math.min(dpr,1.5,2200/Wc),gw2=Math.max(1,Math.round(Wc*glS)),gh2=Math.max(1,Math.round(Hc*glS)),mon=mouse&&mouse.on?1:0;
      for(var li=0;li<LY.length;li++){
        var Ly=LY[li];if(gls[li]===undefined)gls[li]=createGL();var G2=gls[li];if(!G2)continue;
        if(!G2.draw(Ly,t,mon?mouse.x*glS:0,mon?(Hc-mouse.y)*glS:0,mon,gw2,gh2))continue;
        if(Ly.affects==="fx"){qc.globalCompositeOperation="lighter";qc.drawImage(G2.canvas,0,0,qw,qh);qc.globalCompositeOperation="source-over";}
        else (Ly.place==="above"?sepA:sepB).push(G2.canvas);
      }
    }
    if(grid.width!==gx||grid.height!==gy){grid.width=gx;grid.height=gy;}
    gc.clearRect(0,0,gx,gy);gc.imageSmoothingEnabled=true;gc.drawImage(q,0,0,gx,gy);
    var px=gc.getImageData(0,0,gx,gy).data;

    /* 2. tone + FX */
    var FX=S.fx,s=+S.fxStrength,d=DIRS[S.dir]||DIRS.E;
    var br=S.brightness/100,ct=+S.contrast,vg=+S.vignette,inv=!!S.invert;
    var nsc=Math.max(1,S.noiseScale*4),nspd=S.noiseSpeed*60;
    var gk=Math.floor(t*9),rk=Math.floor(t*12);
    var retroN=st==="retro"?+S.retroNoise:0;
    var bgD=+S.bgDither,invD=+S.invDither;
    var bbias=st==="braille"?(S.brailleDensity==="sparse"?-0.14:S.brailleDensity==="dense"?0.14:0):0;
    var pmin=0,pspan=1;
    if(FX==="beam"){var cc=[0,Wc*d[0],Hc*d[1],Wc*d[0]+Hc*d[1]];pmin=Math.min.apply(null,cc);pspan=(Math.max.apply(null,cc)-pmin)||1;}
    var beamPos=((t*0.32)%1.3)-0.15;
    var period=Math.max(1,S.intSpacing*cw),iw=S.intWidth*cw,ishift=t*S.intSpeed*80;
    var crtRoll=(((t*0.22)%1.25)-0.12)*rows;
    var mlen=Math.max(1,+S.matScale),mspd=+S.matSpeed;
    over.fill(0,0,n);
    for(var j=0;j<gy;j++){
      var cj=(j/fy)|0,y=(j+.5)*ch/fy,shift=0,crt=1;
      if(FX==="glitch"){
        if(hash(cj,gk*7+3)<s*0.22)shift=Math.round((hash(cj,gk)-.5)*s*40)*fx;
        var bl=(cj/5)|0;if(hash(bl,gk*13+1)<s*0.1)shift+=Math.round((hash(bl+9,gk)-.5)*s*70)*fx;
      }else if(FX==="crt"){
        crt=((cj&1)?1-0.55*s:1)*(1-s*0.15*hash(gk,1));
        var rd=(cj-crtRoll)/(rows*0.07);crt*=1+s*0.6*Math.exp(-rd*rd);
      }
      for(var i=0;i<gx;i++){
        var si=i+shift;si=si<0?0:si>=gx?gx-1:si;
        var o=(j*gx+si)*4,k=j*gx+i;
        var v=(0.2126*px[o]+0.7152*px[o+1]+0.0722*px[o+2])/255;
        v=(v+br-0.5)*ct+0.5;
        if(inv)v=1-v;
        var x=(i+.5)*cw/fx;
        if(vg>0){var nx=x/Wc-.5,ny=y/Hc-.5;v*=1-vg*Math.min(1,(nx*nx+ny*ny)*2.6);}
        if(FX==="noise"){v+=(fbm((x-d[0]*t*nspd)/nsc,(y-d[1]*t*nspd)/nsc)-0.5)*s*1.5;}
        else if(FX==="intervals"){var p=x*d[0]+y*d[1]-ishift,m=((p%period)+period)%period;if(m<iw)v+=s*(1-v)*0.95;else v*=1-s*0.35;}
        else if(FX==="beam"){var pb=((x*d[0]+y*d[1])-pmin)/pspan,bd=(pb-beamPos)/0.055,bb=Math.exp(-bd*bd);v=v*(1-s*0.3)+bb*s*1.3;}
        else if(FX==="glitch"){if(hash(i+gk*31,j)<s*0.025){v=Math.max(v,0.85);over[k]=-2;}}
        else if(FX==="crt")v*=crt;
        else if(FX==="matrix"){
          var ci=(i/fx)|0,cyc=rows+mlen*2;
          var head=((t*(0.35+hash(ci,77))*mspd*14+hash(ci,5)*cyc*3)%cyc)-mlen*0.5,dist=head-(j/fy);
          if(dist>=0&&dist<mlen){var tr=1-dist/mlen;v=Math.max(v*(1-s*0.5),tr*s*1.1);if(dist<1)over[k]=-1;}else v*=1-s*0.5;
        }
        if(retroN)v+=(hash(i*3+rk,j*7+rk)-.5)*retroN*0.55;
        if(bgD||invD){var bq=BAYER[(j&3)*4+(i&3)],c0=v<0?0:v>1?1:v;if(bgD)v+=bgD*0.25*(bq-0.2)*(1-c0)*(1-c0)*(1-c0);if(invD)v-=invD*0.25*bq*c0*c0*c0;}
        v+=bbias;
        val[k]=v<0?0:v>1?1:v;
      }
    }

    /* 3. levels */
    var ramp=null,Lv;
    if(st==="classic"){var cs=S.charset==="custom"?String(S.customChars||""):(CHARSETS[S.charset]||CHARSETS.standard);ramp=Array.from(cs);
      if(ramp.length===0)ramp=[" ","#"];else if(ramp.length===1)ramp=[" ",ramp[0]];Lv=ramp.length-1;}
    else if(st==="claude"){ramp=CLAUDE;Lv=ramp.length-1;}
    else if(st==="retro"){ramp=[" ","░","▒","▓","█"];Lv=4;}
    else if(st==="terminal")Lv=5;
    else if(st==="braille")Lv=1;
    else if(st==="dotcross")Lv=4;
    else Lv=8;

    /* 4. dither */
    var D=S.dither,ds=+S.ditherStrength;
    if(D==="floyd"||D==="atkinson"){
      work.set(val.subarray(0,n));
      for(j=0;j<gy;j++)for(i=0;i<gx;i++){
        k=j*gx+i;var ov=work[k]*Lv,qv=Math.round(ov);qv=qv<0?0:qv>Lv?Lv:qv;idx[k]=qv;var e=(ov-qv)/Lv*ds;
        if(D==="floyd"){if(i+1<gx)work[k+1]+=e*0.4375;if(j+1<gy){if(i>0)work[k+gx-1]+=e*0.1875;work[k+gx]+=e*0.3125;if(i+1<gx)work[k+gx+1]+=e*0.0625;}}
        else{var e8=e/8;if(i+1<gx)work[k+1]+=e8;if(i+2<gx)work[k+2]+=e8;if(j+1<gy){if(i>0)work[k+gx-1]+=e8;work[k+gx]+=e8;if(i+1<gx)work[k+gx+1]+=e8;}if(j+2<gy)work[k+2*gx]+=e8;}
      }
    }else if(D==="bayer"){
      for(j=0;j<gy;j++)for(i=0;i<gx;i++){k=j*gx+i;var qb=Math.floor(val[k]*Lv+(BAYER[(j&3)*4+(i&3)]-0.5)*ds+0.5);idx[k]=qb<0?0:qb>Lv?Lv:qb;}
    }else{for(k=0;k<n;k++)idx[k]=Math.round(val[k]*Lv);}

    /* 5. draw */
    lc.setTransform(1,0,0,1,0,0);lc.globalCompositeOperation="source-over";lc.globalAlpha=1;lc.filter="none";lc.clearRect(0,0,W,H);
    var mode=st==="retro"?"retro":S.colorMode;
    var mOn=mouse&&mouse.on&&S.mouse!=="off",mx=mOn?mouse.x:0,my=mOn?mouse.y:0,area=+S.area,hov=+S.hover,spr=Math.max(.05,+S.spread),attract=S.mouse==="attract";
    var OX=0,OY=0,dNoise=FX==="noise",dCrt=FX==="crt";
    function disp(cx,cy){
      OX=0;OY=0;
      if(dNoise){var nn=noise((cx-d[0]*t*nspd)/nsc+11.7,(cy-d[1]*t*nspd)/nsc-3.3)-.5;OX=(d[0]*2.2-d[1]*.7)*nn*s*cw;OY=(d[1]*2.2+d[0]*.7)*nn*s*ch;}
      else if(dCrt)OX=Math.sin(cy*.045+t*9)*s*1.6;
      if(mOn){var dx=cx-mx,dy=cy-my,dd=Math.sqrt(dx*dx+dy*dy);
        if(dd<area&&dd>.01){var f=Math.pow(1-dd/area,1/spr),mm=hov*f;if(attract){mm=Math.min(mm,dd*.9);OX-=dx/dd*mm;OY-=dy/dd*mm;}else{OX+=dx/dd*mm;OY+=dy/dd*mm;}}}
    }
    var monoCol=mode==="custom"?S.customColor:(MONO[mode]||MONO.gray);
    var pal=RETRO[S.retroPalette]||RETRO.amber;
    function recColor(k4,lvl){if(mode==="full")return "#"+hex2(px[k4]*1.15)+hex2(px[k4+1]*1.15)+hex2(px[k4+2]*1.15);if(mode==="retro")return pal[Math.max(0,lvl-1)];return null;}
    function paint(c,a,stroke){return (c?(stroke?' stroke="':' fill="')+c+'"':"")+(a<0.995?(stroke?' stroke-opacity="':' fill-opacity="')+a.toFixed(2)+'"':"");}

    var glyph=st==="classic"||st==="claude"||st==="retro"||st==="terminal";
    var cx,cy,X,Y,gw,gh,hw,hh,id,a,lv;
    if(glyph){
      var pool=st==="terminal"?Array.from(TERM[S.termSet]||TERM.binary):null;
      var chars=st==="terminal"?Array.from(new Set(pool)):st==="claude"?Array.from(new Set(ramp.concat(SPIN))):Array.from(new Set(ramp));
      buildAtlas(chars,S.font,fs,dpr);
      gw=A.gw;gh=A.gh;hw=gw/2;hh=gh/2;
      var map=A.map,rampGI=ramp?ramp.map(function(c){return map.get(c);}):null,spinGI=SPIN.map(function(c){return map.get(c);}),poolGI=pool?pool.map(function(c){return map.get(c);}):null;
      var tAt=st==="retro"?pal.map(tint):null,tick=Math.floor(t*10);
      for(j=0;j<rows;j++){cy=(j+.5)*ch;for(i=0;i<cols;i++){
        k=j*cols+i;id=idx[k];var ovr=over[k];
        if(ovr<0){id=1+((hash(i*7+tick,j)*Lv)|0);if(id>Lv)id=Lv;a=1;}
        else{if(id===0)continue;a=st==="terminal"?0.25+0.75*id/Lv:st==="retro"?1:0.3+0.7*id/Lv;}
        var gi,c;
        if(st==="terminal"){var pi=(hash(i,j*31+Math.floor(t*2.5+hash(j,i)*5))*pool.length)|0;gi=poolGI[pi];c=pool[pi];}
        else if(st==="claude"&&id>=Lv*0.6&&ovr===0){var sj=Math.floor(t*9+hash(i,j)*12)%SPIN.length;gi=spinGI[sj];c=SPIN[sj];}
        else{gi=rampGI[id];c=ramp[id];}
        if(gi===undefined||c===" ")continue;
        cx=(i+.5)*cw;disp(cx,cy);X=cx+OX;Y=cy+OY;
        lc.globalAlpha=a;
        lc.drawImage(tAt?tAt[Math.max(0,id-1)]:atlas,gi*gw,0,gw,gh,X*dpr-hw,Y*dpr-hh,gw,gh);
        if(rec)rec.push('<text x="'+f1(X)+'" y="'+f1(Y)+'"'+paint(recColor(k*4,id),a)+'>'+esc(c)+'</text>');
      }}
    }else if(st==="braille"){
      buildAtlas(BRAILLE,S.font,fs,dpr);gw=A.gw;gh=A.gh;hw=gw/2;hh=gh/2;
      for(j=0;j<rows;j++){cy=(j+.5)*ch;for(i=0;i<cols;i++){
        var bits=0,cnt=0;
        for(var b=0;b<8;b++){var B=BBITS[b];if(idx[(j*4+B[1])*gx+i*2+B[0]]){bits|=B[2];cnt++;}}
        if(!bits)continue;
        a=0.55+0.45*cnt/8;cx=(i+.5)*cw;disp(cx,cy);X=cx+OX;Y=cy+OY;
        lc.globalAlpha=a;lc.drawImage(atlas,bits*gw,0,gw,gh,X*dpr-hw,Y*dpr-hh,gw,gh);
        if(rec)rec.push('<text x="'+f1(X)+'" y="'+f1(Y)+'"'+paint(recColor(((j*4)*gx+i*2)*4,1),a)+'>'+BRAILLE[bits]+'</text>');
      }}
    }else if(st==="halftone"){
      var spec=SHAPES[S.htShape]||null,rot=S.htRot*Math.PI/180,hs=+S.htSize;
      lc.fillStyle="#fff";lc.beginPath();
      for(j=0;j<rows;j++){cy=(j+.5)*ch;for(i=0;i<cols;i++){
        k=j*cols+i;id=idx[k];if(!id)continue;lv=id/Lv;
        var r=Math.sqrt(lv)*cw*0.5*hs*1.1;if(r<0.3)continue;
        cx=(i+.5)*cw;disp(cx,cy);X=cx+OX;Y=cy+OY;
        if(!spec){lc.moveTo((X+r)*dpr,Y*dpr);lc.arc(X*dpr,Y*dpr,r*dpr,0,6.2832);
          if(rec)rec.push('<circle cx="'+f1(X)+'" cy="'+f1(Y)+'" r="'+f1(r)+'"'+paint(recColor(k*4,id),1)+'/>');}
        else{var pp=polyPts(spec[0],spec[1],X,Y,r*spec[2],rot);lc.moveTo(pp[0]*dpr,pp[1]*dpr);for(var pq=2;pq<pp.length;pq+=2)lc.lineTo(pp[pq]*dpr,pp[pq+1]*dpr);lc.closePath();
          if(rec)rec.push('<polygon points="'+ptsStr(pp)+'"'+paint(recColor(k*4,id),1)+'/>');}
      }}
      lc.fill();
    }else if(st==="dotcross"){
      lc.fillStyle="#fff";lc.beginPath();
      for(j=0;j<rows;j++){cy=(j+.5)*ch;for(i=0;i<cols;i++){
        k=j*cols+i;id=idx[k];if(!id)continue;
        cx=(i+.5)*cw;disp(cx,cy);X=cx+OX;Y=cy+OY;var col=rec?recColor(k*4,id):null;
        if(id<=2){var rr=cw*(id===1?0.1:0.19);lc.moveTo((X+rr)*dpr,Y*dpr);lc.arc(X*dpr,Y*dpr,rr*dpr,0,6.2832);
          if(rec)rec.push('<circle cx="'+f1(X)+'" cy="'+f1(Y)+'" r="'+f1(rr)+'"'+paint(col,1)+'/>');}
        else{var ang=id===3?0:Math.PI/4,len=cw*0.38,th=cw*0.13;
          for(var arm=0;arm<2;arm++){var rp=rectPts(X,Y,len,th,ang+arm*Math.PI/2);lc.moveTo(rp[0]*dpr,rp[1]*dpr);for(var rq=2;rq<8;rq+=2)lc.lineTo(rp[rq]*dpr,rp[rq+1]*dpr);lc.closePath();
            if(rec)rec.push('<polygon points="'+ptsStr(rp)+'"'+paint(col,1)+'/>');}}
      }}
      lc.fill();
    }else if(st==="line"){
      var lrot=S.lineRot*Math.PI/180,paths=[];for(var pl=0;pl<=Lv;pl++)paths.push(new Path2D());
      for(j=0;j<rows;j++){cy=(j+.5)*ch;for(i=0;i<cols;i++){
        k=j*cols+i;id=idx[k];if(!id)continue;lv=id/Lv;
        var gxv=(i+1<gx?val[k+1]:val[k])-(i>0?val[k-1]:val[k]),gyv=(j+1<gy?val[k+gx]:val[k])-(j>0?val[k-gx]:val[k]);
        var la=lrot;if(Math.abs(gxv)+Math.abs(gyv)>0.02)la+=Math.atan2(gyv,gxv)+Math.PI/2;
        var L=(0.25+0.75*lv)*cw*0.5*S.lineLen,ldx=Math.cos(la)*L,ldy=Math.sin(la)*L;
        cx=(i+.5)*cw;disp(cx,cy);X=cx+OX;Y=cy+OY;
        paths[id].moveTo((X-ldx)*dpr,(Y-ldy)*dpr);paths[id].lineTo((X+ldx)*dpr,(Y+ldy)*dpr);
        if(rec)rec.push('<line x1="'+f1(X-ldx)+'" y1="'+f1(Y-ldy)+'" x2="'+f1(X+ldx)+'" y2="'+f1(Y+ldy)+'" stroke-width="'+f1(Math.max(0.2,S.lineThick*(0.35+0.65*lv*S.lineWidth)))+'"'+paint(recColor(k*4,id),1,true)+'/>');
      }}
      lc.strokeStyle="#fff";lc.lineCap="round";
      for(pl=1;pl<=Lv;pl++){lc.lineWidth=Math.max(0.2,S.lineThick*(0.35+0.65*(pl/Lv)*S.lineWidth))*dpr;lc.stroke(paths[pl]);}
    }else if(st==="particles"){
      var pc=Array.from(String(S.partChar||"*"))[0]||"*";
      buildAtlas([pc],S.font,fs,dpr);gw=A.gw;gh=A.gh;hw=gw/2;hh=gh/2;var dens=+S.partDensity;
      for(j=0;j<rows;j++)for(i=0;i<cols;i++){
        k=j*cols+i;id=idx[k];if(!id)continue;lv=id/Lv;
        var h1=hash(i,j);if(h1>dens*(0.3+lv*1.1))continue;
        var h2=hash(j+13,i),h3=hash(i+7,j+29);
        cx=(i+h2)*cw+Math.sin(t*(0.6+h3)+h1*6.28)*cw*0.6;cy=(j+h3)*ch+Math.cos(t*(0.5+h2)+h2*6.28)*ch*0.6;
        disp(cx,cy);X=cx+OX;Y=cy+OY;var scl=0.55+0.7*lv;a=0.35+0.65*lv;
        lc.globalAlpha=a;lc.drawImage(atlas,0,0,gw,gh,X*dpr-hw*scl,Y*dpr-hh*scl,gw*scl,gh*scl);
        if(rec)rec.push('<text x="'+f1(X)+'" y="'+f1(Y)+'" font-size="'+f1(fs*scl)+'"'+paint(recColor(k*4,id),a)+'>'+esc(pc)+'</text>');
      }
    }

    /* 6. colorize */
    lc.globalAlpha=1;
    if(mode!=="retro"){
      lc.globalCompositeOperation="source-in";
      if(mode==="full"){lc.filter="saturate(1.25) brightness(1.15)";lc.imageSmoothingEnabled=true;lc.drawImage(q,0,0,W,H);lc.filter="none";}
      else{lc.fillStyle=monoCol;lc.fillRect(0,0,W,H);}
      lc.globalCompositeOperation="source-over";
    }

    /* 7. composite */
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";ctx.filter="none";
    if(S.transparent)ctx.clearRect(0,0,W,H);else{ctx.fillStyle=S.bg||"#000";ctx.fillRect(0,0,W,H);}
    if(sepB.length){ctx.globalCompositeOperation="lighter";sepB.forEach(function(c){ctx.drawImage(c,0,0,W,H);});ctx.globalCompositeOperation="source-over";}
    var op=+S.opacity;
    if(S.glow>0){ctx.filter="blur("+((2+S.glow*14)*dpr).toFixed(1)+"px)";ctx.globalCompositeOperation="lighter";ctx.globalAlpha=Math.min(1,S.glow*1.3)*op;ctx.drawImage(layer,0,0);ctx.filter="none";ctx.globalCompositeOperation="source-over";}
    ctx.globalAlpha=op;ctx.drawImage(layer,0,0);ctx.globalAlpha=1;
    if(sepA.length){ctx.globalCompositeOperation="lighter";sepA.forEach(function(c){ctx.drawImage(c,0,0,W,H);});ctx.globalCompositeOperation="source-over";}
    if(rec){rec.behind=sepB.map(function(c){return c.toDataURL("image/png");});rec.above=sepA.map(function(c){return c.toDataURL("image/png");});}
    return {cols:cols,rows:rows,W:Wc,H:Hc};
  }

  function svg(src,S,t,mouse){
    var parts=[],info=render(src,S,t,mouse,parts),st=S.style,mode=st==="retro"?"retro":S.colorMode;
    var mono=(mode==="full"||mode==="retro")?null:(mode==="custom"?S.customColor:MONO[mode]);
    var stroke=st==="line";
    var glow=S.glow>0?'<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="'+(S.glow*6).toFixed(2)+'" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>':"";
    var g=(mono?(stroke?' stroke="'+mono+'"':' fill="'+mono+'"'):"")+(stroke?' stroke-linecap="round" fill="none"':"")+' opacity="'+S.opacity+'" font-family=\''+fontStack(S.font)+'\' font-size="'+S.fontSize+'" font-weight="500" text-anchor="middle" dominant-baseline="central"'+(glow?' filter="url(#glow)"':"");
    var img=function(u,blend){return '<image href="'+u+'" x="0" y="0" width="'+f1(info.W)+'" height="'+f1(info.H)+'" preserveAspectRatio="none"'+(blend?' style="mix-blend-mode:screen"':'')+'/>';};
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.round(info.W)+'" height="'+Math.round(info.H)+'" viewBox="0 0 '+f1(info.W)+' '+f1(info.H)+'">'+(glow?'<defs>'+glow+'</defs>':'')+(S.transparent?'':'<rect width="100%" height="100%" fill="'+S.bg+'"/>')+
      (parts.behind||[]).map(function(u){return img(u,!S.transparent);}).join("")+'<g'+g+'>'+parts.join("")+'</g>'+(parts.above||[]).map(function(u){return img(u,true);}).join("")+'</svg>';
  }
  return {render:render,svg:svg,invalidate:function(){akey="";A=null;},dispose:function(){gls.forEach(function(g){if(g)g.dispose();});gls=[];}};
}
G.Glyphomat={create:create,fontStack:fontStack};
}
GlyphomatEngine(window);
