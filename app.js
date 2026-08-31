const API='https://mwlrmnhudzbivfjsfsms.supabase.co/functions/v1/atco-finance-api-v4';
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
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:48px;color:#12834f">✓</div>
      <h1 class="title">12 Questions Completed</h1>
      <div class="muted">All ${data.total_questions} multiple-choice answers have been recorded. Now review the Case Study below.</div>
    </div>
    <div class="qtag">FINAL CASE STUDY • LOWLAND PRODUCTS LIMITED</div>
    <div class="case-study-images">
      <img src="/assets/case-study-1.png" alt="Case Study page 1">
      <img src="/assets/case-study-2.png" alt="Case Study page 2">
      <img src="/assets/case-study-3.png" alt="Case Study page 3">
    </div>
    <div class="notice" style="margin-top:18px"><b>Required:</b> Prepare the accounting equation as at 30 November 20x0, the Profit & Loss Account for the quarter ended 31 December 20x0, and the Balance Sheet as at 31 December 20x0.</div>
  </div>`;
}

showAccess();
