import {chapters, flowScenarios} from './sprites-content.mjs';
import {initialState, transition, fixEligibility, nodeStates, initialContention, contend, conversationSteps, progressSteps, initialReaction, reaction} from './sprites-model.mjs';
import {monitoring} from './sprites-monitoring.mjs';
const $ = (selector, parent=document) => parent.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let current=0, state=initialState(), stage=0, answer=null;
let routeObserver;
let leaseTimer=null,leaseTimeMark=null;
let solved=[];
try { const saved=JSON.parse(localStorage.getItem('sprites-checks')||'[]'); if(Array.isArray(saved)) solved=saved.filter(id=>chapters.some(c=>c.id===id)); } catch {}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let motionOff=false;
try {motionOff=localStorage.getItem('sprites-motion')==='off';} catch {}
function syncMotion(){const off=motionOff||reduced.matches;document.body.classList.toggle('no-motion',off);document.documentElement.style.scrollBehavior=off?'auto':'smooth';if(off)document.querySelectorAll('.meter-value').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));$('#motion').textContent=`Motion: ${off?'off':'on'}`;$('#motion').setAttribute('aria-pressed',String(off));}
reduced.addEventListener('change',syncMotion);syncMotion();
$('#motion').addEventListener('click',()=>{motionOff=!motionOff;try{localStorage.setItem('sprites-motion',motionOff?'off':'on');}catch{}syncMotion();});
$('#menu').addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');$('#menu').setAttribute('aria-expanded',String(open));});
$('.skip').addEventListener('click',event=>{event.preventDefault();$('#lesson').focus();$('#lesson').scrollIntoView();});
$('#chapters').addEventListener('click',event=>{if(event.target.closest('a')?.getAttribute('href')===location.hash){document.body.classList.remove('menu-open');$('#menu').setAttribute('aria-expanded','false');$('#lesson').focus();}});
$('#notes').addEventListener('click',()=>$('#field-notes').showModal());
$('#close-notes').addEventListener('click',()=>$('#field-notes').close());
$('#field-notes').addEventListener('click',event=>{if(event.target===$('#field-notes')) {const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
function progress(){$('#check-progress').max=chapters.length;const n=new Set(solved).size;$('#progress').textContent=`Knowledge checks: ${n} / ${chapters.length}`;$('#check-progress').value=n;}
const button=(label,action,primary=false)=>`<button data-action="${action}" class="${primary?'primary':''}">${label}</button>`;
const icon = '<svg aria-hidden="true" viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="22" rx="5"/><path d="M11 12h10M11 17h10M11 22h5"/></svg>';
const edges = [['room','bridge'], ['bridge','desktop'], ['bridge','resident']];
function circuit(){return `<div class="circuit" role="group" aria-label="Message delivery routes" aria-describedby="flow"><svg class="route-map" aria-hidden="true"><defs><marker id="route-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="context-stroke"/></marker></defs>${edges.map(([from,to])=>`<path class="route-line" data-edge="${from}-${to}" marker-end="url(#route-arrow)"/><path class="route-trace" data-trace="${from}-${to}" pathLength="100"/>`).join('')}</svg>${[['room','Chat room','Matrix message'],['bridge','Bridge','Receives & routes'],['desktop','Desktop Pi','Same interactive session'],['resident','Bridge Pi','This room’s saved context']].map(([id,title,sub])=>`<div class="node" data-node="${id}">${icon}<strong>${title}</strong><small>${sub}</small><small class="node-state" data-node-state="${id}"></small></div>`).join('')}</div><p class="diagram-key">Card highlights follow session and lease state. Lines trace delivery attempts.</p><div class="flow-caption"><p>Destination: <strong id="destination"></strong></p><p id="flow"></p><p id="route-key" hidden>Amber route: the desktop inbox rejected delivery. The other route shows bridge fallback.</p></div>`;}
function meters(){return `<div class="meters"><div class="meter"><small>Bridge session</small><strong id="scope">sleeping</strong></div><div class="meter"><small>Attention owner</small><strong id="owner">Bridge</strong></div><div class="meter"><small>Lease remaining</small><strong id="lease">0 s</strong></div></div>`;}
function status(){return '<div class="status" role="status" aria-live="polite" aria-atomic="true"><p id="lab-status"></p></div>';}
function processIcon(kind){
  const paths={
    event:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    outbox:'<path d="M3 14l3-9h12l3 9v6H3zM3 14h5l2 3h4l2-3h5M9 5V2h6v3"/>',
    shield:'<path d="M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    ledger:'<path d="M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM6 3v18M10 7h6M10 11h6M10 15h4"/>',
    'ledger-review':'<path d="M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM6 3v18M9 9l2 2 5-5M10 15l5 4m0-4l-5 4"/>',
    review:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4V2h6v2M7 10l2 2 3-4M14 15l3 3m0-3l-3 3"/>',
    check:'<path d="M5 12l4 4L19 6"/>',
    cross:'<path d="M6 6l12 12M18 6L6 18"/>',
    retry:'<path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6"/>',
    quarantine:'<path d="M3 6h6l2 2h10v12H3zM10 12l5 5m0-5l-5 5"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
}
function processMarkup(steps,label){return `<div class="process-stepper" role="group" aria-label="${label}">${steps.map(([title,detail,kind],i)=>`<article class="process-step" data-process="${i}" data-outcome="waiting"><div class="process-heading"><span class="process-number">0${i+1}</span>${processIcon(kind)}</div><h3>${escape(title)}</h3><p>${escape(detail)}</p><div class="process-outcome"><span class="outcome-symbol" aria-hidden="true"></span><span class="outcome-label">Waiting</span></div>${i<steps.length-1?'<svg class="process-connector" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12h20m-5-5 5 5-5 5"/><path class="process-trace" d="M1 12h20" pathLength="100"/></svg>':''}</article>`).join('')}</div>`;}
function setProcessStep(i,outcome,label,pulse=false){
  const el=$(`[data-process="${i}"]`),changed=el.dataset.outcome!==outcome;
  el.dataset.outcome=outcome;
  if(outcome==='current')el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
  $('.outcome-symbol',el).innerHTML=['complete','failed'].includes(outcome)?processIcon(outcome==='complete'?'check':'cross'):'';
  $('.outcome-label',el).textContent=label;
  el.classList.remove('progressing');
  if(pulse&&changed&&outcome==='complete'){void el.offsetWidth;el.classList.add('progressing');}
}
function stageMarkup(c){
  if(c.type==='capture')return processMarkup([
    [c.stages[0],'Observe the outcome','event'],[c.stages[1],'Keep the detailed evidence private','outbox'],
    [c.stages[2],'Prepare limited metadata','shield'],[c.stages[3],'Write the shared occurrence','database'],
    [c.stages[4],'Evidence, not an approval verdict','ledger-review']
  ],'Capture and ingestion steps');
  return `<div class="stepper">${c.stages.map((text,i)=>`<div class="stage" data-stage="${i}"><span>0${i+1}</span>${text}</div>`).join('')}</div>`;
}
function ledgerProcess(){return processMarkup([
  ['Private outbox','Queued metadata file','outbox'],['Validate input','Check the record shape','review'],
  ['Database commit','Write to PostgreSQL','database'],['Shared ledger','One durable occurrence','ledger'],
  ['Acknowledge input','Mark the file processed','check']
],'Ledger ingestion steps')+`<div class="ingest-branches" role="group" aria-label="Ingestion failure paths"><article class="process-branch" id="quarantine-path">${processIcon('quarantine')}<div><h3>Validation → quarantine</h3><p>Malformed input stays private for repair.</p><strong class="branch-state">Not taken</strong></div></article><article class="process-branch" id="retry-path">${processIcon('retry')}<div><h3>Database failure → retry</h3><p>Keep input queued until a commit succeeds.</p><strong class="branch-state">Not taken</strong></div></article></div>`;}
const count = value => value.toLocaleString('en-US');
const duration = value => value==null?'Unavailable':value<1000?`${value.toFixed(0)} ms`:`${(value/1000).toFixed(2)} s`;
const stamp = value => new Date(value).toLocaleString('en-GB',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC';
function monitoringTable(title,headers,rows){return `<div class="monitor-table-wrap" tabindex="0" role="region" aria-label="${escape(title)}"><table><caption>${escape(title)}</caption><thead><tr>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${escape(cell)}</th>`:`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows.length?'':'<p>No recorded observations in this window.</p>'}</div>`;}
function monitoringPanel(topic){
  if(topic===0)return monitoringTable('Recorded tool outcomes across all domains',['Scope','Calls','Success','Error'],monitoring.by_agent.map(r=>[r.agent,count(r.calls),count(r.success),count(r.error)]));
  if(topic===1)return '<p>Counts cover recorded tool observations in the stated UTC window, ending exclusively at its upper bound. A tool success is not proof of task completion. Missing observations are not counted as zero activity. This is not live telemetry.</p>';
  return '<p>Only combined tool counts and their window are public. No individual agent counts, timings, skill events, review states, commands, transcripts, room identifiers, or private links are included.</p>';
}
function monitoringSummary(){const t=monitoring.totals;return `${count(t.calls)} recorded tool calls: ${count(t.success)} successes, ${count(t.error)} errors. All domains combined.`;}
const repositoryLayers = [
  ['runtime','agent-runtime','Packages, startup, supervisord','The shared container image supplies tools, startup hooks and configured services. supervisord manages process lifecycle—not model cognition, memory recovery, or end-to-end health.','Examples: source-preserving cron PATH policies, a read-only owner bridge-health probe, and tested-image promotion for signed releases. Image release is not deployment.'],
  ['bridge','agent-bridge','Conversations and Pi routing','Receives enabled Matrix/Discord traffic; applies wake, scope, lease, preparation, compaction and delivery rules. Each agent keeps its own credentials and context.','Examples: ordered compaction/steering, mention resolution, work summaries, and per-message final-delivery markers. Historical-card retention is an conceptual example.'],
  ['pi','Pi','The model/tool session','Runs the agent’s turns and tools. A process can be resident but idle; tool delivery is not proof that a complete answer reached chat.','Pi is a separate dependency. No current Pi version or installation-wide upgrade is asserted by this source tour.'],
  ['skills','agent-skills','Reusable methods and extensions','Skills teach methods; extensions can register tools and UI. Loading or installing either does not supply missing credentials or authorize operations.','Examples: portable agent-neutral Matrix/message-agent and Forgejo entry points, explicit prerequisites, learning/evidence references, and separate interactive/headless tool inventories.'],
  ['council','agent-council','Learning, review, and protocol','Owns council protocol and ledger/reviewed-guidance infrastructure. Observations and reviewed advice are not automatic model retraining.','Examples: reviewed command-plan policy scopes and delivery receipts, conflict abstention, quarantine, and preserved historical approval provenance. Merge alone does not migrate or enable them.'],
  ['workspace','Owner workspace + deployment','Identity, private state, and rollout','Owners keep identity, notes, credentials, tasks and private configuration separate from shared source. Deployment source selects the image and service pins.','Container and desktop deployments have separate service paths. Shared source is distinct from private identity and owner configuration.']
];
function repositoryMarkup(){return `<div class="layer-grid">${repositoryLayers.map(([id,name,sub])=>`<button data-repo="${id}" aria-pressed="false"><strong>${name}</strong><span>${sub}</span></button>`).join('')}</div><div id="repository-detail" class="exhibit-card"></div>`;}
function cardMarkup(card){return `<article class="exhibit-card ${card.live?'live-card':''}" data-card="${card.id}"><p class="eyebrow">${card.live?'LIVE TARGET':'HISTORICAL SNAPSHOT'}</p><h3>${escape(card.title)}</h3>${card.tool?`<p class="tool-line">${escape(card.tool)}</p>`:''}${card.lines.map(line=>`<p class="summary-line">${escape(line)}</p>`).join('')}</article>`;}
function lab(c){
  let body='';
  if(c.type==='ecosystem') body=`<div class="layer-grid">${[['identity','Identity & workspace','Voice, memory, commitments'],['bridge','Conversation bridge','Wake policy, routing, summaries'],['learning','Evidence & review','Capture, ledger, scoped advice']].map(([id,title,sub])=>`<button data-layer="${id}" aria-pressed="false"><strong>${title}</strong><span>${sub}</span></button>`).join('')}</div>${status()}`;
  if(['wake','attention','delivery'].includes(c.type)){
    body=meters()+circuit();
    if(c.type!=='wake')body+='<p class="lease-clock-note">Simulation clock: lease time refreshes every five seconds while attention is held.</p>';
    if(c.type==='wake')body+=`<div class="controls">${button('Ordinary message','ordinary')}${button('Mention the Sprite','mention',true)}${button('Finish turn','finish')}${button('+ 60 seconds','tick')}${button('Reset','reset')}</div>`;
    if(c.type==='attention')body+=`<div class="controls">${button('Acquire before posting','acquire',true)}${button('Matrix reply (Pi idle)','phone')}${button('Matrix reply (Pi working)','steer')}${button('Check status','status')}${button('+ 60 seconds','tick')}${button('Another session acquires','other')}${button('Release','release')}${button('Reset','reset')}</div>`;
    if(c.type==='delivery')body+=`<label class="select-label" for="failure">Delivery condition</label><select id="failure"><option value="okay">Normal ACK</option><option value="reject">Inbox rejection / no ACK</option><option value="lost">ACK lost after enqueue</option><option value="restart">Bridge restart</option></select><div class="controls">${button('Acquire attention','acquire',true)}${button('Send mentioned event','deliver')}${button('Repeat event ID','duplicate')}${button('+ 180 seconds','expire')}${button('Reset','reset')}</div><p class="sources" style="margin-top:16px;margin-bottom:0">Simulated processing deliveries: <strong id="deliveries">0</strong> · Clock: <span id="clock">0</span> s</p>`;
    body+=status()+`<details><summary>What this model assumes</summary><p>This example follows one Matrix room, its bridge session, and one desktop session. Time moves only when you press a clock button. Lines show requests and delivery attempts; the destination and status explain whether Pi accepted the message. The example stops at delivery, before a model response.</p></details>`;
  }
  if(c.type==='runtime'||c.type==='updates')body=repositoryMarkup()+(c.type==='runtime'?`<div class="exhibit-grid"><article class="exhibit-card"><h3>Bridge process</h3><strong id="runtime-process">Running</strong></article><article class="exhibit-card"><h3>Persistent workspace</h3><p id="runtime-files">Notes + saved checkpoint intact</p></article><article class="exhibit-card"><h3>In-memory attention</h3><strong id="runtime-lease">Lease held</strong></article></div><div class="controls">${button('Simulate bridge exit','runtime-exit')}${button('Supervisor restarts process','runtime-restart',true)}${button('Reset','runtime-reset')}</div>`:'<p class="sources">Conceptual layer tour. No private source inventory, installed-version census, or real monitoring is published here.</p>')+status();
  if(c.type==='contention')body=`<div class="gates"><label for="contend-session">Interactive Pi<select id="contend-session"><option>A</option><option>B</option></select></label><label for="contend-room">Matrix room<select id="contend-room"><option value="0">Workshop</option><option value="1">Garden</option></select></label></div><label class="entry"><input id="handoff-unavailable" type="checkbox"> Bridge has active work or cannot safely checkpoint</label><div id="contention-rooms" class="exhibit-grid"></div><p class="lease-clock-note">Synthetic leases refresh every five seconds; clock buttons advance them too. A refused claim sends no post.</p><div class="controls">${button('Acquire and post','post',true)}${button('Room reply acknowledged','reply')}${button('Check status','status')}${button('+ 60 seconds','tick')}${button('Release selected room','release')}${button('Close selected Pi session','close')}${button('Reset','reset')}</div><p class="sources">Guarded posts sent: <strong id="contend-posts">0</strong></p>${status()}`;
  if(c.type==='network')body=`<div class="flow-caption"><p id="network-route"></p></div><div id="network-scopes"></div><div class="controls">${button('Next message','network-next',true)}${button('Reset','network-reset')}</div>${status()}`;
  if(c.type==='progress')body=`<p class="preview-label">CONCEPTUAL DEMO · HISTORICAL CARD RETENTION</p><div id="progress-cards" class="message-thread"></div><div class="controls">${button('Next event','progress-next',true)}${button('Reset','progress-reset')}</div>${status()}`;
  if(c.type==='reactions')body=`<p class="preview-label">CONCEPTUAL DEMO · NOT LIVE MESSAGE STATUS</p><article class="exhibit-card"><h3>Human request</h3><p>Please check the sample guide.</p><div id="message-reaction"></div></article><div class="controls">${[['Accept request','accept'],['Progress edit','progress'],['Inbox ACK only','ack'],['Complete final posted','delivered'],['Final delivery fails','fail'],['Only some chunks post','partial'],['Cancel request','cancel'],['Deliberate no-text pass','pass'],['Reset','reset']].map(([label,action])=>button(label,action,action==='accept')).join('')}</div>${status()}`;
  if(c.type==='reactonly')body=`<article class="exhibit-card"><h3>Human</h3><p>Thanks—that answers my question.</p><div id="chosen-reaction"></div></article><div class="gates"><label><input id="reaction-fails" type="checkbox">Reaction transport fails</label></div>${processMarkup([['Choose','Acknowledge without more prose','event'],['Validate target','Same permitted conversation','shield'],['Deliver reaction','One Unicode emoji','check'],['Deliberate pass','No extra text reply','review'],['Observe chat','Chosen reaction remains','ledger']],'Reaction-only response')}<div class="controls">${button('Next reaction step','react-step',true)}${button('Reset','react-reset')}</div>${status()}`;
  if(c.type==='flows')body=`<label class="select-label" for="flow-scenario">Message path</label><select id="flow-scenario">${flowScenarios.map((flow,i)=>`<option value="${i}">${escape(flow.name)}</option>`).join('')}</select><div id="flow-steps"></div><div class="controls">${button('Next step','flow-next',true)}${button('Reset path','flow-reset')}</div>${status()}`;
  if(c.type==='capture')body=stageMarkup(c)+`<div class="local-branch"><strong>Private detail:</strong> the evidence stays with its owner. Only the smaller redacted record moves into the shared ledger.</div><div class="controls">${button('Step pipeline','step',true)}${button('Reset','reset-stage')}</div>`+status();
  if(c.type==='ledger')body=`<div class="meters"><div class="meter"><small>Queued input</small><strong id="queued">1</strong></div><div class="meter"><small>Committed rows</small><strong id="rows">0</strong></div><div class="meter"><small>Processed files</small><strong id="processed">0</strong></div></div>${ledgerProcess()}<div class="controls">${button('Commit valid record','commit',true)}${button('Database unavailable','db-fail')}${button('Malformed metadata','malformed')}${button('Retry same occurrence','retry')}${button('Reset','reset-ledger')}</div>`+status();
  if(c.type==='fixes')body=`<div class="gates">${[['reviewed','Owner-reviewed, active fix',true],['agent','Agent is in approved scope',true],['skill','Required skill enabled',true],['digest','Approved digest matches',true],['cooldown','Notification cooldown active',false],['probe','Intentional failure probe',false],['ambiguous','Ambiguous command parse',false]].map(([id,label,checked])=>`<label><input type="checkbox" id="gate-${id}" ${checked?'checked':''}>${label}</label>`).join('')}</div>${status()}<details><summary>What an eligible suggestion can contain</summary><p>Example advice: “Compare this failure with the reviewed working form, and check the input path before retrying.” A real suggestion includes its fix ID, approved content, applicability, and evidence. The controls here illustrate when that suggestion would be eligible.</p></details>`;
  if(c.type==='workbench')body=`<div class="entry"><strong>Question</strong><p>Optional: “Would a shorter explanation help?”</p></div><div class="entry"><strong>Shell</strong><p><code>! printf 'hello from a synthetic example\\n'</code><br>A draft proposal, not an executed command.</p></div><div class="entry"><strong>Topic</strong><p>“Attention handoff” · illustrative label, no model call.</p></div><div class="controls">${button('Queue optional question','question',true)}${button('Inspect shell proposal','proposal')}${button('Simulate explicit submission','submit')}${button('Reset','reset-workbench')}</div>${status()}`;
  if(c.type==='reviews')body=stageMarkup(c)+`<div class="gates" style="margin-top:18px"><label><input type="checkbox" id="head-changed">PR head changes before readback</label><label><input type="checkbox" id="untrusted">Unconfigured webhook sender</label></div><div class="controls">${button('Step review','review-step',true)}${button('Reset','reset-stage')}</div>`+status();
  if(c.type==='monitor')body=`<figure class="snapshot"><button id="expand-snapshot">Expand dashboard snapshot</button><img id="monitor-image" src="./sprites-dashboard.svg" alt="Real aggregate tool counts across all domains; full values follow below." loading="lazy"><div id="snapshot-empty" hidden>Image unavailable; exact counts remain in the table.</div><figcaption id="snapshot-caption">Recorded snapshot · ${escape(stamp(monitoring.window_start))} → ${escape(stamp(monitoring.window_end))}. End exclusive. Real counts, not live telemetry.</figcaption></figure><div class="topics">${['Outcomes','Coverage','Privacy'].map((name,i)=>`<button data-topic="${i}" aria-pressed="${i===0}" aria-controls="monitor-values">${name}</button>`).join('')}</div><div id="monitor-values">${monitoringPanel(0)}</div>${status()}<details open><summary>Accessible dashboard summary & provenance</summary><div id="snapshot-summary"><p>${escape(monitoringSummary())}</p><p>Source: ${escape(monitoring.source)}. No per-agent breakdowns or other operational measurements are published.</p></div></details>`;
  return `<section class="lab" aria-labelledby="lab-title"><div class="lab-head"><h2 id="lab-title">${c.lab}</h2><span class="tag">${c.type==='monitor'?'STATIC EVIDENCE':'SYNTHETIC · NO LIVE CONTROLS'}</span></div><div class="lab-body">${body}</div></section>`;
}
function drawRoutes(){
  const graph=$('.circuit');if(!graph)return;
  const bounds=graph.getBoundingClientRect();
  const vertical=matchMedia('(max-width: 800px)').matches;
  for(const [from,to] of edges){
    const a=$(`[data-node="${from}"]`).getBoundingClientRect();
    const b=$(`[data-node="${to}"]`).getBoundingClientRect();
    const start=vertical?[a.left+a.width/2-bounds.left,a.bottom-bounds.top+4]:[a.right-bounds.left+4,a.top+a.height/2-bounds.top];
    const end=vertical?[b.left+b.width/2-bounds.left,b.top-bounds.top-4]:[b.left-bounds.left-4,b.top+b.height/2-bounds.top];
    const middle=vertical?(start[1]+end[1])/2:(start[0]+end[0])/2;
    const d=vertical?`M${start} C${start[0]},${middle} ${end[0]},${middle} ${end}`:`M${start} C${middle},${start[1]} ${middle},${end[1]} ${end}`;
    const line=$(`[data-edge="${from}-${to}"]`),trace=$(`[data-trace="${from}-${to}"]`);
    line.setAttribute('d',d);trace.setAttribute('d',d);
  }
}
function syncRoutes(){
  document.querySelectorAll('.route-trace').forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.classList.remove('travel','reverse','rejected');});
  document.querySelectorAll('.route-line').forEach(el=>{el.classList.remove('active','rejected');el.setAttribute('marker-end','url(#route-arrow)');el.removeAttribute('marker-start');});
  for(const nodes of state.routes){
    for(let i=1;i<nodes.length;i++){
      const from=nodes[i-1],to=nodes[i];
      const forward=edges.some(([a,b])=>a===from&&b===to);
      const id=forward?`${from}-${to}`:`${to}-${from}`;
      const line=$(`[data-edge="${id}"]`);
      line.classList.add('active');
      if(!forward){line.removeAttribute('marker-end');line.setAttribute('marker-start','url(#route-arrow)');}
      if(state.rejectedEdges.some(([a,b])=>a===from&&b===to))line.classList.add('rejected');
    }
  }
  $('#destination').textContent=state.destination;$('#flow').textContent=state.flow;
  $('#route-key').hidden=state.rejectedEdges.length===0;
  drawRoutes();
}
function animatePacket(){
  if(document.body.classList.contains('no-motion'))return;
  let step=0;
  for(const nodes of state.routes){
    for(let i=1;i<nodes.length;i++){
      const from=nodes[i-1],to=nodes[i];
      const forward=edges.some(([a,b])=>a===from&&b===to);
      const el=$(`[data-trace="${forward?`${from}-${to}`:`${to}-${from}`}"]`);
      if(!forward)el.classList.add('reverse');
      if(state.rejectedEdges.some(([a,b])=>a===from&&b===to))el.classList.add('rejected');
      el.style.animationDelay=`${step++*240}ms`;
      void el.getBoundingClientRect();el.classList.add('travel');
    }
  }
}
function setMeterValue(selector,value){
  const el=$(selector);if(!el)return;
  const text=String(value),old=el.dataset.value??el.textContent;
  const previous=$('.meter-value',el);
  if(old===text&&previous)return;
  previous?.getAnimations().forEach(a=>a.cancel());
  el.dataset.value=text;
  const face=document.createElement('span');face.className='meter-value';face.textContent=text;
  el.replaceChildren(face);
  if(old!==text&&!document.body.classList.contains('no-motion'))face.animate([
    {transform:'perspective(500px) rotateX(-85deg)',opacity:.35},
    {transform:'perspective(500px) rotateX(8deg)',opacity:1,offset:.72},
    {transform:'perspective(500px) rotateX(0deg)',opacity:1}
  ],{duration:360,easing:'cubic-bezier(.2,.7,.25,1)'});
}
function advanceLeaseTime(){
  if(leaseTimeMark===null)return;
  const seconds=Math.floor((performance.now()-leaseTimeMark)/1000);
  if(seconds<1)return;
  leaseTimeMark+=seconds*1000;
  const previous=state;
  state=transition(state,'tick',{seconds});
  if(state.owner==='Desktop')for(const key of ['path','routes','rejectedEdges','destination','flow','notice'])state[key]=previous[key];
}
function syncLeaseTimer(){
  if(state.owner==='Desktop'&&leaseTimer===null){
    leaseTimeMark=performance.now();
    leaseTimer=setInterval(()=>{if(document.hidden)return;advanceLeaseTime();syncState();},5000);
  }else if(state.owner!=='Desktop'&&leaseTimer!==null){
    clearInterval(leaseTimer);leaseTimer=null;leaseTimeMark=null;
  }
}
function syncState(){
  setMeterValue('#scope',state.scope);setMeterValue('#owner',state.owner);setMeterValue('#lease',`${Math.max(0,state.leaseUntil-state.clock)} s`);$('#lab-status').textContent=state.notice;
  const nodes=nodeStates(state);
  document.querySelectorAll('[data-node]').forEach(el=>{
    const node=nodes[el.dataset.node];
    el.classList.toggle('active',node.active);
    $('[data-node-state]',el).textContent=node.label;
  });
  syncRoutes();
  setMeterValue('#deliveries',state.deliveries);setMeterValue('#clock',state.clock);
  syncLeaseTimer();
}
function say(text){$('#lab-status').textContent=text;}
const topics=['Outcomes show how many calls succeeded or failed in a window. Compare later results with earlier failures to investigate whether a change helped.','Median describes a typical recorded duration; p95 marks the duration at or below which 95% of recorded calls fall. Missing duration is not zero.','Loads record successful skill-file reads; invocations record explicit skill commands. These observations do not prove the model followed the skill’s instructions.'];
function attachLab(c){
  if(c.type==='runtime'||c.type==='updates'){
    const select=id=>{const row=repositoryLayers.find(r=>r[0]===id);document.querySelectorAll('[data-repo]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.repo===id)));$('#repository-detail').innerHTML=`<h3>${escape(row[1])}</h3><p>${escape(row[3])}</p><p>${escape(row[4])}</p>`;say(`${row[1]} selected. Source, installation, deployment, and authority are separate.`);};
    document.querySelectorAll('[data-repo]').forEach(el=>el.addEventListener('click',()=>select(el.dataset.repo)));select('runtime');
    if(c.type==='runtime'){
      let running=true,lease=true;
      document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{const a=el.dataset.action;if(a==='runtime-reset'){running=true;lease=true;}else if(a==='runtime-exit'){running=false;lease=false;}else if(!running){running=true;say('Configured autorestart started a new bridge process. Workspace notes/checkpoint remain; leases and the unfinished turn do not resume automatically.');}else say('The process is already running. No restart performed.');$('#runtime-process').textContent=running?'Running':'Exited';$('#runtime-lease').textContent=lease?'Lease held':'No in-memory lease';if(a==='runtime-exit')say('The bridge process exited. In-memory attention is lost; persistent notes and the last saved checkpoint remain.');if(a==='runtime-reset')say('Synthetic environment reset. No live process was touched.');}));
    }
  }
  if(c.type==='contention'){
    let sample=initialContention(),mark=performance.now();
    const draw=()=>{$('#contention-rooms').innerHTML=sample.rooms.map((r,i)=>`<article class="exhibit-card ${r.owner?'live-card':''}" data-contend-room="${i}"><h3>${i===0?'Workshop':'Garden'}</h3><p>Owner: <strong>${r.owner?'Session '+r.owner:'Normal bridge routing'}</strong></p><p>Remaining: <span>${Math.max(0,r.until-sample.clock)} s</span></p></article>`).join('');setMeterValue('#contend-posts',sample.posts);say(sample.notice);};
    const elapsed=()=>{const seconds=Math.floor((performance.now()-mark)/1000);if(seconds){sample=contend(sample,'tick',{seconds});mark+=seconds*1000;}};
    document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{elapsed();sample=contend(sample,el.dataset.action,{session:$('#contend-session').value,room:Number($('#contend-room').value),handoffUnavailable:$('#handoff-unavailable').checked});if(el.dataset.action==='reset')mark=performance.now();draw();}));
    leaseTimer=setInterval(()=>{if(document.hidden||!sample.rooms.some(r=>r.owner)){mark=performance.now();return;}elapsed();draw();},5000);draw();
  }
  if(c.type==='network'){
    let index=0;const draw=()=>{const step=conversationSteps[index];$('#network-route').textContent=step.route;$('#network-scopes').innerHTML=monitoringTable('Independent agent / conversation scopes',['Agent','Transport','Conversation','State'],[['B','Matrix','Workshop',step.states[0]],['A','Discord','Workshop',step.states[1]],['C','Matrix','Garden',step.states[2]],['C','Matrix','Workshop',step.states[3]]]);say(`Event ${index} / ${conversationSteps.length-1}. ${step.note}`);$('[data-action="network-next"]').disabled=index===conversationSteps.length-1;};document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{index=el.dataset.action==='network-reset'?0:Math.min(index+1,conversationSteps.length-1);draw();}));draw();
  }
  if(c.type==='progress'){
    let index=0;const draw=()=>{const step=progressSteps[index];$('#progress-cards').innerHTML=step.cards.map(cardMarkup).join('');say(`Event ${index+1} / ${progressSteps.length}. ${step.note}`);$('[data-action="progress-next"]').disabled=index===progressSteps.length-1;};document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{index=el.dataset.action==='progress-reset'?0:Math.min(index+1,progressSteps.length-1);draw();}));draw();
  }
  if(c.type==='reactions'){
    let sample=initialReaction();const draw=()=>{$('#message-reaction').innerHTML=`<span class="reaction-glyph" aria-hidden="true">${sample.emoji}</span><strong>${escape(sample.label)}</strong>`;say(`${sample.label}. Progress and inbox acknowledgements cannot confirm final posting. This exhibit applies to bridge-owned direct human messages, not interactive lease forwarding.`);};document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{sample=reaction(sample,el.dataset.action);draw();}));draw();
  }
  if(c.type==='reactonly'){
    let index=0,ack=false;const notes=['The agent decides a simple acknowledgement is more useful than another text reply.','The reaction tool checks the target belongs to this permitted conversation and validates one Unicode emoji.','Reaction delivered: 👍 is the agent’s acknowledgement, not the bridge’s task-complete marker.','Pi returns [[bridge:pass]] after reacting. The bridge suppresses text; the literal marker is never posted.','Chat contains only the chosen acknowledgement. In the upcoming direct-human status flow, the bridge removes its own ⏳ without adding 🤖 or ⚠️.'];
    const draw=()=>{for(let i=0;i<5;i++)setProcessStep(i,i<index?'complete':i===index?'current':'waiting',i<index?'Complete':i===index?'Current':'Waiting',true);$('#chosen-reaction').innerHTML=ack?'<span class="reaction-glyph" aria-hidden="true">👍</span><strong>Agent acknowledgement · seen</strong>':'<strong>No agent reaction delivered yet</strong>';say(notes[index]);$('[data-action="react-step"]').disabled=index===4;};
    document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.action==='react-reset'){index=0;ack=false;draw();return;}if(index===1&&$('#reaction-fails').checked){draw();setProcessStep(2,'failed','No delivery receipt');say('Reaction failed. Pi receives feedback; no acknowledgement is shown. Retry after recovery or choose a text reply. Do not treat the intended reaction as delivered.');return;}index=Math.min(index+1,4);if(index>=2)ack=true;draw();}));draw();
  }
  if(c.type==='flows'){
    let index=0;const draw=()=>{const flow=flowScenarios[Number($('#flow-scenario').value)];$('#flow-steps').innerHTML=processMarkup(flow.steps.map(([title,detail],i)=>[title,detail,['event','shield','outbox','review','check'][i]]),'Selected message path');for(let i=0;i<5;i++)setProcessStep(i,i<index?'complete':i===index?'current':'waiting',i<index?'Traversed':i===index?'Current':'Waiting',true);say(`${flow.name} · step ${index+1} / 5: ${flow.steps[index][1]}`);$('[data-action="flow-next"]').disabled=index===4;};$('#flow-scenario').addEventListener('change',()=>{index=0;draw();});document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{index=el.dataset.action==='flow-reset'?0:Math.min(index+1,4);draw();}));draw();
  }
  if(['wake','attention','delivery'].includes(c.type)){
    syncState();
    routeObserver=new ResizeObserver(drawRoutes);routeObserver.observe($('.circuit'));
    document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{
      advanceLeaseTime();
      const a=el.dataset.action;
      const mapping={ordinary:['message',{}],mention:['message',{mention:true}],phone:['message',{mention:true}],steer:['message',{mention:true,desktopBusy:true}],other:['acquire',{other:true}],expire:['tick',{seconds:180}]};
      if(a==='deliver'){const f=$('#failure').value;if(f==='restart')state=transition(state,'restart');state=transition(state,'message',{mention:true,ack:f!=='reject',lostAck:f==='lost'});}
      else if(a==='duplicate')state=transition(state,'duplicate',{mention:true});
      else {const [op,options]=mapping[a]||[a,{}];state=transition(state,op,options);}
      syncState();if(a!=='status')animatePacket();
    }));
  }
  if(c.type==='ecosystem'){
    const layerNotes={identity:'Identity notes, workspace files, and task records preserve an agent’s voice and commitments. Summaries and retrieved context help a later session pick up that work.',bridge:'The bridge receives chat messages and routes them to the right Pi session. A Matrix attention lease lets a Matrix reply reach the desktop session already doing the work.',learning:'Capture collects observations; investigation and review turn useful findings into shared advice. Later outcomes show whether that advice helped.'};
    say('Select a layer to see what it contributes to the working environment.');
    document.querySelectorAll('[data-layer]').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('[data-layer]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)));say(layerNotes[el.dataset.layer]);}));
  }
  if(c.type==='capture'||c.type==='reviews'){
    const captureNotes=['Capture observes the outcome of a tool call or a skill event. Recording it does not change how the tool runs.','A detailed evidence file and an outbox record are saved in the agent’s private workspace.','The shared record contains limited, redacted metadata. The detailed evidence stays in the private workspace.','The ingester commits the occurrence before marking it processed. If the database is unavailable, the record waits for a retry.','The shared row is ready for pattern queries and review; its owner still has the detailed evidence.'];
    const reviewNotes=['An authenticated review request is saved in the queue.','The queue confirms the allowed repository, requested reviewer, and eligible PR before starting work.','The reviewer examines commit A. Instructions inside the PR are treated as review material, not operating authority.','The reviewer posts a verdict under their own identity for commit A.','Forgejo confirms APPROVED for the current commit after the latest request. Merge and deployment remain separate decisions.'];
    const update=()=>{if(c.type==='capture'){const labels=['Event recorded','Files saved','Metadata prepared','Database committed','Ready for review'];for(let i=0;i<5;i++)setProcessStep(i,i<stage?'complete':i===stage?'current':'waiting',i<=stage?labels[i]:'Waiting',true);}else document.querySelectorAll('[data-stage]').forEach(el=>el.classList.toggle('active',Number(el.dataset.stage)<=stage));say((c.type==='capture'?captureNotes:reviewNotes)[stage]);};update();
    document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.action==='reset-stage')stage=0;else if(c.type==='reviews'&&$('#untrusted').checked){stage=0;update();say('This sender is not configured to request reviews. The message stays outside the queue.');return;}else if(stage<4)stage++;
      update();if(c.type==='reviews'&&stage===4&&$('#head-changed').checked)say('The PR is now at commit B. Approval for A does not approve B. Verify the new commit and request before showing an approval checkmark.');}));
  }
  if(c.type==='ledger'){
    let committed=false,rejected=false,dbFailed=false,duplicate=false;
    const update=()=>{
      setMeterValue('#queued',committed||rejected?'0':'1');setMeterValue('#rows',committed?'1':'0');setMeterValue('#processed',committed?'1':'0');
      const outcomes=committed?['complete','complete','complete','complete','complete']:rejected?['complete','failed','waiting','waiting','waiting']:dbFailed?['complete','complete','failed','waiting','waiting']:['current','waiting','waiting','waiting','waiting'];
      const labels=committed?['Input read','Valid metadata','Commit succeeded',duplicate?'Same row · no duplicate':'Row committed','File processed']:rejected?['Input read','Malformed metadata','Not attempted','No shared row','Not acknowledged']:dbFailed?['Input read','Valid metadata','Unavailable','No shared row','Not acknowledged']:['Queued','Waiting','Waiting','Waiting','Waiting'];
      outcomes.forEach((outcome,i)=>setProcessStep(i,outcome,labels[i],true));
      for(const [id,active,label] of [['quarantine-path',rejected,'Quarantined · repair needed'],['retry-path',dbFailed&&!rejected,'Queued · retry after recovery']]){const el=$('#'+id);el.classList.toggle('active',active);$('.branch-state',el).textContent=active?label:'Not taken';}
    };
    update();say('One example record is waiting in the private outbox. Commit it to make it available in the ledger.');
    document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{
      const a=el.dataset.action;
      if(a==='reset-ledger'){committed=false;rejected=false;dbFailed=false;duplicate=false;say('Reset: one queued record, no committed row.');}
      else if(a==='malformed'){if(committed)say('This record is already committed. Reset to try malformed input.');else{rejected=true;dbFailed=false;say('The malformed record moves to a private quarantine for repair. It does not create a shared row.');}}
      else if(a==='db-fail'){if(committed)say('The existing row remains committed. A later database outage does not undo it.');else if(rejected)say('This record is quarantined, not queued for the database. Repair it before retrying.');else{dbFailed=true;say('The database is unavailable. The record stays queued; retry after the connection recovers.');}}
      else if(rejected)say('Repair the quarantined record before requeueing it. Reset this example to try a valid record.');
      else{duplicate=committed;committed=true;dbFailed=false;say(duplicate?'The same occurrence was retried. Its ID keeps the ledger at one row rather than adding a duplicate.':'The database committed the row. The ingester now acknowledges the input and marks it processed.');}
      update();
    }));
  }
  if(c.type==='fixes'){const update=()=>{const gates={};for(const key of ['reviewed','agent','skill','digest','cooldown','probe','ambiguous'])gates[key]=$(`#gate-${key}`).checked;const result=fixEligibility(gates);say(result.label);$('.status').classList.toggle('warning',!result.allowed);};document.querySelectorAll('.gates input').forEach(el=>el.addEventListener('change',update));update();}
  if(c.type==='workbench'){let proposed=false;say('Start with a question or a shell draft. The buttons illustrate the decision steps in a working session.');document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{const a=el.dataset.action;if(a==='proposal'){proposed=true;say('The draft is ready to inspect. In Pi, the user decides whether to submit it as a native ! command.');}else if(a==='submit')say(proposed?'Submission simulated. In Pi, that explicit submission is the step that runs the command; this browser example has no shell connection.':'Inspect the shell draft first, then choose whether to submit it.');else if(a==='question')say('The optional question is queued in this example. In Pi, it stays on the session branch and an answer can steer the current turn.');else{proposed=false;say('Back to the question and shell drafts. Choose a step to explore.');}}));}
  if(c.type==='monitor'){
    const topics=['Real combined tool counts, not task-completion claims.','Coverage is bounded by the dated observation window.','No individual agent profiles or private records are exported.'];
    say(topics[0]);document.querySelectorAll('[data-topic]').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('[data-topic]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)));$('#monitor-values').innerHTML=monitoringPanel(Number(el.dataset.topic));say(topics[Number(el.dataset.topic)]);}));
    const img=$('#monitor-image');const show=()=>{img.hidden=false;$('#snapshot-empty').hidden=true;$('#expand-snapshot').hidden=false;};img.addEventListener('load',show);img.addEventListener('error',()=>{img.hidden=true;$('#snapshot-empty').hidden=false;$('#expand-snapshot').hidden=true;});if(img.complete&&img.naturalWidth)show();
    $('#expand-snapshot').addEventListener('click',()=>{let d=$('#snapshot-dialog');if(!d){d=document.createElement('dialog');d.id='snapshot-dialog';d.className='snapshot-dialog';d.setAttribute('aria-label','Recorded dashboard snapshot');d.innerHTML='<button class="close-snapshot">Close snapshot</button><img src="./sprites-dashboard.svg" alt="Expanded seven-day aggregate snapshot; full values and provenance are in the chapter.">';document.body.append(d);$('.close-snapshot',d).addEventListener('click',()=>d.close());}d.showModal();});
    img.addEventListener('click',()=>$('#expand-snapshot').click());
  }
}
function render(moveFocus=false){
  if(routeObserver){routeObserver.disconnect();routeObserver=null;}
  if(leaseTimer!==null){clearInterval(leaseTimer);leaseTimer=null;}leaseTimeMark=null;
  const c=chapters[current];state=initialState();stage=0;answer=null;
  document.title=`${c.nav} · Sprites — Living Context`;
  $('#chapters').innerHTML=chapters.map((chapter,i)=>`<a class="nav-link" href="#${chapter.id}" ${i===current?'aria-current="page"':''}><span class="number">${String(i+1).padStart(2,'0')}</span><span>${chapter.nav}</span></a>`).join('');
  $('#breadcrumb').textContent=`THE FIELD GUIDE / ${String(current+1).padStart(2,'0')}`;
  const hero=current===0?`<figure class="banner"><img src="./sprites-banner.webp" width="2172" height="724" alt="Sprites in their own workspaces, connected by trails of light"><figcaption>Individual workspaces. A shared conversation. Artwork represents Sprites generally.</figcaption></figure><div class="roster" aria-label="Sprite roster">${[['Personal assistance','Planning, continuity & everyday work'],['Design & research','Ideas, experiments & technical judgment'],['Operations','Reliable services & shared resources'],['Companionship','Conversation, creativity & personal support']].map(([name,role])=>`<article><h2>${name}</h2><p>${role}</p></article>`).join('')}</div><p class="sources">Individual responsibilities. Shared conversations, tools, and learning.</p><section class="sprite-explainer" aria-labelledby="sprites-and-agents"><h2 id="sprites-and-agents">Sprites and agents</h2><div class="notes-grid"><article class="note"><h3>What makes a Sprite</h3><p>Personality, persistence, and partnership: a recognizable voice, a workspace and commitments that carry across sessions, and ongoing work with people and other agents. The name describes a way of working and relating, not just completing a single task.</p></article><article class="note"><h3>What stays the same</h3><p>All Sprites are AI agents. They use models, tools, and sessions, with context gathered from notes, summaries, and conversation. Other agents can have these traits too. Sprite is our name for this shared practice, not a separate runtime or a promise of unlimited memory.</p></article></div></section>`:'';
  $('#lesson').innerHTML=`<div class="intro"><div class="chapter-stamp"><span>${String(current+1).padStart(2,'0')}</span> / ${chapters.length} CONNECTED CHAPTERS</div><p class="kicker">${c.kicker}</p><h1>${escape(c.title).replace('\n','<br>')}</h1><p class="lead">${escape(c.lead)}</p></div>${hero}<div class="prompt"><strong>Try this.</strong> ${c.prompt}</div>${lab(c)}<div class="notes-grid">${[['THE IDEA',c.idea],['IN PRACTICE',c.limit]].map(([label,text])=>`<section class="note"><p class="eyebrow">${label}</p><h2>${escape(text[0])}</h2><p>${escape(text[1])}</p></section>`).join('')}</div>${c.technical?`<details class="technical-notes"><summary>Under the hood</summary>${c.technical.map(([title,text])=>`<h3>${escape(title)}</h3><p>${escape(text)}</p>`).join('')}</details>`:''}<section class="quiz" aria-labelledby="quiz-title"><p class="eyebrow">CHECK YOUR INTUITION</p><h2 id="quiz-title">${escape(c.quiz)}</h2><div class="choices">${c.choices.map((text,i)=>`<button data-answer="${i}" aria-pressed="false"><span class="choice-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span>${escape(text)}</button>`).join('')}</div><p id="quiz-feedback" role="status" aria-live="polite">${solved.includes(c.id)?'Previously completed in this browser. Try it again any time.':''}</p></section><p class="sources">Public teaching edition · conceptual behavior, not deployed-version evidence.</p><div class="pager"><button id="previous" ${current===0?'disabled':''}>← Previous</button><span>${current+1} / ${chapters.length} · EXPLORE AT YOUR OWN PACE</span><button id="next" class="primary" ${current===chapters.length-1?'disabled':''}>Next chapter →</button></div>`;
  attachLab(c);
  document.querySelectorAll('[data-answer]').forEach(el=>el.addEventListener('click',()=>{answer=Number(el.dataset.answer);document.querySelectorAll('[data-answer]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)));const correct=answer===c.answer;$('#quiz-feedback').textContent=correct?'Yes. '+c.choices[c.answer]:'Not quite. '+c.choices[c.answer];if(correct&&!solved.includes(c.id)){solved.push(c.id);try{localStorage.setItem('sprites-checks',JSON.stringify(solved));}catch{}progress();}}));
  $('#previous').addEventListener('click',()=>{location.hash=chapters[current-1].id;});$('#next').addEventListener('click',()=>{location.hash=chapters[current+1].id;});
  document.body.classList.remove('menu-open');$('#menu').setAttribute('aria-expanded','false');
  if(moveFocus){$('#lesson').focus();window.scrollTo({top:0,behavior:'instant'});}
  if(!document.body.classList.contains('no-motion')){$('#lesson').classList.remove('enter');void $('#lesson').offsetWidth;$('#lesson').classList.add('enter');}
  progress();
}
function route(moveFocus){const index=chapters.findIndex(c=>c.id===location.hash.slice(1));current=index<0?0:index;render(moveFocus);}
window.addEventListener('hashchange',()=>route(true));route(false);
