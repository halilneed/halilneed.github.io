  /* step 1: a keyword rule against a small model, on the same messages */
  const kwOn=new Set([0]);
  function renderRule(){
    const kws=[...kwOn].map(i=>L.keywords[i].toLocaleLowerCase(LANG));
    let r=0,mo=0;
    $("msgs").innerHTML=L.messages.map(([txt,label,model])=>{
      const low=txt.toLocaleLowerCase(LANG);
      const rule=kws.some(k=>low.includes(k))?1:0;
      if(rule===label) r++; if(model===label) mo++;
      const cell=(pred,name)=>'<span class="tag '+(pred===label?"ok":"no")+'">'+icon(pred===label?"check":"x")+esc(name)+"</span>";
      return '<li>'+icon(label?"flag":"mail")+'<span class="msg">'+esc(txt)+'</span><span style="display:flex;gap:6px;justify-self:end">'+cell(rule,L.ruleTag)+cell(model,L.modelTag)+"</span></li>";
    }).join("");
    const n=L.messages.length;
    $("ruleScore").textContent=r+" / "+n; $("modelScore").textContent=mo+" / "+n;
    $("kwNote").innerHTML=icon("bulb")+esc(kwOn.size>1?L.kwLesson[1]:L.kwLesson[0]);
  }
  $("kwPills").innerHTML=L.keywords.map((k,i)=>'<button class="pill" data-i="'+i+'" aria-pressed="'+(kwOn.has(i))+'">'+icon("plus")+esc(k)+"</button>").join("");
  $("kwPills").querySelectorAll(".pill").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i; if(kwOn.has(i)&&kwOn.size>1) kwOn.delete(i); else kwOn.add(i);
    b.setAttribute("aria-pressed",String(kwOn.has(i))); renderRule();
  });
  renderRule();

  /* step 2: six kinds of model */
  const kindBtn=(k,i)=>'<button class="kind" data-i="'+i+'" aria-pressed="false"><span class="ic">'+icon(k.icon)+"</span><b>"+esc(k.name)+"</b></button>";
  $("kinds").innerHTML=L.kinds.map(kindBtn).join("");
  function showKind(i){
    const k=L.kinds[i];
    $("kinds").querySelectorAll(".kind").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.i===i)));
    $("kindDetail").innerHTML='<div class="flow"><div class="node"><div class="ic">'+icon("send")+'</div><div class="lb">'+esc(k.input)+'</div></div><span class="link" aria-hidden="true"></span><div class="node hot"><div class="ic">'+icon(k.icon)+'</div><div class="lb">'+esc(k.name)+'</div></div><span class="link" aria-hidden="true"></span><div class="node"><div class="ic">'+icon("out")+'</div><div class="lb">'+esc(k.output)+"</div></div></div>"+
      '<p class="ex"><b>'+esc(L.exampleLbl)+"</b> "+esc(k.example)+"<br><b>"+esc(L.needsLbl)+"</b> "+esc(k.needs)+"</p>";
  }
  $("kinds").querySelectorAll(".kind").forEach(b=>b.onclick=()=>showKind(+b.dataset.i));
  showKind(0);

  /* step 3: four questions choose the kind; the first yes wins */
  const qa=[null,null,null,null];
  $("kindsResult").innerHTML=L.kinds.map((k,i)=>'<div class="kind" data-i="'+i+'"><span class="ic">'+icon(k.icon)+"</span><b>"+esc(k.name)+"</b></div>").join("");
  $("kindQs").innerHTML=L.questions.map((q,i)=>'<div class="qrow">'+icon("help")+"<p>"+esc(q.text)+'</p><div class="yn" data-q="'+i+'"><button data-v="1" aria-pressed="false">'+esc(L.yes)+'</button><button data-v="0" aria-pressed="false">'+esc(L.no)+"</button></div></div>").join("");
  function decide(){
    let pick=null, open=false;
    for(let i=0;i<qa.length;i++){
      if(qa[i]===1){pick=L.questions[i].kinds;break;}
      if(qa[i]==null){open=true;break;}
    }
    if(pick==null&&!open) pick=[L.fallbackKind];
    $("kindsResult").classList.toggle("chosen",pick!=null);
    $("kindsResult").querySelectorAll(".kind").forEach(el=>el.classList.toggle("on",pick!=null&&pick.includes(+el.dataset.i)));
    const v=$("kindVerdict");
    if(pick==null){v.className="verdict warn";v.innerHTML=icon("help")+esc(L.answerInOrder);}
    else {v.className="verdict ok";v.innerHTML=icon("check")+esc(pick.map(i=>L.kinds[i].name).join(L.or));}
  }
  function setQ(q,val){
    qa[q]=val;
    document.querySelectorAll('#kindQs .yn[data-q="'+q+'"] button').forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.v===val)));
    decide();
  }
  document.querySelectorAll("#kindQs .yn").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>setQ(+g.dataset.q,+b.dataset.v)));
  decide();

  /* step 4: where each department can start */
  function showDept(i){
    $("deptSteps").innerHTML=L.depts[i].steps.map(([txt,k])=>"<li>"+icon("arrow")+'<span class="t">'+esc(txt)+'</span><span class="ktag">'+icon(L.kinds[k].icon)+esc(L.kinds[k].name)+"</span></li>").join("");
  }
  pills($("deptPills"),L.depts.map(d=>({label:d.name,icon:"building"})),showDept,0);

  onPrint.push(()=>{
    [1,2,3].forEach(i=>{kwOn.add(i);$("kwPills").querySelector('[data-i="'+i+'"]').setAttribute("aria-pressed","true");});
    renderRule();
    setQ(0,1);
    $("deptPills").hidden=true;
    $("deptSteps").innerHTML=L.depts.map(d=>'<li class="dept-h">'+icon("building")+'<span class="t"><b>'+esc(d.name)+"</b></span><span></span></li>"+d.steps.map(([txt,k])=>"<li>"+icon("arrow")+'<span class="t">'+esc(txt)+'</span><span class="ktag">'+icon(L.kinds[k].icon)+esc(L.kinds[k].name)+"</span></li>").join("")).join("");
  });
