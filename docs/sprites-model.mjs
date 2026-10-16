// Educational, deterministic state only. No transport, process or database calls.
export function initialState() {
  return {clock: 0, scope: 'sleeping', idleSince: 0, summary: false, leaseUntil: 0,
    seen: false, deliveries: 0, owner: 'Bridge', path: [], routes: [], rejectedEdges: [],
    destination: 'No message delivered', flow: 'The bridge is listening. Send a message to follow its route.',
    notice: 'This room’s bridge session is sleeping. The bridge still receives room messages.'};
}
// Session/lease indicators are persistent state, not the last delivery path.
export function nodeStates(state) {
  const leased = state.leaseUntil > state.clock;
  return {
    room: {active: state.path.includes('room'), label: 'Message source'},
    bridge: {active: true, label: 'Listening'},
    desktop: {active: leased, label: leased ? 'Attention held' : 'No attention lease'},
    resident: {active: state.scope !== 'sleeping', label: state.scope}
  };
}
function route(s, nodes) {
  s.routes.push(nodes);
  s.path = [...new Set(s.routes.flat())];
}
export function transition(previous, action, options = {}) {
  if (action === 'status') return {...previous, notice: 'Status checked. This request does not renew or release attention.'};
  const s = {...previous, path: [], routes: [], rejectedEdges: [], destination: 'No new delivery', flow: 'No message is moving.'};
  const leased = s.leaseUntil > s.clock;
  const lostAck = leased && options.lostAck;
  if (action === 'reset') return initialState();
  if (action === 'tick') {
    s.clock += options.seconds ?? 60;
    const expired = s.leaseUntil > previous.clock && s.leaseUntil <= s.clock;
    if (s.leaseUntil && s.leaseUntil <= s.clock) s.leaseUntil = 0;
    if (s.scope === 'awake' && s.clock - s.idleSince >= 180) {
      s.scope = 'sleeping'; s.summary = true;
      s.notice = 'Three quiet minutes: the bridge saved a summary and put this session to sleep.';
    } else s.notice = expired ? 'Attention expired. The next admitted message will go to the bridge session.' : s.scope === 'busy' ? 'Pi is still working. Advancing the clock does not put an active turn to sleep.' : 'Time advanced. Only acquisition or acknowledged inbox delivery renews attention.';
  } else if (action === 'acquire') {
    if (s.scope === 'busy') s.notice = 'Attention stays with the bridge: this room or thread has active work.';
    else if (leased && options.other) s.notice = 'Attention stays with its current desktop owner. Another session cannot take the live lease.';
    else if (options.checkpointFailed) s.notice = 'The bridge could not save the idle session. Recover the checkpoint before handing attention over.';
    else {
      if (s.scope === 'awake') s.summary = true;
      s.scope = 'sleeping'; s.leaseUntil = s.clock + 180;
      route(s, ['desktop', 'bridge']);
      s.destination = 'Bridge lease control';
      s.flow = 'Desktop Pi → Bridge · attention request, not a chat message';
      s.notice = 'Desktop Pi claimed attention for 180 seconds. Replies in this Matrix room can now reach that desktop session.';
    }
  } else if (action === 'release' || action === 'restart') {
    s.leaseUntil = 0;
    s.notice = action === 'restart' ? 'Bridge restarted and cleared the lease. The next admitted message goes to the bridge session with its saved summary and room history.' : 'Attention released. The next message follows the room’s normal bridge wake policy.';
  } else if (action === 'finish') {
    s.scope = 'awake'; s.idleSince = s.clock;
    s.notice = 'Turn finished. The bridge session is awake and idle; three quiet minutes can now checkpoint it.';
  } else if (action === 'message' || action === 'duplicate') {
    route(s, ['room', 'bridge']);
    if (leased && action === 'duplicate' && s.seen) {
      s.destination = 'Not delivered again';
      s.flow = 'Chat room → Bridge · repeated event ID stops here';
      s.notice = 'This event already reached the desktop inbox. The bridge suppresses the repeated delivery.';
    } else if (leased && options.ack !== false && !lostAck) {
      s.leaseUntil = s.clock + 180; s.seen = true; s.deliveries++;
      route(s, ['bridge', 'desktop']);
      s.destination = options.desktopBusy ? 'Desktop Pi · steering the current turn' : 'Desktop Pi · queued for a turn';
      s.flow = 'Chat room → Bridge → Desktop Pi';
      s.notice = options.desktopBusy ? 'Desktop Pi accepted this reply as steering for its current turn. Acknowledged delivery renewed attention for 180 seconds.' : 'The live desktop session enqueued the reply. Attention renewed for 180 seconds; Pi still needs to produce its answer.';
    } else {
      if (leased) {
        s.leaseUntil = 0;
        route(s, ['bridge', 'desktop']);
        if (lostAck) s.deliveries++;
        else s.rejectedEdges = [['bridge', 'desktop']];
      }
      const admitted = options.mention || options.any || s.scope !== 'sleeping';
      if (admitted) {
        const wasBusy = s.scope === 'busy';
        s.scope = 'busy'; s.deliveries++;
        route(s, ['bridge', 'resident']);
        s.destination = lostAck ? 'Desktop Pi + bridge Pi · possible duplicate' : `Bridge Pi · ${wasBusy ? 'steering the current turn' : 'starting a turn'}`;
        s.flow = leased ? 'Chat room → Bridge → Desktop inbox; Bridge → Bridge Pi (fallback)' : 'Chat room → Bridge → Bridge Pi';
        s.notice = wasBusy ? 'The bridge session is busy, so this message becomes steering for the existing turn.' : `The mention wakes this room’s bridge session with recent messages${s.summary ? ' and its saved summary' : ''}.`;
        if (lostAck) s.notice = 'The desktop enqueued the message, but its ACK was lost. The bridge also admitted it through fallback, so both sessions may process it.';
        else if (leased) s.notice = 'The desktop inbox did not accept the message. The bridge cleared the lease and delivered this mention to its own session.';
      } else {
        s.destination = 'Not delivered to Pi';
        s.flow = leased ? 'Chat room → Bridge → Desktop inbox (rejected); sleeping bridge session stays asleep' : 'Chat room → Bridge · waiting for a mention';
        s.notice = 'This sleeping room requires a mention. The message remains in the room, without starting a Pi turn.';
      }
    }
  }
  s.owner = s.leaseUntil > s.clock ? 'Desktop' : 'Bridge';
  return s;
}
// Independent Matrix rooms belonging to ONE agent; sessions A/B are not agents.
export function initialContention() {
  return {clock:0, rooms:[{owner:null,until:0},{owner:null,until:0}], posts:0, notice:'Two interactive Pi sessions; one agent’s Matrix bridge. Select a room and a session.'};
}
export function contend(previous, action, {room=0, session='A', seconds=60, handoffUnavailable=false}={}) {
  if(action==='reset')return initialContention();
  const s={...previous,rooms:previous.rooms.map(r=>({...r}))};
  if(action==='tick')s.clock+=seconds;
  for(const r of s.rooms)if(r.until<=s.clock){r.owner=null;r.until=0;}
  const r=s.rooms[room];
  if(action==='post'){
    if(handoffUnavailable&&!r.owner)s.notice='bridge_handoff_unavailable: active work, external jobs, or checkpoint health prevents a safe handoff. No post; no lease countdown.';
    else if(r.owner&&r.owner!==session)s.notice=`interactive_session_active: session ${r.owner} still owns this room (${r.until-s.clock} s now). Session ${session} does not post. Traffic can renew that countdown; it is not a promised retry time.`;
    else{r.owner=session;r.until=s.clock+180;s.posts++;s.notice=`Session ${session} acquired this room before posting. Replies return to its own Pi context; the other room is unchanged.`;}
  }else if(action==='reply'){
    if(r.owner){r.until=s.clock+180;s.notice=`Reply acknowledged by session ${r.owner}; only this room’s lease renews. Enqueued does not mean answered.`;}
    else s.notice='No interactive owner. This reply follows the bridge’s normal room wake policy; it does not transfer desktop context.';
  }else if(action==='close'){
    for(const item of s.rooms)if(item.owner===session){item.owner=null;item.until=0;}
    s.notice=`Session ${session} closed: all its room leases released. Another session’s leases remain.`;
  }else if(action==='release'){
    if(r.owner===session){r.owner=null;r.until=0;s.notice=`Session ${session} released this room. No other lease changed.`;}
    else s.notice='Only the owner can release this room’s lease.';
  }else if(action==='status')s.notice='Status only: no post, renewal, or ownership change.';
  else if(action==='tick')s.notice='Clock advanced; expired rooms return to normal bridge routing. A live lease cannot be stolen.';
  return s;
}
// Scripted synthetic multi-agent traffic. Each cell is a distinct conversation scope.
export const conversationSteps = [
  {states:['sleeping','sleeping','sleeping','sleeping'],route:'No traffic yet',note:'Three fictional agents, each with its own bridge, credentials, workspace, and per-conversation Pi sessions.'},
  {states:['working','sleeping','sleeping','sleeping'],route:'Agent A → Matrix Workshop → Agent B',note:'A explicitly mentions B in Workshop. B wakes only its Matrix Workshop scope.'},
  {states:['working','working','sleeping','sleeping'],route:'Agent C → Discord Workshop → Agent A',note:'A accepts a separate Discord conversation while B works in Matrix. Identical channel labels do not merge contexts or transports.'},
  {states:['working','working','working','sleeping'],route:'Agent B → Matrix Garden → Agent C',note:'B’s explicit handoff wakes C in Garden. It shares the posted request, not B’s private transcript. Cross-room sharing still needs permission.'},
  {states:['working','working','working','sleeping'],route:'Agent B · machine progress notice → Matrix Workshop',note:'Machine progress metadata is filtered. It does not wake Agent C’s sleeping Workshop scope or create a peer reply loop.'},
  {states:['steering queued','working','working','sleeping'],route:'Agent A → Matrix Workshop → busy Agent B',note:'Substantive follow-up joins B’s existing turn as steering. Delivery is not proof Pi has read it yet.'},
  {states:['compacting · input waits','working','working','sleeping'],route:'Matrix Workshop → B’s compaction gate',note:'B preserves incoming order while compacting. A and C keep working. B’s own cross-scope submissions can still wait at its agent-wide launch gate.'},
  {states:['working · queued input admitted','awake / idle','working','sleeping'],route:'B’s checkpoint gate opens → next input',note:'The gate opens without starting a duplicate Pi process. A has finished its separate Discord turn; C’s unrelated Workshop scope is still asleep.'},
  {states:['awake / idle','awake / idle','awake / idle','sleeping'],route:'Final replies → their original conversations',note:'Final replies return to their own scopes. In mention-only rooms, sleeping peers need an explicit address; the three-hop invitation cap prevents endless cooperative chains, not all possible loops.'}
];
export const progressSteps = [
  {cards:[{id:'first',title:'Request 1 · Checking the sample guide',live:true,tool:'Using read',lines:[]}],note:'The first direct request has one live progress card.'},
  {cards:[{id:'first',title:'Request 1 · Checking the sample guide',live:true,tool:'Using read',lines:['14:02 UTC · Compared the guide with its source.']}],note:'A bounded work-summary line arrives. Subsequent tool updates preserve it; this is not the private session checkpoint.'},
  {cards:[{id:'first',title:'Request 1 · Checking the sample guide',live:false,tool:'Using read',lines:['14:02 UTC · Compared the guide with its source.']},{id:'second',title:'Request 2 · Also check the examples',live:true,tool:'Using bash',lines:[]}],note:'The follow-up becomes the sole live target. The earlier card stays exactly as posted, including its historical tool status; no edit or deletion. The new card starts without copied history.'},
  {cards:[{id:'first',title:'Request 1 · Checking the sample guide',live:false,tool:'Using read',lines:['14:02 UTC · Compared the guide with its source.']},{id:'second',title:'Request 2 · Also check the examples',live:true,tool:'Using read',lines:['14:04 UTC · Verified the two example paths.']}],note:'New tool calls and new summary lines update only the latest card. The historical “Using read” is a snapshot, not current activity.'},
  {cards:[{id:'first',title:'Request 1 · Checking the sample guide',live:false,tool:'Using read',lines:['14:02 UTC · Compared the guide with its source.']},{id:'second',title:'Completed · 14:05 UTC',live:false,tool:'',lines:['14:04 UTC · Verified the two example paths.']}],note:'The final answer is posted before best-effort sealing of the remaining live card. Earlier history is untouched. Card appearance alone never proves final delivery.'}
];
export function initialReaction(){return {phase:'none',emoji:'',label:'Not yet admitted',delivered:false};}
export function reaction(previous, action) {
  if(action==='reset')return initialReaction();
  if(action==='accept')return {phase:'running',emoji:'⏳',label:'Handling the bridge-owned direct human request',delivered:false};
  if(previous.phase!=='running')return previous;
  if(action==='delivered')return {phase:'done',emoji:'🤖',label:'Complete final response confirmed posted',delivered:true};
  if(['fail','partial','cancel'].includes(action))return {phase:'failed',emoji:'⚠️',label:action==='partial'?'Partial response / delivery unconfirmed':action==='cancel'?'Request cancelled':'Turn or final delivery failed',delivered:false};
  if(action==='pass')return {phase:'clear',emoji:'',label:'Deliberate no-text pass · pending marker removed; no success/failure marker added',delivered:false};
  return previous; // A progress edit, summary, or inbox ACK cannot assert completion.
}
export function initialWorkbench(){return {question:'empty',job:'empty',jobOutput:'No job output yet.',draft:'empty',replacement:false,command:'hello',runs:0,output:'No simulated output yet.',mode:'!',followup:true,delivery:'No output sent to model context.',topic:'Untitled session',topicChanged:true,topicCalls:0,elapsed:300,notice:'Choose a question, draft, or label to explore. Everything here is simulated.'};}
export function workbench(previous,action,value){
  const s={...previous};
  if(action==='reset')return initialWorkbench();
  if(action==='queue'){s.question='queued';s.notice='Optional question queued. Work can continue without an answer.';}
  if(action==='answer'&&s.question==='queued'){s.question='answered';s.notice='Answer attached to this session branch; it can steer the current turn.';}
  if(action==='clear'){s.question='empty';s.notice='Question removed; this grants no new permission.';}
  if(action==='consent')s.notice='Required consent cannot be queued as optional. Ask directly before spending or destructive work.';
  if(action==='propose'){if(s.draft==='ready'){s.replacement=true;s.notice='An unsent draft exists. Confirm replacement or keep it; neither runs a command.';}else{s.draft='ready';s.notice='Draft ready for inspection. Only explicit submission produces simulated output.';}}
  if(action==='replace'&&s.replacement){s.command=s.command==='hello'?'goodbye':'hello';s.replacement=false;s.notice='Unsent draft replaced after confirmation. No command ran.';}
  if(action==='keep'){s.replacement=false;s.notice='Original draft kept. No command ran.';}
  if(action==='mode'&&(value==='!'||value==='!!'))s.mode=value;
  if(action==='followup')s.followup=Boolean(value);
  if(action==='submit'){
    if(s.draft!=='ready'||s.replacement)s.notice='Inspect a draft and resolve replacement before submitting.';
    else{s.runs++;s.draft='submitted';s.output=`${s.command} from a synthetic example`;
      s.delivery=s.mode==='!!'?'Output withheld from model context; no automatic follow-up.':s.followup?'Output enters model context; automatic follow-up is eligible.':'Output enters model context; automatic follow-up is paused.';
      s.notice='Submission simulated. This browser executed nothing; the output below is a fixed illustration.';}
  }
  if(action==='job-queue'&&['empty','completed','failed','cancelled'].includes(s.job)){s.job='queued';s.jobOutput='Waiting for a worker slot.';s.notice='Example job queued; no real process started.';}
  if(action==='job-start'&&s.job==='queued'){s.job='running';s.jobOutput='Checking sample notes…';s.notice='Simulated worker started. The session remains available.';}
  if(action==='job-complete'&&s.job==='running'){s.job='completed';s.jobOutput='Checked 3 sample notes. Exit 0 (simulated).';s.notice='Job completed. Inspect its output before treating the task as verified.';}
  if(action==='job-fail'&&s.job==='running'){s.job='failed';s.jobOutput='Sample input unavailable. Exit 1 (simulated).';s.notice='Job failed; output preserves the failure instead of reporting success.';}
  if(action==='job-cancel'&&['queued','running'].includes(s.job)){s.job='cancelled';s.jobOutput='Cancelled by user in this demonstration.';s.notice='Only this simulated job was cancelled.';}
  if(action==='context'){s.topicChanged=true;s.notice='New bounded example activity is available for a label.';}
  if(action==='time')s.elapsed+=300;
  if(action==='label'){
    if(!s.topicChanged)s.notice='No changed activity: no naming call needed.';
    else if(s.elapsed<300)s.notice='Refresh is limited to once per five minutes; no naming call yet.';
    else{s.topicCalls++;s.topic=s.topicCalls===1?'Workspace notes':'Workspace notes · follow-up';s.topicChanged=false;s.elapsed=0;s.notice='Label refreshed from the bounded redacted example only. No model call or credits used here.';}
  }
  return s;
}

export function fixEligibility(gates) {
  const required = ['reviewed', 'agent', 'skill', 'digest'];
  const missing = required.filter(key => !gates[key]);
  if (missing.length) return {allowed:false, label:`Suggestion withheld: ${missing.join(', ')} requirement missing.`};
  if (gates.probe) return {allowed:false, label:'No recommendation: this is an intentional failure probe, not a repair request.'};
  if (gates.ambiguous) return {allowed:false, label:'No recommendation: the command parse is ambiguous. Check its intent before choosing advice.'};
  if (gates.cooldown) return {allowed:false, label:'Notification paused by cooldown. The reviewed fix is still available through CLI lookup.'};
  return {allowed:true, label:'A reviewed suggestion can be shown. Check it against the task and permissions before acting.'};
}
