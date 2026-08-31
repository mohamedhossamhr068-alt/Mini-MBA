const API='https://cffftyplraalsrfejzql.supabase.co/functions/v1/atco-finance-live';
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
        <div class="qnav">${nav}<button class="case-btn" id="caseStudy">📘 Case Study</button></div>
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
    <div class="between case-admin-head">
      <div>
        <div class="qtag">FINAL CASE STUDY</div>
        <h1 class="title" style="margin-top:8px">Lowland Products Limited</h1>
        <div class="muted">Presenter view — full readable Case Study.</div>
      </div>
      <button class="secondary" id="backQuestions">Back to Questions</button>
    </div>
    
<div class="case-readable">
  <div class="case-intro">
    <div class="qtag">CASE STUDY 2.3</div>
    <h2>Lowland Products Limited</h2>
    <p>On 1 October 20x0, Lowland Products Limited commenced trading with the issue of <b>80,000 Ordinary Shares of 50 cents each</b>. The issue was fully paid up and its proceeds were lodged in the company’s bank account at Midwest Bank plc.</p>
    <p>During the company’s first quarter of trading, the following economic actions occurred:</p>
  </div>

  <div class="case-table-wrap">
    <table class="case-table">
      <thead><tr><th>Date</th><th>Transaction</th></tr></thead>
      <tbody>
        <tr><td>04.10.x0</td><td>Paid €4,000 for six months’ advance rent.</td></tr>
        <tr><td>10.10.x0</td><td>Paid for plant costing €10,000 and a van costing €7,000.</td></tr>
        <tr><td>15.10.x0</td><td>Purchased raw materials costing €8,000 on credit.</td></tr>
        <tr><td>16.10.x0</td><td>Paid for van repairs costing €250.</td></tr>
        <tr><td>18.10.x0</td><td>Paid for raw materials costing €4,000.</td></tr>
        <tr><td>31.10.x0</td><td>Paid wages of €3,000 for October, converting half of raw materials inventory into finished goods.</td></tr>
        <tr><td>06.11.x0</td><td>Purchased office equipment costing €4,500 on credit.</td></tr>
        <tr><td>08.11.x0</td><td>Sold finished goods inventory for €13,000 cash.</td></tr>
        <tr><td>15.11.x0</td><td>Paid €6,000 to creditors.</td></tr>
        <tr><td>21.11.x0</td><td>Purchased raw materials costing €7,000 on credit.</td></tr>
        <tr><td>30.11.x0</td><td>Paid wages of €3,500 for November, converting a further €5,000 of raw materials inventory into finished goods.</td></tr>
        <tr><td>01.12.x0</td><td>Sold finished goods inventory costing €5,300 for €8,600 on credit.</td></tr>
        <tr><td>05.12.x0</td><td>Sold the remainder of finished goods inventory for €7,700 on credit.</td></tr>
        <tr><td>06.12.x0</td><td>Paid for raw materials costing €5,400.</td></tr>
        <tr><td>12.12.x0</td><td>Paid €1,000 for advertising.</td></tr>
        <tr><td>15.12.x0</td><td>Received a credit note for €500 from suppliers following the return of defective raw materials.</td></tr>
        <tr><td>24.12.x0</td><td>Paid wages of €2,800 to convert €4,200 of raw materials into finished goods.</td></tr>
        <tr><td>31.12.x0</td><td>Received €2,500 from debtors.</td></tr>
      </tbody>
    </table>
  </div>

  <div class="case-info">
    <h3>Additional Information</h3>
    <ol>
      <li><b>Depreciation policy:</b>
        <ul>
          <li>Plant: 15% per annum, reducing-balance method.</li>
          <li>Van: 25% per annum, straight-line method.</li>
          <li>Office equipment: 25% per annum, straight-line method.</li>
        </ul>
      </li>
      <li>One customer went into liquidation in early 20x1, owing <b>€1,100</b>, with no prospect of recovery.</li>
      <li>At 31 December 20x0, there is an unpaid electricity bill of <b>€480</b>.</li>
    </ol>
  </div>

  <div class="case-required">
    <h3>Required</h3>
    <ol>
      <li>Prepare the accounting equation as at <b>30 November 20x0</b>.</li>
      <li>Prepare the Profit &amp; Loss Account for the quarter to <b>31 December 20x0</b>.</li>
      <li>Prepare the Balance Sheet as at <b>31 December 20x0</b>.</li>
    </ol>
  </div>

  <details class="original-pages">
    <summary>View Original Case Study Pages</summary>
    <div class="case-study-images">
      <a href="/assets/case-study-1.png" target="_blank" rel="noopener"><img src="/assets/case-study-1.png" alt="Original Case Study page 1"></a>
      <a href="/assets/case-study-2.png" target="_blank" rel="noopener"><img src="/assets/case-study-2.png" alt="Original Case Study page 2"></a>
      <a href="/assets/case-study-3.png" target="_blank" rel="noopener"><img src="/assets/case-study-3.png" alt="Original Case Study page 3"></a>
    </div>
    <div class="muted" style="margin-top:8px">Click any page to open it full size.</div>
  </details>
</div>

  </div>`;
  document.getElementById('backQuestions').onclick=()=>{showCase=false;renderDashboard(data);};
}

showAccess();
