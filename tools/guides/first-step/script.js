  /* step 1: next word */
  let words=[], r=0;
  const sEl=document.getElementById("sentence"), oEl=document.getElementById("opts");
  function renderNW(){
    sEl.innerHTML=esc(L.base)+words.map((w,i)=>" "+(i===words.length-1?'<span class="new">'+esc(w)+"</span>":esc(w))).join("")+'<span class="cursor" aria-hidden="true"></span>';
    oEl.innerHTML=""; oEl.className="opts";
    if(r>=L.rounds.length){
      oEl.className="restart";
      const b=document.createElement("button"); b.className="btn ghost"; b.innerHTML=icon("reset")+esc(L.restart);
      b.onclick=()=>{words=[];r=0;renderNW();}; oEl.appendChild(b); return;
    }
    L.rounds[r].forEach(([w,p])=>{
      const b=document.createElement("button"); b.className="opt";
      b.setAttribute("aria-label",w+", "+L.probAria+" "+(p?p+"%":L.near0));
      b.innerHTML='<span class="top-row"><span>'+esc(w)+'</span><span class="pct">'+(p?p+"%":"~0%")+'</span></span><span class="bar"><i style="width:0"></i></span>';
      b.onclick=()=>{words.push(w);r++;renderNW();};
      oEl.appendChild(b);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{b.querySelector("i").style.width=Math.max(p,1.2)+"%";}));
    });
  }
  renderNW();

  /* step 2: a small naive Bayes model, trained in the browser */
  const STOP=new Set(L.stop.split(" "));
  const toks=s=>s.toLocaleLowerCase(LANG).replace(/[^a-zçğıöşüâî0-9\s]/g," ").split(/\s+/).filter(w=>w.length>1&&!STOP.has(w));
  const stem=w=>w.slice(0,5);
  const A=L.urgentEx, N=L.normalEx, T=L.tests, STAGES=[1,2,4,6], CIRC=326.7;
  let stage=0, model;
  function train(k){
    const c={1:{},0:{}}, t={1:0,0:0}, V=new Set();
    [[1,A.slice(0,k)],[0,N.slice(0,k)]].forEach(([l,arr])=>arr.forEach(s=>toks(s).forEach(w=>{const s5=stem(w);c[l][s5]=(c[l][s5]||0)+1;t[l]++;V.add(s5);})));
    return {c,t,V};
  }
  const wlr=(m,s5)=>!m.V.has(s5)?0:Math.log(((m.c[1][s5]||0)+1)/(m.t[1]+m.V.size))-Math.log(((m.c[0][s5]||0)+1)/(m.t[0]+m.V.size));
  const prob=(m,s)=>{let z=0;toks(s).forEach(w=>z+=wlr(m,stem(w)));return 1/(1+Math.exp(-z));};
  function paint(m,s){
    return s.split(/(\s+)/).map(part=>{
      const clean=toks(part)[0]; if(!clean) return esc(part);
      const v=wlr(m,stem(clean)); if(Math.abs(v)<0.15) return esc(part);
      const a=Math.min(1,0.35+Math.abs(v)/1.6);
      return '<span class="w" style="background:color-mix(in srgb,'+(v>0?"var(--hl)":"var(--hl-cool)")+" "+Math.round(a*100)+"%,transparent)"+(v>0?";color:var(--hl-ink)":"")+'">'+esc(part)+"</span>";
    }).join("");
  }
  const verdict=p=>Math.abs(p-0.5)<0.05?["warn",L.unsure,-1]:(p>0.5?["",L.urgent,1]:["",L.notUrgent,0]);
  function renderTrain(){
    const k=STAGES[stage]; model=train(k); let ok=0;
    document.getElementById("tests").innerHTML=T.map(([s,y])=>{
      const [cls,label,pred]=verdict(prob(model,s)), right=pred===y; if(right) ok++;
      const tag=cls==="warn"?"warn":(right?"ok":"no");
      return "<li>"+icon("mail")+'<span class="msg">'+paint(model,s)+'</span><span class="tag '+tag+'">'+icon(tag==="warn"?"alert":(right?"check":"x"))+esc(label)+"</span></li>";
    }).join("");
    document.getElementById("acc").textContent=ok;
    document.getElementById("ringFg").style.strokeDashoffset=CIRC*(1-ok/6);
    document.getElementById("ringWrap").setAttribute("aria-label",fmt(L.ringAria,ok));
    document.getElementById("exCount").innerHTML=fmt(L.seen,k*2);
    document.getElementById("lesson").innerHTML=icon("bulb")+esc(L.lessons[stage]);
    const add=document.getElementById("addEx"), last=stage>=STAGES.length-1;
    add.disabled=last; add.querySelector("span").textContent=last?L.allAdded:L.add;
    if(document.getElementById("own").value.trim()) runOwn();
  }
  document.getElementById("addEx").onclick=()=>{ if(stage<STAGES.length-1){ stage++; renderTrain(); } };
  document.getElementById("resetTrain").onclick=()=>{stage=0;renderTrain();};
  function runOwn(){
    const s=document.getElementById("own").value.trim(), out=document.getElementById("ownResult");
    if(!s){out.textContent=L.empty;return;}
    const known=toks(s).some(w=>model.V.has(stem(w)));
    const [cls,label]=known?verdict(prob(model,s)):["warn",L.unknown];
    out.innerHTML='<span class="tag '+(cls||"ok")+'">'+esc(label)+"</span>"+paint(model,s);
  }
  document.getElementById("ownBtn").onclick=runOwn;
  document.getElementById("own").addEventListener("keydown",e=>{if(e.key==="Enter")runOwn();});
  document.getElementById("lessonsAll").innerHTML=L.lessons.map(t=>"<li>"+icon("bulb")+esc(t)+"</li>").join("");
  renderTrain();

  /* step 3: task cards */
  const C={ok:["check",L.ok],warn:["alert",L.warn],no:["x",L.no]};
  document.getElementById("legendKey").innerHTML=Object.entries(C).map(([k,[ci,cl]])=>'<span class="'+k+'">'+icon(ci)+esc(cl)+"</span>").join("");
  const answers={}, tasksEl=document.getElementById("tasks");
  function tally(){
    const n=Object.keys(answers).length, ok=Object.entries(answers).filter(([j,k])=>L.tasks[j][2]===k).length;
    document.getElementById("tallyText").textContent=fmt(L.tally,n);
    document.getElementById("tallyScore").textContent=fmt(L.hits,ok);
  }
  function choose(d,i,k){
    const [, , ans, why]=L.tasks[i];
    d.querySelectorAll(".choice").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.k===k)));
    answers[i]=k; d.className="card r-"+ans;
    const fb=d.querySelector(".fb"); fb.hidden=false; fb.className="fb "+ans;
    fb.innerHTML=icon(C[ans][0])+"<span><b>"+esc(C[ans][1])+".</b> "+esc(why)+"</span>";
    tally();
  }
  L.tasks.forEach(([ic,q],i)=>{
    const d=document.createElement("div"); d.className="card";
    d.innerHTML='<div class="q"><span class="ic">'+icon(ic)+"</span><span>"+esc(q)+'</span></div><div class="choices" role="group" aria-label="'+esc(L.decisionAria)+'">'+
      Object.entries(C).map(([k,[ci,cl]])=>'<button class="choice" data-k="'+k+'" aria-pressed="false">'+icon(ci)+esc(cl)+"</button>").join("")+
      '</div><div class="fb" hidden aria-live="polite"></div>';
    d.querySelectorAll(".choice").forEach(b=>b.onclick=()=>choose(d,i,b.dataset.k));
    tasksEl.appendChild(d);
  });
  tally();

  onPrint.push(()=>{
    stage=STAGES.length-1; renderTrain();
    document.querySelectorAll("#tasks .card").forEach((d,i)=>choose(d,i,L.tasks[i][2]));
  });
