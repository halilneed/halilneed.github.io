  /* step 1: three routes for any text */
  const R=[["send",L.routes[0]],["shield",L.routes[1]],["lock",L.routes[2]]];
  const answers={};
  function tally(){
    const n=Object.keys(answers).length, ok=Object.entries(answers).filter(([j,k])=>L.texts[j][1]===k).length;
    $("tallyText").textContent=fmt(L.tally,n); $("tallyScore").textContent=fmt(L.hits,ok);
  }
  function choose(d,i,k){
    const [, ans, why]=L.texts[i];
    d.querySelectorAll(".choice").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.k===k)));
    answers[i]=k; d.className="card r-"+(ans===2?"no":ans===1?"warn":"ok");
    const fb=d.querySelector(".fb"); fb.hidden=false; fb.className="fb "+(ans===2?"no":ans===1?"warn":"ok");
    fb.innerHTML=icon(R[ans][0])+"<span><b>"+esc(R[ans][1])+".</b> "+esc(why)+"</span>";
    tally();
  }
  L.texts.forEach(([txt],i)=>{
    const d=document.createElement("div"); d.className="card";
    d.innerHTML='<div class="q"><span class="ic">'+icon("note")+"</span><span>"+esc(txt)+'</span></div><div class="choices" role="group" aria-label="'+esc(L.routeAria)+'">'+
      R.map(([ic,lbl],k)=>'<button class="choice" data-k="'+k+'" aria-pressed="false">'+icon(ic)+esc(lbl)+"</button>").join("")+
      '</div><div class="fb" hidden aria-live="polite"></div>';
    d.querySelectorAll(".choice").forEach(b=>b.onclick=()=>choose(d,i,+b.dataset.k));
    $("texts").appendChild(d);
  });
  tally();

  /* step 2: masking with rules, with a model, with both */
  function renderMask(mode){
    let caught=0, total=0;
    const html=L.sample.map(part=>{
      if(typeof part==="string") return esc(part);
      const [txt,label,byRule,byModel]=part; total++;
      const hit=(mode===1&&byRule)||(mode===2&&byModel)||(mode===3&&(byRule||byModel));
      if(hit){caught++;return '<span class="pii">'+esc(label)+"</span>";}
      return mode===0?esc(txt):'<span class="miss">'+esc(txt)+"</span>";
    }).join("");
    $("maskView").innerHTML=html;
    $("caught").textContent=mode?caught+" / "+total:"–";
    $("missed").textContent=mode?String(total-caught):"–";
    $("maskNote").innerHTML=icon("bulb")+esc(L.maskLesson[mode]);
  }
  const pickMask=pills($("maskPills"),L.maskModes.map((m,i)=>({label:m,icon:["eye","rule","chip","shield"][i]})),renderMask,0);

  /*@locked*/
  /* step 3: what a recall figure means per day */
  const nf=new Intl.NumberFormat(LANG);
  function calc(){
    const vol=+$("vol").value, rate=+$("rate").value/100, rec=+$("rec").value/100;
    const day=vol*rate*(1-rec);
    $("volV").textContent=nf.format(vol); $("rateV").textContent="%"+Math.round(rate*100); $("recV").textContent="%"+(rec*100).toFixed(1);
    if(LANG==="en"){ $("rateV").textContent=Math.round(rate*100)+"%"; $("recV").textContent=(rec*100).toFixed(1)+"%"; }
    $("missDay").textContent=nf.format(Math.round(day));
    $("missMonth").textContent=nf.format(Math.round(day*L.workdaysMonth));
    $("missYear").textContent=nf.format(Math.round(day*L.workdaysYear));
    $("recNote").innerHTML=icon("bulb")+esc(fmt(L.recLesson,nf.format(Math.round(day*L.workdaysMonth))));
  }
  ["vol","rate","rec"].forEach(id=>$(id).addEventListener("input",calc));
  calc();

  /*@end*/

  onPrint.push(()=>{
    document.querySelectorAll("#texts .card").forEach((d,i)=>choose(d,i,L.texts[i][1]));
    pickMask(3);
  });
