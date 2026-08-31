const API='https://mwlrmnhudzbivfjsfsms.supabase.co/functions/v1/atco-finance-api-v5';
const CODE='FINANCE26';
const app=document.getElementById('app');
let refreshTimer=null;
let loading=false;
let showCase=false;

const esc=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function call(api,options={}){
  const headers={'content-type':'application/json'};
  if(options.pin) headers['x-admin-pin']=options.pin;
  const response=await fetch(API+'?api='+encodeURIComponent(api)+'&code='+encodeURIComponent(CODE),{method:options.method||'GET',headers,body:options.body?JSON.stringify(options.body):undefined,cache:'no-store'});
  let data={};
  try{data=await response.json();}catch{}
  if(!response.ok) throw new Error(data.error||('Request failed '+response.status));
  return data;
}

function showAccess(){
  const saved=sessionStorage.getItem('financeAdminPin');
  if(saved){loadDashboard();return;}
  app.innerHTML=`<div class="panel auth">
    <div class="qtag">ADMIN ACCESS</div>
    <h1 class="title" style="margin-top:12px">Presenter Dashboard</h1>
    <div class="muted">Enter the admin code.</div>
    <input id="pin" inputmode="numeric" placeholder="Admin code">
    <button class="primary" id="go">Open Dashboard</button>
    <div id="msg" class="error"></div>
  </div>`;
  document.getElementById('go').onclick=async()=>{
    const pin=document.getElementById('pin').value.trim();
    try{
      await call('admin-access',{method:'POST',body:{pin}});
      sessionStorage.setItem('financeAdminPin',pin);
      loadDashboard();
    }catch(error){document.getElementById('msg').textContent=error.message;}
  };
}

async function loadDashboard(){
  if(loading) return;
  loading=true;
  try{
    const data=await call('admin-data',{pin:sessionStorage.getItem('financeAdminPin')||''});
    renderDashboard(data);
    if(!refreshTimer) refreshTimer=setInterval(loadDashboard,2500);
  }catch(error){
    if(/Unauthorized/i.test(error.message)){
      sessionStorage.removeItem('financeAdminPin');
      if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null;}
      showAccess();
      return;
    }
    app.innerHTML=`<div class="panel auth"><div class="error">${esc(error.message)}</div><button class="secondary" style="margin-top:12px" onclick="location.reload()">Try again</button></div>`;
  }finally{loading=false;}
}

async function action(actionName,payload={}){
  try{
    await call('admin-action',{method:'POST',pin:sessionStorage.getItem('financeAdminPin')||'',body:{action:actionName,code:CODE,...payload}});
    await loadDashboard();
  }catch(error){alert(error.message);}
}

function renderDashboard(data){
  if(showCase){renderCaseStudy(data);return;}
  const session=data.session||{};
  const questions=data.questions||[];
  const current=questions.find((q)=>q.order_no===session.current_question)||questions[0];
  const showResults=!!session.reveal_results;
  const result=current?.result||{dist:{},pct:{},correct:0,wrong:0,accuracy:0,total:0};

  const bars=current?(current.options||[]).map((option)=>{
    const count=result.dist[option]||0;
    const percent=result.pct[option]||0;
    return `<div><div class="barlabel">${esc(option)}${option===current.correct_answer?' ✓':''}</div><div class="bartrack"><div class="barfill" style="width:${percent}%"></div><div class="barval">${count} • ${percent}%</div></div></div>`;
  }).join(''):'';

  const nav=questions.map((q)=>`<button class="${q.order_no===session.current_question?'active':'secondary'}" data-question="${q.order_no}">Q${q.order_no}</button>`).join('');

  const answerRows=(data.participants||[]).map((participant)=>{
    const answer=current?participant.answers?.[current.order_no]:null;
    if(!answer) return `<tr><td><span class="dot ${participant.online?'on':''}"></span>${esc(participant.full_name)}</td><td>—</td><td>Not answered</td></tr>`;
    return `<tr><td><span class="dot ${participant.online?'on':''}"></span>${esc(participant.full_name)}</td><td>${esc(answer.answer)}</td><td>${answer.correct?'<span class="correct">✓ Correct</span>':'<span class="wrong">✕ Wrong</span>'}</td></tr>`;
  }).join('');

  const totalQuestions=questions.length;
  const people=(data.participants||[]).map((participant)=>`<tr><td><span class="dot ${participant.online?'on':''}"></span>${esc(participant.full_name)}</td><td>${esc(participant.department||'—')}</td><td>${participant.answered}/${totalQuestions}</td><td>${participant.total_correct}/${totalQuestions} • ${participant.score_pct}%</td><td>${participant.completed?'✓ Completed':'In progress'}</td></tr>`).join('');

  app.innerHTML=`
    <div class="grid">
      <div class="stat"><span>Online Now</span><b>${data.online}</b></div>
      <div class="stat"><span>Registered</span><b>${data.registered}</b></div>
      <div class="stat"><span>Completed</span><b>${data.completed}</b></div>
      <div class="stat"><span>Total Answers</span><b>${data.total_responses}</b></div>
    </div>
    <div class="admin-grid">
      <div class="panel">
        <div class="between">
          <div><div class="qtag">Q${current?.order_no||'-'} • ${esc(current?.section||'')}</div><div class="qtext" style="font-size:19px">${esc(current?.prompt||'')}</div></div>
          <div class="row"><button class="secondary" id="prev">Previous</button><button class="secondary" id="next">Next</button></div>
        </div>
        <div class="row" style="margin-top:8px"><span class="status-pill ${session.is_active?'live':'closed'}">${session.is_active?'SESSION LIVE':'SESSION CLOSED'}</span><span class="muted">Answered this question: ${result.total||0}</span></div>
        <div class="qnav">${nav}<button class="secondary case-btn" id="caseStudy">Case Study</button></div>
        ${showResults?`<div class="bars">${bars}</div>`:'<div class="notice">Audience result bars are hidden. Admin correctness is still visible below.</div>'}
        <div class="row" style="margin-top:14px"><div class="stat"><span>Correct</span><b class="correct">${result.correct||0}</b></div><div class="stat"><span>Wrong</span><b class="wrong">${result.wrong||0}</b></div><div class="stat"><span>Accuracy</span><b>${result.accuracy||0}%</b></div></div>
        <div class="answerbox"><b>Correct answer:</b> ${esc(current?.correct_answer||'')}</div>
        <div class="row" style="margin-top:14px"><button class="secondary" id="results">${showResults?'Hide Result Bars':'Reveal Result Bars'}</button><button class="${session.is_active?'danger':'success'}" id="session">${session.is_active?'Close Session':'Open Session'}</button></div>
      </div>
      <div class="panel"><div class="title" style="font-size:18px">Live Answer Review — Correct / Wrong</div><div class="tablewrap"><table class="tbl" style="min-width:0"><thead><tr><th>Name</th><th>Selected Answer</th><th>Status</th></tr></thead><tbody>${answerRows}</tbody></table></div></div>
    </div>
    <div class="panel" style="margin-top:15px"><div class="title" style="font-size:19px">Participants & Scoreboard</div><div class="tablewrap"><table class="tbl"><thead><tr><th>Participant</th><th>Department</th><th>Progress</th><th>Score</th><th>Status</th></tr></thead><tbody>${people}</tbody></table></div></div>`;

  document.getElementById('prev').onclick=()=>action('prev');
  document.getElementById('next').onclick=()=>action('next');
  document.getElementById('results').onclick=()=>action('toggle_results');
  document.getElementById('session').onclick=()=>action('toggle_session');
  document.getElementById('caseStudy').onclick=()=>{showCase=true;renderCaseStudy(data);};
  document.querySelectorAll('[data-question]').forEach((button)=>button.onclick=()=>action('goto',{order_no:Number(button.dataset.question)}));
}

function renderCaseStudy(data){
  app.innerHTML=`<div class="panel case-panel">
    <div class="between"><div><div class="qtag">FINAL CASE STUDY</div><h1 class="title" style="margin-top:8px">Lowland Products Limited</h1></div><button class="secondary" id="backQuestions">Back to Questions</button></div>
    <div class="case-study-images">
      <img src="/assets/case-study-1.png" alt="Case Study page 1">
      <img src="/assets/case-study-2.png" alt="Case Study page 2">
      <img src="/assets/case-study-3.png" alt="Case Study page 3">
    </div>
    <div class="notice" style="margin-top:18px"><b>Required:</b> Prepare the accounting equation as at 30 November 20x0, the Profit & Loss Account for the quarter ended 31 December 20x0, and the Balance Sheet as at 31 December 20x0.</div>
  </div>`;
  document.getElementById('backQuestions').onclick=()=>{showCase=false;renderDashboard(data);};
}

showAccess();
