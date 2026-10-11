  /* step 1: pick a task, the task card fills itself */
  const MARK={ok:"check",warn:"alert",no:"x"};
  function showTask(i){
    const t=L.tasks[i];
    $("taskCard").innerHTML=L.cardRows.map(([key,ic,lbl])=>"<div>"+icon(ic)+"<span class=\"k\">"+esc(lbl)+"</span><span class=\"v\">"+esc(t[key])+"</span></div>").join("");
    $("taskChecks").innerHTML=t.checks.map(([k,txt])=>'<span class="tag '+k+'">'+icon(MARK[k])+esc(txt)+"</span>").join("");
    const worst=t.checks.some(c=>c[0]==="no")?"no":t.checks.some(c=>c[0]==="warn")?"warn":"ok";
    $("taskVerdict").className="verdict "+worst;
    $("taskVerdict").innerHTML=icon(MARK[worst])+esc(L.verdicts[worst]);
  }
  pills($("taskPills"),L.tasks.map(t=>({label:t.name,icon:t.icon})),showTask,0);

  /* step 2: one score hides the weak slices */
  let fixed=false, bySlice=false;
  function renderSlices(){
    const S=L.slices.map(s=>({...s,v:fixed?s.after:s.before}));
    const overall=S.reduce((a,s)=>a+s.share*s.v,0)/S.reduce((a,s)=>a+s.share,0);
    $("overall").textContent=Math.round(overall)+"%";
    const rows=bySlice?S:[{name:document.querySelector(".big span").textContent,share:100,v:overall}];
    $("slices").innerHTML=rows.map(s=>{
      const cls=s.v>=90?"ok":s.v>=80?"warn":"no";
      return '<div class="meter-row"><span class="lbl">'+esc(s.name)+(bySlice?"<small>"+fmt(L.shareLbl,s.share)+"</small>":"")+'</span><span class="bar"><i class="'+cls+'" style="width:'+s.v+'%"></i></span><span class="val">'+Math.round(s.v)+"%</span></div>";
    }).join("");
    $("fixSlices").disabled=fixed||!bySlice;
    $("sliceNote").innerHTML=icon("bulb")+esc(fixed?L.sliceLesson[2]:bySlice?L.sliceLesson[1]:L.sliceLesson[0]);
  }
  const pickView=pills($("viewPills"),L.views.map((v,i)=>({label:v,icon:i?"grid":"gauge"})),i=>{bySlice=!!i;renderSlices();},0);
  $("fixSlices").onclick=()=>{fixed=true;renderSlices();};
  $("resetSlices").onclick=()=>{fixed=false;renderSlices();};

  /* step 3: three questions choose the starting level */
  const ans=[null,null,null];
  $("ladder").innerHTML=L.levels.map((l,i)=>'<div class="level" data-i="'+i+'"><span class="n">'+fmt(L.levelN,i+1)+'</span><span class="ic">'+icon(l.icon)+"</span><b>"+esc(l.name)+'</b><span class="d">'+esc(l.desc)+"</span></div>").join("");
  $("levelQs").innerHTML=L.questions.map((q,i)=>'<div class="qrow">'+icon("help")+"<p>"+esc(q)+'</p><div class="yn" data-q="'+i+'"><button data-v="1" aria-pressed="false">'+esc(L.yes)+'</button><button data-v="0" aria-pressed="false">'+esc(L.no)+"</button></div></div>").join("");
  function chooseLevel(){
    let lvl=null, why="";
    if(ans[0]===1){lvl=0;why=L.levelWhy[0];}
    else if(ans[0]===0&&ans[1]!=null&&ans[2]!=null){
      if(ans[1]===1&&ans[2]===0){lvl=2;why=L.levelWhy[2];}
      else if(ans[1]===1){lvl=1;why=L.levelWhy[3];}
      else {lvl=1;why=ans[2]===1?L.levelWhy[1]:L.levelWhy[4];}
    }
    $("ladder").classList.toggle("chosen",lvl!=null);
    $("ladder").querySelectorAll(".level").forEach(el=>el.classList.toggle("on",+el.dataset.i===lvl));
    const v=$("levelVerdict");
    if(lvl==null){v.className="verdict warn";v.innerHTML=icon("help")+esc(L.answerAll);}
    else {v.className="verdict ok";v.innerHTML=icon("check")+esc(fmt(L.levelN,lvl+1)+": "+why);}
  }
  function setAns(q,val){
    ans[q]=val;
    document.querySelectorAll('.yn[data-q="'+q+'"] button').forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.v===val)));
    chooseLevel();
  }
  document.querySelectorAll(".yn").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>setAns(+g.dataset.q,+b.dataset.v)));
  chooseLevel();

  /* step 4: shadow mode, then assist mode */
  function showMode(i){
    const md=L.modes[i];
    $("modeFlow").innerHTML=md.nodes.map(([ic,kind,lbl],j)=>(j?'<span class="link" aria-hidden="true"></span>':"")+'<div class="node '+kind+'"><div class="ic">'+icon(ic)+'</div><div class="lb">'+esc(lbl)+"</div></div>").join("");
    $("modeCap").textContent=md.cap;
  }
  const pickMode=pills($("modePills"),L.modes.map(md=>({label:md.name,icon:md.icon})),showMode,0);

  onPrint.push(()=>{
    pickView(1); fixed=true; renderSlices();
    setAns(0,0); setAns(1,1); setAns(2,0);
  });
