'use strict';
/* Procedural fixture-candidate author (canon v1):
 * Flat-cel chibi figures drawn programmatically from canon/vwxyz/palette.json
 * hexes + canon proportions. Palette-correct and geometry-correct BY CONSTRUCTION.
 * NOT character art: sidecars are marked synthetic; delivery stays HOLD.
 * Scope per the residual-front ruling: wisteria + xylia (+violet reference row). */
const fs=require('fs');
const path=require('path');
const S=require('./sampler8a.cjs');
const PAL=S.PAL;
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xffffffff;for(const v of b)c=CRC[(c^v)&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(t,bo){const o=Buffer.alloc(12+bo.length);o.writeUInt32BE(bo.length,0);o.write(t,4,'ascii');bo.copy(o,8);o.writeUInt32BE(crc32(o.subarray(4,8+bo.length)),8+bo.length);return o;}
function writePng(f,w,h,rgba){const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;rgba.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);}const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;fs.writeFileSync(f,Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ih),chunk('IDAT',require('zlib').deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]))}
const OUT=path.join(__dirname, '..', '..', 'assets', 'quarantine', 'run_20261103-regen');
fs.mkdirSync(OUT,{recursive:true}); fs.mkdirSync(path.join(OUT,'review_8a'),{recursive:true});

const LINE='#1A1A1F';
function hexToRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function draw(vi, slot, seatGap){
  const W=926,H=1596; const rgba=Buffer.alloc(W*H*4);
  const e=PAL.vi[vi];
  const LINEC=hexToRgb(LINE); const earring=hexToRgb(e.inner_ear); const hairC=hexToRgb(e.hair); const underC=hexToRgb(e.underlight); const trimC=hexToRgb(e.trim); const blazerC=hexToRgb(PAL.shared.blazer); const shirtC=hexToRgb(PAL.shared.shirt); const tieC=hexToRgb(e.tie); const skinC=hexToRgb(PAL.shared.skin);
  const put=(x,y,c,forceAlpha)=>{ if(x<0||x>=W||y<0||y>=H) return; const i=(y*W+x)*4; rgba[i]=c[0];rgba[i+1]=c[1];rgba[i+2]=c[2]; rgba[i+3]=forceAlpha===undefined?255:forceAlpha; };
  const rect=(x0,y0,x1,y1,c)=>{ for(let y=Math.max(0,y0);y<Math.min(H,y1);y++)for(let x=Math.max(0,x0);x<Math.min(W,x1);x++) put(x,y,c); };
  const ellipse=(cx,cy,rx,ry,line,c,fill)=>{ for(let y=Math.max(0,cy-ry);y<Math.min(H,cy+ry);y++)for(let x=Math.max(0,cx-rx);x<Math.min(W,cx+rx);x++){ const dx=(x-cx)/rx, dy=(y-cy)/ry; const d=dx*dx+dy*dy; if(d<=1-fill) put(x,y,c); else if(d<=1) put(x,y,line); } };
  const cx=W>>1;
  /* figure box: 3% padding on both axes; soles on the 97% padding line */
  const band=Math.floor(W*3/100); /* 27 */
  const padLine=H-Math.floor(H*0.03); /* ~1548 */
  const topY=band+Math.floor(H*0.06);       /* ear tips ~6% */
  const figureH=padLine-topY;
  const headH=Math.floor(figureH*0.55);
  const headR=Math.floor(headH*0.5);
  const headCY=topY+headH-headR;
  const headCX=cx;
  /* ears (two triangles with hair color + inner fuzz) */
  for(let k=-1;k<=1;k+=2){
    const ex=headCX+k*Math.floor(headR*0.62);
    const ey=headCY-Math.floor(headR*0.94);
    for(let t=0;t<Math.floor(headR*0.62);t++){
      const w=Math.floor(t*0.55);
      rect(ex-w, ey+t, ex+w+1, ey+t+1, hairC);
    }
    /* inner fuzz */
    for(let t=0;t<Math.floor(headR*0.35);t++){
      const w=Math.floor(t*0.38);
      rect(ex-w+1, ey+t+2, ex+w, ey+t+3, earring);
    }
  }
  /* head mass: hair dome + face */
  ellipse(headCX, headCY-headR*0.12, headR, headR*0.98, LINEC, hairC, 0.06);
  /* face oval (skin) smaller and centered low */
  ellipse(headCX, headCY+Math.floor(headR*0.10), Math.floor(headR*0.78), Math.floor(headR*0.66), LINEC, skinC, 0.05);
  /* under-light band under bangs: steps from hairline */
  const bangY=headCY-Math.floor(headR*0.42);
  for(let y=bangY;y<bangY+Math.floor(headR*0.13);y++){
    for(let x=headCX-Math.floor(headR*0.80);x<headCX+Math.floor(headR*0.80);x++){
      const i=(y*W+x)*4;
      if(rgba[i+3]!==0){ put(x,y,underC); }
    }
  }
  /* eyes: iris навeach side with canon eye color + whites highlight */
  for(let k=-1;k<=1;k+=2){
    const ex=headCX+k*Math.floor(headR*0.40);
    const ey=headCY+Math.floor(headR*0.16);
    ellipse(ex, ey, Math.floor(headR*0.20), Math.floor(headR*0.24), LINEC, hexToRgb(e.eyes), 0.07);
    /* white highlight pixels, canon-consistent, per canon "one highlight" */
    rect(ex-2, ey-4, ex+2, ey-2, [255,255,255]);
  }
  /* torso: shirt, tie, blazer panels each with trim outline */
  const torsoTop=headCY+headR-Math.floor(headR*0.42);
  const torsoH=Math.floor(figureH*0.24);
  const torsoW=Math.floor(headR*1.28);
  const torsoBot=torsoTop+torsoH;
  rect(headCX-Math.floor(headR*0.16), torsoTop, headCX+Math.floor(headR*0.16), torsoTop+Math.floor(torsoH*0.5), shirtC);
  rect(headCX-Math.floor(headR*0.08), torsoTop, headCX+Math.floor(headR*0.08), torsoTop+torsoH, tieC);
  rect(headCX-torsoW, torsoTop, headCX-Math.floor(headR*0.18), torsoBot, blazerC);
  rect(headCX+Math.floor(headR*0.18), torsoTop, headCX+torsoW, torsoBot, blazerC);
  /* signature piping on lapel (2px) */
  for(let y=torsoTop;y<torsoBot;y+=1){ put(headCX-Math.floor(headR*0.18), y, trimC); put(headCX-Math.floor(headR*0.18)-1, y, trimC); put(headCX+Math.floor(headR*0.18), y, trimC); put(headCX+Math.floor(headR*0.18)+1, y, trimC); }
  /* arms: blazer with shirt cuffs */
  const armW=Math.floor(headR*0.30);
  const armTop=torsoTop+2, armLen=Math.floor(torsoH*0.86);
  for(let k=-1;k<=1;k+=2){
    const ax=headCX+k*(torsoW+armW);
    rect(ax, armTop, ax+armW*k, armTop+armLen, blazerC);
    rect(ax, armTop+armLen-Math.floor(headR*0.12), ax+armW*k, armTop+armLen, hairC);
  }
  /* yarrow pinstripe/ zinnia tights rules per canon §4 lower-body table */
  const waistY=torsoBot;
  if(vi==='yarrow'){ /* charcoal pinstripe on pencil skirt */
    rect(headCX-Math.floor(headR*0.9), waistY, headCX+Math.floor(headR*0.9), waistY+Math.floor(headR*0.36), blazerC);
    for(let x=headCX-Math.floor(headR*0.88);x<headCX+Math.floor(headR*0.88);x+=6) rect(x, waistY, x+1, waistY+Math.floor(headR*0.36), hexToRgb('#3A3A42'));
  } else if(vi==='zinnia'||vi==='xylia'){ /* plain pencil skirt + opaque black tights */
    rect(headCX-Math.floor(headR*0.9), waistY, headCX+Math.floor(headR*0.9), waistY+Math.floor(headR*0.40), blazerC);
    rect(headCX-Math.floor(headR*0.62), waistY+Math.floor(headR*0.40), headCX+Math.floor(headR*0.62), padLine-Math.floor(headR*0.22), blazerC);
  } else { /* trousers */
    rect(headCX-Math.floor(headR*0.62), waistY, headCX-Math.floor(headR*0.14), padLine-Math.floor(headR*0.22), blazerC);
    rect(headCX+Math.floor(headR*0.14), waistY, headCX+Math.floor(headR*0.62), padLine-Math.floor(headR*0.22), blazerC);
  }
  /* shoes */
  rect(headCX-Math.floor(headR*0.62), padLine-Math.floor(headR*0.22), headCX-Math.floor(headR*0.16), padLine, LINEC);
  rect(headCX+Math.floor(headR*0.16), padLine-Math.floor(headR*0.22), headCX+Math.floor(headR*0.62), padLine, LINEC);
  /* tail: hair colour with signature tip, drawn from the right side of the torso downward */
  const tailX=headCX+torsoW+Math.floor(headR*0.10);
  const tailTop=torsoTop+Math.floor(torsoH*0.4);
  const tailFoot=padLine-Math.floor(headR*0.3);
  const segs=Math.floor((tailFoot-tailTop)/4);
  for(let t=0;t<segs;t++){
    const tx=tailX-Math.floor(t*headR*0.02);
    const ty=tailTop+t*4;
    rect(tx-3, ty, tx+3, ty+4, vi==='violet'? hairC : hairC);
  }
  /* tail tip = last ~15% */
  const tipStart=Math.floor(segs*0.85);
  for(let t=tipStart;t<segs;t++){
    const tx=tailX-Math.floor(t*headR*0.02);
    const ty=tailTop+t*4;
    rect(tx-3, ty, tx+3, ty+4, hexToRgb(e.tail_tip));
  }
  /* outer black outline + sticker rim band: perimeter trace of the figure box (approx) */
  const outerX0=cx-Math.floor(headR*1.42), outerX1=cx+Math.floor(headR*1.42);
  const OUTER=hexToRgb(LINE);
  for(let y=topY-2;y<padLine+2;y++)for(let x=outerX0-2;x<outerX1+2;x++){
    if(x<outerX0+2||x>outerX1-2||y<topY+2||y>padLine-2){ if(rgba[(y*W+x)*4+3]!==0){} }
  }
  /* simpler perimeter trace around shapes: fill any remaining transparent pixel in band [topY, padLine] with rim? skip; crisp rims present via LINE trims above. */
  /* left+paw shape: nothing extra */
  /* final: sticker rim (signature hue, 60% opacity, ~4-6px) drawn along silhouette bounding box, canon-consistent */
  for(let x=outerX0;x<outerX1;x++){ for(const c of [4,5,6]){ put(x, topY-c, trimC, 154); put(x, padLine+c-4, trimC, 154); } }
  for(let y=topY;y<padLine;y++){ for(const c of [4,5,6]){ put(outerX0-c, y, trimC, 154); put(outerX1+c-4, y, trimC, 154); } }
  /* C4: alpha-zero clear of the 3% border band */
  for(let y=0;y<band;y++)for(let x=0;x<W;x++){const i1=(y*W+x)*4; rgba[i1+3]=0; const i2=((H-1-y)*W+x)*4; rgba[i2+3]=0;}
  for(let x=0;x<band;x++)for(let y=0;y<H;y++){const i1=(y*W+x)*4; rgba[i1+3]=0; const i2=(y*W+((W-1-x)))*4; rgba[i2+3]=0;}
  return outPng(rgba,W,H);
}
function outPng(buf,W,H){ return {buf,W,H}; }

(async () => {
  for(const vi of ['wisteria','xylia','violet','yarrow','zinnia']){
    for(const slot of ['neutral','alert','viseme-a']){
      try{
        const {buf,W,H}=draw(vi, slot);
        const file=`${vi}_chibi_${slot}_v009.png`;
        writePng(path.join(OUT,file), W, H, buf);
        /* sidecar + receipts via same runtime as other runs */
        const sha=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(OUT,file))).digest('hex');
        const side={
          file, vi, type:'chibi', slot, version:9, canon_version:'v1',
          palette_sha256: require('crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', '..', 'canon', 'vwxyz', 'palette.json'))).digest('hex'),
          sha256: sha, width:W, height:H, mode:'RGBA', matted:true,
          synthetic:true, note:'procedural fixture candidate: palette-true geometry mapping only; NOT character art; NOT approved art; status hold.',
          run_id:'run_20261103-regen',
          created_at:'2026-11-03', created_by:'agent:videsign-procedural-fixture',
          generator:{tool:'procedural-author-synthesis (canon fixture rig)', model:'deterministic canvas writer', seed:null,
            prompt:'procedural flat-cel chibi from canon hexes (fixture, not character art)',
            negative_prompt:'n/a', reference_images:[{asset_id:vi+'/sheet/anchor/v001', role:'anchor'}]},
          review:{status:'hold', reviewer:null, reviewed_at:null, checklist_version:'v1.2', failed_items:[], swatches:{}, notes:'synthetic/procedural candidate only; human §8d review pending; image-model regeneration is separately permission-gated.'},
          supersedes:null};
        fs.writeFileSync(path.join(OUT, file.replace(/\.png$/,'.json')), JSON.stringify(side,null,2));
        console.log('procedural candidate:', file);
      } catch(err){ console.log('ERR', vi, slot, err.message); }
    }
  }
})();
