'use strict';
/* §8a reviewer sampler v3 — run_20261102-2015 matted chibis (Instructions v1.2).
 * Inputs: videsign lib/png, lib/ciede2000 (Sharma-validated), review-config v1.2 numbers. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..', '..');
const { decodePng } = require(path.join(ROOT, 'scripts/lib/png'));
const ciede = require(path.join(ROOT, 'scripts/lib/ciede2000'));
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/anchors-incoming/review-config.v1.2.json'), 'utf8'));
const PAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'canon/vwxyz/palette.json'), 'utf8'));
const DE = ciede.deltaE00;
const clamp = (v,a,b)=>v<a?a:(v>b?b:v);
const rgb2hex = (r,g,b)=>'#'+[r,g,b].map(n=>clamp(Math.round(n),0,255).toString(16).padStart(2,'0')).join('').toUpperCase();
const LCACHE=new Map();
function labOf(k,r,g,b){ let v=LCACHE.get(k); if(!v){v=ciede.hexToLab(rgb2hex(r,g,b)); LCACHE.set(k,v);} return v; }
const hueOf=l=>{const d=Math.atan2(l[2],l[1])*180/Math.PI;return d<0?d+360:d;};
const hueDist=(a,b)=>{const x=Math.abs(a-b)%360;return x>180?360-x:x;};
const median=a=>{if(!a.length)return null;const s=a.slice().sort((p,q)=>p-q);const n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};

const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xffffffff;for(const v of b)c=CRC[(c^v)&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(t,bo){const o=Buffer.alloc(12+bo.length);o.writeUInt32BE(bo.length,0);o.write(t,4,'ascii');bo.copy(o,8);o.writeUInt32BE(crc32(o.subarray(4,8+bo.length)),8+bo.length);return o;}
function writePng(f,w,h,rgba){const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;rgba.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);}const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;fs.writeFileSync(f,Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]));}
function comps(mask,W,H,minSize){const seen=new Uint8Array(mask.length);const out=[];for(let i=0;i<mask.length;i++){if(!mask[i]||seen[i])continue;const st=[i];seen[i]=1;const list=[];while(st.length){const j=st.pop();list.push(j);const x=j%W,y=(j/W)|0;if(x>0&&mask[j-1]&&!seen[j-1]){seen[j-1]=1;st.push(j-1);}if(x<W-1&&mask[j+1]&&!seen[j+1]){seen[j+1]=1;st.push(j+1);}if(y>0&&mask[j-W]&&!seen[j-W]){seen[j-W]=1;st.push(j-W);}if(y<H-1&&mask[j+W]&&!seen[j+W]){seen[j+W]=1;st.push(j+W);}}if(list.length>=(minSize||1))out.push(list);}out.sort((a,b)=>b.length-a.length);return out;}
function dilate(mask,W,H,r){const o=new Uint8Array(mask.length);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!mask[i])continue;for(let dy=-r;dy<=r;dy++){const ny=y+dy;if(ny<0||ny>=H)continue;const rw=ny*W;for(let dx=-r;dx<=r;dx++){const nx=x+dx;if(nx<0||nx>=W)continue;o[rw+nx]=1;}}}return o;}

function analyze(file){
  const png=decodePng(fs.readFileSync(file)); const W=png.width,H=png.height;
  const at=(x,y)=>png.pixelAt(x,y); const base=path.basename(file);
  const m=/^(violet|wisteria|xylia|yarrow|zinnia)_chibi_([a-z-]+)_(v[0-9]{3})\.png$/.exec(base); if(!m) return {file:base,error:'name'};
  const vi=m[1],slot=m[2],ver=m[3]; const e=PAL.vi[vi];
  const cl={sig:ciede.hexToLab(e.signature),hair:ciede.hexToLab(e.hair),eyes:ciede.hexToLab(e.eyes),line:ciede.hexToLab(PAL.shared.lineart),shirt:ciede.hexToLab(PAL.shared.shirt),blazer:ciede.hexToLab(PAL.shared.blazer),skin:ciede.hexToLab(PAL.shared.skin),tieB:ciede.hexToLab(PAL.shared.tie_black),tieC:ciede.hexToLab(PAL.shared.tie_charcoal),inner:ciede.hexToLab(e.inner_ear)};
  const sigHue=hueOf(cl.sig),eyeHue=hueOf(cl.eyes),sigC=Math.hypot(cl.sig[1],cl.sig[2]),eyeC=Math.hypot(cl.eyes[1],cl.eyes[2]);
  const band=Math.floor(Math.min(W,H)*3/100);
  const A=new Uint8Array(W*H),F=new Uint8Array(W*H);let bandLeak=0,alphaCount=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;const a=at(x,y)[3];if(a>0){A[i]=1;alphaCount++;if((x<band||x>=W-band||y<band||y>=H-band)&&a>8)bandLeak++;}if(a>=180)F[i]=1;}
  const Fcomps=comps(F,W,H,500); const fig=Fcomps[0]; if(!fig)return{file:base,vi,slot,ver,error:'no-figure'};
  let otherCore=0; for(let kk=1;kk<Fcomps.length;kk++) otherCore+=Fcomps[kk].length;
  const fmask=new Uint8Array(W*H);fig.forEach(i=>fmask[i]=1);
  let x0=W,y0=H,x1=0,y1=0,nCore=0;fig.forEach(i=>{nCore++;const x=i%W,y=(i/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;});
  const fw=x1-x0+1,fh=y1-y0+1,fc=(x0+x1)/2;
  const yHair=y0+fh*0.17,yBrowTop=y0+fh*0.29,yBrowBot=y0+fh*0.47,yHeadEnd=y0+fh*0.55,yTorsoEnd=y0+fh*0.80;
  const families={underlight:[],eyes:[],hair:[],inner:[],trim:[],tail:[],shirt:[],tie:[],blazer:[],legs:[],other:[]};
  let rimSkips=0;
  const faceRows=[]; const faceEllipse=(x,y)=>{const dx=(x-fc)/(0.30*fw),dy=(y-(y0+0.38*fh))/(0.20*fh);return dx*dx+dy*dy<=1;};
  const lineCount={n:0};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x;if(!fmask[i])continue;
    const [r,g,b]=at(x,y);const k=(r<<16)|(g<<8)|b;const lab=labOf(k,r,g,b);
    const C=Math.hypot(lab[1],lab[2]),hue=hueOf(lab);
        const isSkin=DE(lab,cl.skin)<=18;
    if(DE(lab,cl.inner)<=15&&y>yHair&&y<y0+0.34*fh&&Math.abs(x-fc)>0.16*fw){families.inner.push({i,x,y,k,lab});continue;}
    if(!(y>=y0+0.44*fh&&Math.abs(x-fc)<=0.11*fw)&&faceEllipse(x,y)&&y>=yBrowTop&&y<yBrowBot){
      if(hueDist(hue,eyeHue)<=15&&C>=Math.max(14,eyeC*0.40)){families.eyes.push({i,x,y,k,lab});faceRows.push(i);continue;}
      if(hueDist(hue,sigHue)<=15&&C>=Math.max(14,sigC*0.40)){families.eyes.push({i,x,y,k,lab});faceRows.push(i);continue;}
      continue; // face (skin/blush/light) not sampled
    }
    if(hueDist(hue,sigHue)<=15&&C>=Math.max(12,sigC*0.42)){
      if(y<yHair){ rimSkips++; continue; }
      if(y<yBrowTop) families.underlight.push({i,x,y,k,lab});
      else if(y<=yHeadEnd&&y>=yBrowTop) families.trim.push({i,x,y,k,lab});
      else if(y>yHeadEnd||Math.abs(x-fc)>0.36*fw) families.tail.push({i,x,y,k,lab});
      else families.trim.push({i,x,y,k,lab});
      continue;
    }
    if(y<yHeadEnd){
      if(y>=y0+0.38*fh && Math.abs(x-fc)<=0.11*fw){
        if(DE(lab,cl.shirt)<=16 && lab[0]>70){ families.shirt.push({i,x,y,k,lab}); continue; }
        if(lab[0]<40){ families.tie.push({i,x,y,k,lab}); continue; }
      }
      if(DE(lab,cl.hair)<=26) families.hair.push({i,x,y,k,lab});
      else families.other.push({i,x,y,k,lab});
      continue;
    }
    if(isSkin){ continue; } // hands
    if(y>=yHeadEnd&&y<yTorsoEnd){
      if(DE(lab,cl.shirt)<=16&&lab[0]>60&&Math.abs(x-fc)<=0.13*fw&&y>=y0+0.40*fh){families.shirt.push({i,x,y,k,lab});continue;}
      if(lab[0]<40&&C<=12&&Math.abs(x-fc)<=0.07*fw&&y>=y0+0.44*fh&&y<=y0+0.62*fh){families.tie.push({i,x,y,k,lab});continue;}
      if(lab[0]<40&&C<=12){
        if(Math.abs(x-fc)<=0.07*fw&&y>=y0+0.44*fh&&y<=y0+0.62*fh)families.tie.push({i,x,y,k,lab});
        else families.blazer.push({i,x,y,k,lab});
        continue;
      }
      if(DE(lab,cl.hair)<=26||DE(lab,cl.blazer)<=26){families.blazer.push({i,x,y,k,lab});continue;}
      families.other.push({i,x,y,k,lab});continue;
    }
    if(lab[0]<40||DE(lab,cl.hair)<=26||DE(lab,cl.blazer)<=26){families.legs.push({i,x,y,k,lab});continue;}
    families.other.push({i,x,y,k,lab});
  }
  function regionOf(list,label,minPx){
    if(list.length<(minPx||60))return{label,empty:true,px:list.length};
    const items=new Map(); for(const o of list) items.set(o.i,o);
    const cs=comps(selMask(list),W,H,16); global.__DBG=global.__DBG||[]; global.__DBG.push([label,list.length,cs.length,cs.length?cs[0].length:0]);
    if(!cs.length) return {label,empty:true,px:list.length};
    let mainIdx=cs[0].slice();
    if(label==='eyes'&&cs[1]) mainIdx=mainIdx.concat(cs[1]);
    const main=mainIdx.map(i=>items.get(i)).filter(Boolean);
    if(main.length<(minPx||60)) return {label,empty:true,px:list.length};
    let nx0=W,ny0=H,nx1=0,ny1=0;
    main.forEach(o=>{if(o.x<nx0)nx0=o.x;if(o.x>nx1)nx1=o.x;if(o.y<ny0)ny0=o.y;if(o.y>ny1)ny1=o.y;});
    const hist=new Map(); main.forEach(o=>{hist.set(o.k,(hist.get(o.k)||[]));hist.get(o.k).push(o);});
    const piles=[...hist.entries()].map(([k,plist])=>{const c=[(k>>16)&255,(k>>8)&255,k&255];
      return {c,list:plist,lab:ciede.hexToLab(rgb2hex(c[0],c[1],c[2]))};}).sort((a,b)=>b.list.length-a.list.length);
    const clusters=[]; let pools=piles.slice();
    while(pools.length){
      const seed=pools.shift(); const clus=[seed];
      for(let x=0;x<pools.length;){ const p=pools[x];
        if(DE(p.lab,seed.lab)<=6){ clus.push(p); pools.splice(x,1); } else x++;
      }
      clusters.push({list:[].concat(...clus.map(p=>p.list)), lab:seed.lab, c:seed.c});
    }
    clusters.sort((a,b)=>b.list.length-a.list.length);
    const thin=(label==='underlight'||label==='trim'||label==='eyes');
    const big=clusters.filter(p=>p.list.length>=Math.max(thin?16:40,thin?0.004:0.05*main.length));
    if(!big.length) { const md=piles[0]; return {label,empty:true,px:list.length,mode:rgb2hex(md.c[0],md.c[1],md.c[2])}; }
    let hlList=[]; let pool=big.slice();
    if(pool.length>1){
      const lt=pool[pool.length-1]; // smallest share cluster; see if sparkle-like
      for(const p of pool){
        if(p!==pool[0] && p.lab[0]>pool[0].lab[0]+10 && p.list.length<=0.12*main.length) hlList.push(p);
      }
      pool=pool.filter(p=>!hlList.includes(p));
    }
    let lit;
    if(pool.length>=2){
      const a=pool[0], b=pool[1];
      lit = (b.lab[0] >= a.lab[0]) ? ((b.lab[0]-a.lab[0]>=2.5)?b:a) : ((a.lab[0]-b.lab[0]>=2.5)?a:b);
    } else lit=pool[0];
    const litWas=big.indexOf(lit);
    const rs=[],gs=[],bs=[]; lit.list.forEach(o=>{const p=at(o.x,o.y);rs.push(p[0]);gs.push(p[1]);bs.push(p[2]);});
    const litHex=rgb2hex(median(rs),median(gs),median(bs)); const litLab=ciede.hexToLab(litHex);
    let shadow=null,highlight=null;
    for(const p of pool){ if(p===lit) continue;
      if(p.lab[0]<litLab[0]-3){ if(!shadow||p.list.length>shadow.list.length) shadow=p; }
    }
    for(const p of hlList){ if(!highlight||p.list.length>highlight.list.length) highlight={hex:rgb2hex(p.c[0],p.c[1],p.c[2]),frac:+(p.list.length/main.length).toFixed(3),list:p.list}; }
    return {label,px:list.length,main:main.length,comps:cs.length,crop:[nx0,ny0,nx1,ny1],dbg:{bigN:big.length,topShare:+(big.length?big[0].list.length/main.length:0),mainN:main.length, clusterN:clusters.length},
      lit:{hex:litHex,lab:[+litLab[0].toFixed(1),+litLab[1].toFixed(1),+litLab[2].toFixed(1)],px:lit.list.length},
      shadow:shadow?{hex:rgb2hex(shadow.c[0],shadow.c[1],shadow.c[2]),hueOfShadow:+hueOf(shadow.lab).toFixed(1)}:null,
      highlight, offPct:+(1-lit.list.length/main.length).toFixed(3), pileCount:big.length};
  }
  const selMask=idx=>{const mm=new Uint8Array(W*H);for(const o of idx)mm[o.i]=1;return mm;};

  const R = {
    hair: regionOf(families.hair, 'hair'),
    underlight: regionOf(families.underlight, 'underlight', 60),
    eyes: regionOf(families.eyes, 'eyes', 200),
    inner: regionOf(families.inner, 'inner', 200),
    trim: regionOf(families.trim, 'trim', 60),
    tail: regionOf(families.tail, 'tail', 120),
    shirt: regionOf(families.shirt, 'shirt', 60),
    tie: regionOf(families.tie, 'tie', 40),
    blazer: regionOf(families.blazer, 'blazer'),
  };
  const innerPatches = comps(selMask(families.inner), W, H, 300).length;
  return { file: base, vi, slot, ver, width: W, height: H,
    core: { x0, y0, x1, y1, fw, fh, fc: +fc.toFixed(1), nCore, bandLeak, alphaCount },
    solesPct: +(y1 / H * 100).toFixed(1), cxDriftPct: +(((fc / W) - 0.5) * 100).toFixed(2),
    linePct: 'pending-human', singleFigure: otherCore<0.02*nCore, otherCoreFrac:+(otherCore/nCore).toFixed(4), rimSkips, regions: R, innerPatches, slotName: slot };
}
module.exports = { analyze, writePng, clamp, CFG, PAL, ciede, DE };
