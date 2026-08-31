const API='https://cffftyplraalsrfejzql.supabase.co/functions/v1/atco-finance-live';
const CODE='FINANCE26';
const app=document.getElementById('app');
let selected='';
let heartbeatTimer=null;

const esc=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function participantId(){
  let value=localStorage.getItem('atcoFinancePid');
  if(!value){
    value=(crypto.randomUUID?crypto.randomUUID():'p-'+Date.now()+'-'+Math.random().toString(16).slice(2));
    localStorage.setItem('atcoFinancePid',value);
  }
  return value;
}

async function call(api,options={}){
  const headers={'content-type':'application/json'};
  if(options.pin) headers['x-participant-pin']=options.pin;
  const url=API+'?api='+encodeURIComponent(api)+'&code='+encodeURIComponent(CODE)+(options.extra||'');
  const response=await fetch(url,{method:options.method||'GET',headers,body:options.body?JSON.stringify(options.body):undefined,cache:'no-store'});
  let data={};
  try{data=await response.json();}catch{}
  if(!response.ok) throw new Error(data.error||('Request failed '+response.status));
  return data;
}

function showAccess(){
  const saved=sessionStorage.getItem('financeParticipantPin');
  if(saved){loadState();return;}
  app.innerHTML=`<div class="panel auth">
    <div class="qtag">PARTICIPANT ACCESS</div>
    <h1 class="title" style="margin-top:12px">Join Finance Challenge</h1>
    <div class="muted">Enter the participant access code to continue.</div>
    <input id="pin" inputmode="numeric" autocomplete="one-time-code" placeholder="Access code">
    <button class="primary" id="go">Continue</button>
    <div id="msg" class="error"></div>
  </div>`;
  document.getElementById('go').onclick=async()=>{
    const pin=document.getElementById('pin').value.trim();
    try{
      await call('participant-access',{method:'POST',body:{pin}});
      sessionStorage.setItem('financeParticipantPin',pin);
      loadState();
    }catch(error){document.getElementById('msg').textContent=error.message;}
  };
}

function showRegistration(){
  app.innerHTML=`<div class="panel auth">
    <div class="qtag">REGISTRATION</div>
    <h1 class="title" style="margin-top:12px">Participant Details</h1>
    <div class="muted">Enter your details before starting the 12-question challenge. The Case Study appears after the multiple-choice questions.</div>
    <input id="name" autocomplete="name" placeholder="Full name">
    <input id="dept" placeholder="Department">
    <button class="primary" id="register">Start Challenge</button>
    <div id="msg" class="error"></div>
  </div>`;
  document.getElementById('register').onclick=async()=>{
    const name=document.getElementById('name').value.trim();
    const department=document.getElementById('dept').value.trim();
    try{
      await call('register',{method:'POST',pin:sessionStorage.getItem('financeParticipantPin')||'',body:{code:CODE,participant_id:participantId(),full_name:name,department}});
      loadState();
    }catch(error){document.getElementById('msg').textContent=error.message;}
  };
}

async function loadState(){
  try{
    const data=await call('state',{pin:sessionStorage.getItem('financeParticipantPin')||'',extra:'&participant_id='+encodeURIComponent(participantId())});
    if(!data.participant){showRegistration();return;}
    if(data.completed){showCaseStudy(data);return;}
    renderQuestion(data);
    if(!heartbeatTimer) heartbeatTimer=setInterval(sendHeartbeat,8000);
  }catch(error){
    if(/code/i.test(error.message)){
      sessionStorage.removeItem('financeParticipantPin');
      showAccess();
      return;
    }
    app.innerHTML=`<div class="panel auth"><div class="error">${esc(error.message)}</div><button class="secondary" style="margin-top:12px" onclick="location.reload()">Try again</button></div>`;
  }
}

async function sendHeartbeat(){
  try{await call('state',{pin:sessionStorage.getItem('financeParticipantPin')||'',extra:'&participant_id='+encodeURIComponent(participantId())});}catch{}
}

function renderQuestion(data){
  selected='';
  const q=data.question;
  const percent=Math.round((data.progress/data.total_questions)*100);
  const options=(q.options||[]).map((option,index)=>`<button class="opt" data-value="${esc(option)}"><span class="opt-inner"><span class="letter">${String.fromCharCode(65+index)}</span><span>${esc(option)}</span></span></button>`).join('');
  app.innerHTML=`<div class="question">
    <div class="between">
      <div><b>${esc(data.participant.full_name)}</b><div class="muted">${esc(data.participant.department||'')}</div></div>
      <div><b>${data.progress} / ${data.total_questions}</b></div>
    </div>
    <div class="progress"><span style="width:${percent}%"></span></div>
    <div class="panel">
      <div class="qtag">Q${q.order_no} • ${esc(q.section||'Finance')}</div>
      <div class="qtext">${esc(q.prompt)}</div>
      <div class="options">${options}</div>
      <button class="primary" id="submit" disabled>${q.order_no===data.total_questions?'Submit Final Answer':'Submit & Next Question'}</button>
      <div id="msg"></div>
    </div>
  </div>`;
  document.querySelectorAll('.opt').forEach((button)=>{
    button.onclick=()=>{
      selected=button.dataset.value||'';
      document.querySelectorAll('.opt').forEach((x)=>x.classList.remove('sel'));
      button.classList.add('sel');
      document.getElementById('submit').disabled=false;
    };
  });
  document.getElementById('submit').onclick=async()=>{
    if(!selected) return;
    const button=document.getElementById('submit');
    button.disabled=true;
    button.textContent='Saving...';
    try{
      await call('submit',{method:'POST',pin:sessionStorage.getItem('financeParticipantPin')||'',body:{code:CODE,participant_id:participantId(),question_id:q.id,answer:selected}});
      await loadState();
    }catch(error){
      button.disabled=false;
      button.textContent='Submit & Next Question';
      document.getElementById('msg').innerHTML=`<div class="error">${esc(error.message)}</div>`;
    }
  };
}

function showCaseStudy(data){
  if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null;}
  app.innerHTML=`<div class="panel case-panel">
    <div class="case-complete">
      <div class="case-check">✓</div>
      <h1 class="title">12 Questions Completed</h1>
      <div class="muted">All ${data.total_questions} multiple-choice answers have been recorded. The Case Study is the final part below.</div>
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
}

showAccess();
