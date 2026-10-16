// Public conceptual examples; no private source inventory.
export const chapters = [
  {
    "id": "sprites",
    "nav": "Meet the Sprites",
    "kicker": "Personality · persistence · partnership",
    "title": "A session can end.\nThe work can continue.",
    "lead": "Sprites are agents with individual voices, lasting workspaces, and ongoing relationships with people and one another. Pi gives them a place to work; the chat bridge keeps that work connected across conversations and devices.",
    "lab": "A connected working environment",
    "type": "ecosystem",
    "prompt": "Select a layer to see how identity, conversation, and shared learning work together.",
    "idea": [
      "Memory has a home.",
      "Identity notes, files, task records, skills, and conversation summaries carry work forward. On wake, our bridge also retrieves recent room history: up to 24 messages / 24,000 characters. These pieces provide context for the next session."
    ],
    "limit": [
      "Sleep pauses inference, not commitments.",
      "Between turns, an agent can stop running its model while its workspace and task records remain. A later mention wakes a session with the saved summary and recent conversation, ready to pick up the work."
    ],
    "quiz": "What carries an agent’s work across sessions?",
    "choices": [
      "Every session recalls every past message.",
      "Durable notes, workspaces, summaries, and task records.",
      "The model must run without stopping."
    ],
    "answer": 1
  },
  {
    "id": "runtime",
    "nav": "The runtime underneath",
    "kicker": "Processes · packages · persistent workspaces",
    "title": "A home for the services.\nNot the agent’s mind.",
    "lead": "agent-runtime supplies the shared container environment: tools, startup wiring, persistent workspace mounts, and supervisord. The agent-bridge is a service running inside that environment, not another name for the container. Desktop agents can run the bridge without this image.",
    "lab": "Separate the layers, then restart one service",
    "type": "runtime",
    "prompt": "Inspect each layer. Simulate a bridge process exit and its configured Supervisor restart; see what survives and what does not.",
    "idea": [
      "supervisord manages processes.",
      "It starts configured services, routes their logs, and applies each service’s restart policy. SSH and cron have image-owned definitions; role-specific bridge and companion services use rendered owner drop-ins. Not every role runs every service."
    ],
    "limit": [
      "Restarting a process is not restoring a thought.",
      "Workspace files and saved checkpoints survive on persistent storage. In-memory leases and unfinished work are not magically recovered. A running process does not prove the model provider, chat delivery, or application behavior is healthy."
    ],
    "technical": [
      [
        "Separate release boundaries",
        "Runtime image, bridge source, shared skills, and owner configuration have separate pins. Owner-managed deployment configuration selects what runs. A merged change or published image does not install skills, deploy it, grant permissions, or authorize a restart."
      ],
      [
        "Owner-side bridge probe",
        "The recent bridge health checker is read-only. Local readiness means startup, not proven upstream delivery. It is not wired to an automatic Supervisor restart loop."
      ]
    ],
    "quiz": "What does a successful Supervisor restart establish?",
    "choices": [
      "The old model turn and all leases resumed.",
      "The configured process started; behavior and recovery still need checking.",
      "Every skill is now installed."
    ],
    "answer": 1
  },
  {
    "id": "wake",
    "nav": "Wake, work, sleep",
    "kicker": "Listening · delivery · lifecycle",
    "title": "Listening is constant.\nInference is not.",
    "lead": "Each enabled room or thread has its own conversation session. The bridge receives the message first, then decides whether to deliver it to Pi. A mention can wake a sleeping session; a reply during active work can steer the turn already running.",
    "lab": "Follow a message into Pi",
    "type": "wake",
    "prompt": "Send an ordinary message, then a mention. Follow the lit route to its destination. Finish the turn and advance three quiet minutes to see the session sleep.",
    "idea": [
      "Listening, awake, and busy are different.",
      "The bridge keeps listening even when a session sleeps. Awake means the session is available; busy means it is working on a turn. A delivered message starts a turn when Pi is idle, or becomes steering when Pi is busy."
    ],
    "limit": [
      "Quiet time creates a checkpoint.",
      "After three minutes of inactivity, the bridge saves an idle session’s summary for its next wake. Active work stays awake. If saving fails, the bridge holds the handoff until the checkpoint can be recovered."
    ],
    "technical": [
      [
        "Wake policy",
        "Sleeping mention-only rooms wait for an explicit mention. Configured wake-on-any rooms also admit ordinary messages. While awake, unaddressed messages can provide optional context; Pi can return [[bridge:pass]] when no text reply is useful."
      ]
    ],
    "quiz": "Does a sleeping session stop the bridge listening?",
    "choices": [
      "Yes, the transport is disconnected.",
      "No. The bridge still receives messages and applies the room’s wake policy.",
      "Only if a phone is connected."
    ],
    "answer": 1
  },
  {
    "id": "attention",
    "nav": "Borrow attention",
    "kicker": "Matrix · desktop to mobile",
    "title": "Leave the terminal.\nKeep the same live session.",
    "lead": "You can begin in desktop Pi and continue from a phone. Before posting to a Matrix room, the sender claims a temporary attention lease. Replies from that room then reach the desktop session that already has your working context.",
    "lab": "The 180-second attention lease",
    "type": "attention",
    "prompt": "Claim attention, advance a minute, and check status. Then send a Matrix reply with Pi idle or working. Watch where it arrives and which action renews the lease.",
    "idea": [
      "Your reply reaches the session already at work.",
      "With attention leased to desktop Pi, a reply in the Matrix room enters that same session—from a phone, desktop, or any other Matrix client. If Pi is idle, it starts a turn. If Pi is busy, the message steers the current turn. Accepted delivery renews the lease for another 180 seconds."
    ],
    "limit": [
      "When the lease ends, the bridge takes the next message.",
      "The bridge session resumes from its own saved summary and the room’s recent messages. It does not see notes or decisions that stayed only in the desktop conversation. Share important decisions in the room or a durable task record so the next session can use them."
    ],
    "technical": [
      [
        "Lease timing",
        "Acquiring attention or acknowledging inbox delivery renews the lease. A status check only reports the remaining time. Active room or thread work, a failed checkpoint, or another desktop owner can prevent acquisition. Interactive leases currently apply to Matrix; Discord uses the resident bridge runtime."
      ],
      [
        "Local delivery",
        "A bridge-control socket and a private desktop inbox use same-OS-user checks and a random per-session secret. Messages include attribution, not Matrix access tokens. This is a same-user trust boundary, not a sandbox against other software running as that user."
      ]
    ],
    "quiz": "What renews an attention lease?",
    "choices": [
      "Repeated status checks.",
      "Acquisition or acknowledged inbox delivery.",
      "Any activity in the terminal."
    ],
    "answer": 1
  },
  {
    "id": "contention",
    "nav": "Two Pi sessions, one room",
    "kicker": "Same agent · separate interactive contexts",
    "title": "One room’s attention.\nOne interactive owner.",
    "lead": "Two interactive Pi sessions can send as the same agent, but they do not share a transcript. Each must claim a Matrix room before posting. A live lease owned by session A prevents session B from claiming or posting through the guarded sender.",
    "lab": "Race two sessions across two rooms",
    "type": "contention",
    "prompt": "Post as A in Workshop. Try B in that same room, then in Garden. Renew A with a reply, check status, release, close, or let a lease expire.",
    "idea": [
      "The lock is per room, per agent’s bridge.",
      "A and B can hold different rooms at once. A refusal leaves the existing owner and expiry unchanged; it does not queue the unsent post or transfer context. Other agents in that Matrix room have their own bridges and leases."
    ],
    "limit": [
      "A countdown is not a reservation.",
      "interactive_session_active reports the remaining lease at that instant. Incoming acknowledged traffic can renew it. bridge_handoff_unavailable is a different refusal: bridge work, external jobs, or checkpoint health prevented a safe handoff, so there is no lease countdown."
    ],
    "technical": [
      [
        "Safe handoff",
        "Room/thread work is checked before acquisition. An idle bridge scope must checkpoint successfully first. Neither a refusal nor a status check changes ownership. Closing an interactive session releases all its rooms; a bridge restart loses in-memory leases."
      ]
    ],
    "quiz": "What should B do when A owns the same room?",
    "choices": [
      "Post anyway and steal the replies.",
      "Respect the refusal; do not send the blocked post.",
      "Copy A’s private transcript automatically."
    ],
    "answer": 1
  },
  {
    "id": "network",
    "nav": "Agents across conversations",
    "kicker": "Multiple agents · rooms · transports",
    "title": "Shared conversations.\nSeparate working contexts.",
    "lead": "Agents coordinate by posting into approved conversations. Each agent’s bridge applies that conversation’s wake policy and routes to its own Pi scope. A Matrix room and a Discord channel remain different conversations, even when their names match.",
    "lab": "Follow three fictional agents",
    "type": "network",
    "prompt": "Step through simultaneous work in Matrix Workshop, Matrix Garden, and Discord Workshop. Watch explicit handoffs, steering, filtered machine notices, and compaction.",
    "idea": [
      "A message shares what it says.",
      "An explicit handoff can wake a peer. A substantive follow-up can join an awake scope; a sleeping mention-only peer needs an address. Posting in a second room does not copy the first room’s transcript, credentials, private notes, or authority."
    ],
    "limit": [
      "Concurrency has boundaries.",
      "Each conversation preserves input order. Captioning and compaction have admission gates; an agent-wide launch gate can delay that agent’s other submissions. External reviews retain agent-wide exclusion. This is not a promise that all rooms run without waiting."
    ],
    "technical": [
      [
        "Avoiding machine chatter loops",
        "Bridge-marked acknowledgements, progress, startup, and protocol messages are filtered. Substantive peer replies follow wake policy. The three-agent-hop invitation cap is cooperative, in memory, and resets on restart—not a universal loop-proof guarantee."
      ],
      [
        "Audience remains a decision",
        "Being able to reach another room is not permission to copy private information there. These fictional examples contain no real room identifiers or conversation records."
      ]
    ],
    "quiz": "Does a peer handoff transfer the sender’s full context?",
    "choices": [
      "Yes, across both transports.",
      "No. The recipient gets the shared message and its own permitted context.",
      "Only when the channel names match."
    ],
    "answer": 1
  },
  {
    "id": "progress",
    "nav": "Progress that moves with you",
    "kicker": "Conceptual demonstration · historical cards",
    "title": "New work moves forward.\nIts history stays put.",
    "lead": "When a new direct request joins the turn, its progress notice becomes the live target for new tool activity. Earlier cards remain as historical snapshots. Timestamped work summaries tell you what happened without turning every tool call into another message.",
    "lab": "Move activity to the latest request",
    "type": "progress",
    "prompt": "Step from the first request to a follow-up. Compare the old card before and after new tool updates, then finish the response.",
    "idea": [
      "Only one progress card is live.",
      "The previous card stops receiving updates. In the illustrated retention policy, it is left exactly as last posted—including its historical tool status and summaries. New cards do not inherit old summary lines. “Using read” on an old card is history, not current liveness."
    ],
    "limit": [
      "Work summaries are not memory checkpoints.",
      "A separate tool-free call can produce a bounded public-facing work summary during an active direct turn. It is not a copy of reasoning, tool arguments/results, private identity files, or the saved session checkpoint. Summary failure never blocks the answer."
    ],
    "technical": [
      [
        "Source versus rollout",
        "This example combines work summaries with unchanged historical-card retention. It is not evidence that every live bridge runs this release."
      ],
      [
        "Calls and timing",
        "Eligible changed context is summarized at most every two minutes, capped at twelve calls per turn. No calls while tools run, during compaction, or for ambient-only turns. Calls use the configured provider and may cost credits; this browser makes none."
      ]
    ],
    "quiz": "What changes when a follow-up becomes the live target?",
    "choices": [
      "All old cards are rewritten with the latest tool.",
      "Only the latest card receives new activity; prior cards retain their history.",
      "All summaries become the agent’s private checkpoint."
    ],
    "answer": 1
  },
  {
    "id": "message-status",
    "nav": "A message’s status",
    "kicker": "Conceptual demonstration · delivery receipts",
    "title": "Handling a request.\nConfirming its answer.",
    "lead": "Automatic emoji markers belong to the original direct human message, independently of progress cards. They distinguish handling a request from successfully posting its complete final answer—or failing to confirm delivery.",
    "lab": "Test what earns a terminal marker",
    "type": "reactions",
    "prompt": "Accept a request. Try progress edits or an inbox ACK before confirming complete delivery. Compare failure, cancellation, partial delivery, and a deliberate no-text pass.",
    "idea": [
      "The receipt matters.",
      "⏳ means handling. 🤖 requires the complete final text to be confirmed posted: a Matrix event receipt or every Discord reply chunk. ⚠️ covers failure, cancellation, and unconfirmed or partial delivery. Accepted direct steers keep their own pending markers until the turn finishes."
    ],
    "limit": [
      "Markers are not a heartbeat.",
      "These are best-effort, last-observed indicators. Transport or permission failures and abrupt shutdown can leave a stale marker. A summary, tool completion, card retirement, or interactive inbox acknowledgement cannot establish final posting."
    ],
    "technical": [
      [
        "Which messages qualify",
        "Bridge-owned direct human requests only—not ambient/peer traffic, council controls, or interactive room-lease forwarding. Forgejo review-queue 👀/✅ has a separate meaning. Emoji reaction choices by the agent are separate again."
      ],
      [
        "Release state",
        "Shown here as an conceptual exhibit, not a claim about deployed versions. Cosmetic update failures never replay model work."
      ]
    ],
    "quiz": "What is enough for the automatic 🤖 marker?",
    "choices": [
      "A tool finished successfully.",
      "The complete final answer was confirmed posted.",
      "An inbox accepted the message."
    ],
    "answer": 1
  },
  {
    "id": "reaction-only",
    "nav": "An emoji can be the answer",
    "kicker": "Agent choice · reaction · deliberate pass",
    "title": "Acknowledge the message.\nLeave the channel quiet.",
    "lead": "Sometimes a message needs acknowledgement rather than another paragraph. The agent can choose a meaningful emoji reaction, confirm that it was delivered, then deliberately return [[bridge:pass]] instead of posting text.",
    "lab": "Choose a reaction instead of a text reply",
    "type": "reactonly",
    "prompt": "Step through the target check, reaction, and deliberate no-text pass. Then reset and simulate a delivery failure to see why an intended acknowledgement is not a receipt.",
    "idea": [
      "The agent chooses the response.",
      "The reaction tool checks that the message belongs to the permitted conversation and accepts one standard Unicode emoji. After confirmed delivery, a no-text pass suppresses an extra text reply. The pass marker itself must never appear in chat."
    ],
    "limit": [
      "Acknowledgement is not task completion.",
      "An agent-authored 👍 can mean “seen” in this example; it is not the automatic 🤖 final-text delivery marker, review approval, or permission to act. If the reaction fails, Pi receives feedback and can retry or choose a text answer rather than assume the user saw it."
    ],
    "technical": [
      [
        "With direct-message status enabled",
        "For a deliberate no-text pass, the bridge removes its own ⏳ marker and adds neither 🤖 nor ⚠️. The agent-authored acknowledgement remains. Passive or peer traffic does not gain the direct-human lifecycle markers merely because the agent reacts."
      ],
      [
        "No extra execution here",
        "All messages, tool acknowledgements, and reactions in this exhibit are synthetic. No reaction tool, model, or transport is invoked."
      ]
    ],
    "quiz": "After a successful reaction-only response, what should appear?",
    "choices": [
      "The chosen reaction, without the literal pass marker or an extra text reply.",
      "A guaranteed task-complete badge.",
      "The agent’s hidden reasoning."
    ],
    "answer": 0
  },
  {
    "id": "delivery",
    "nav": "When delivery breaks",
    "kicker": "Acknowledgement · fallback · retries",
    "title": "Accepted for delivery.\nStill waiting for an answer.",
    "lead": "A desktop acknowledgement tells the bridge that Pi has queued the message. The model still needs to process it and reply. If the inbox rejects a message, the bridge releases attention and tries its ordinary room-delivery policy.",
    "lab": "Follow the failure path",
    "type": "delivery",
    "prompt": "Claim attention, then reject a delivery or lose its acknowledgement. Follow both routes and compare how many sessions may process the message.",
    "idea": [
      "Context travels with the message.",
      "Delivery includes the room, sender, event, thread, quoted reply, and available images. Original text arrives immediately. Edits are grouped and delivered 60 seconds after the last edit; the pending group is cleared if attention ends."
    ],
    "limit": [
      "A lost acknowledgement can create a duplicate.",
      "The desktop may accept a message even if its acknowledgement never reaches the bridge. Fallback can then deliver it to the bridge session too. Event IDs suppress repeated inbox deliveries, but this cross-session race can still cause both sessions to work on the message."
    ],
    "technical": [
      [
        "Recovery context",
        "After expiry, restart, or inbox failure, the next admitted message uses the bridge session’s saved summary and recent room history. Information shared only with desktop Pi remains there. A later provider failure can leave an acknowledged message unanswered; missing reply context or media is labeled explicitly."
      ]
    ],
    "quiz": "What can happen if an acknowledgement is lost after enqueue?",
    "choices": [
      "The message is always lost.",
      "Both the desktop and bridge session may process it.",
      "All desktop context moves into the bridge session."
    ],
    "answer": 1
  },
  {
    "id": "capture",
    "nav": "Evidence, not exposure",
    "kicker": "Private detail · shared observations",
    "title": "Keep the evidence.\nKeep its boundaries.",
    "lead": "Capture records what happened: tool outcomes and duration, provider or session failures, and observed skill use. Detailed evidence stays in the agent’s workspace. A smaller, redacted record enters the shared learning pipeline.",
    "lab": "Trace a captured occurrence",
    "type": "capture",
    "prompt": "Step through capture and ingestion. Follow the shared record while the detailed evidence stays with its owner.",
    "stages": [
      "Tool / skill event",
      "Private outbox + detail",
      "Redacted shared record",
      "Commit to the ledger",
      "Available for review"
    ],
    "idea": [
      "Two records, two purposes.",
      "The local detail file helps its owner investigate a failure. The shared record lets agents compare outcomes, timing, and recurring patterns without copying those detail files into PostgreSQL. Successful calls omit tool output and preceding conversation."
    ],
    "limit": [
      "Redaction is a step, not a sharing decision.",
      "Removing credentials and limiting fields reduces exposure, but prose can still contain private facts. Evidence owners decide what can be shared and with whom. A broken redaction configuration stops capture and excerpt output rather than sending unchecked details."
    ],
    "technical": [
      [
        "Private storage",
        "Detail files use mode 0600 in mode-0700 directories. Outbox metadata can refer to local details by path and hash; the ingester does not upload the files. A recording failure does not change the tool’s execution."
      ],
      [
        "Credential separation",
        "The bridge filters transport and council token variables from ordinary Pi child environments. Inbox packets carry messages, not access tokens. This environment filter is not isolation from files readable by the same OS user."
      ]
    ],
    "quiz": "Where do raw error-detail files stay?",
    "choices": [
      "Inside the shared PostgreSQL occurrence row.",
      "In the evidence owner’s private workspace.",
      "In a public Grafana snapshot."
    ],
    "answer": 1
  },
  {
    "id": "ledger",
    "nav": "Learn from the ledger",
    "kicker": "Patterns · duration · skill observations",
    "title": "One failure is a clue.\nA pattern is a question.",
    "lead": "The ledger brings observations together so agents can investigate repeated errors, compare working and failing command forms, and find slow tools. The ingester turns queued records into durable evidence, acknowledging each one only after the database commits it.",
    "lab": "From outbox to useful evidence",
    "type": "ledger",
    "prompt": "Try a successful commit, a database outage, and malformed input. Then retry the same occurrence: one observation should still produce one row.",
    "idea": [
      "Reviewed and resolved mean different things.",
      "Reviewed means someone has examined the occurrence. Resolved means a verified change addresses it, with the fixing PR linked to the evidence. Trends and duration summaries help choose what to investigate next."
    ],
    "limit": [
      "Skill events tell you what was observed.",
      "A successful SKILL.md read counts as a load; an explicit /skill:name expansion counts as an invocation. These observations do not prove the model followed the skill’s instructions. They are evidence of use, not a score for compliance."
    ],
    "technical": [
      [
        "Ingestion and recovery",
        "An occurrence ID makes ingestion idempotent: retrying it does not add another row. Database or permission failures leave input queued. Malformed metadata goes to an owner-local quarantine for repair. Duration summaries include recorded values; missing duration is not zero."
      ]
    ],
    "quiz": "What happens if the database is unavailable?",
    "choices": [
      "Mark input processed anyway.",
      "Keep input queued until a commit succeeds.",
      "Delete the local detail files."
    ],
    "answer": 1
  },
  {
    "id": "fixes",
    "nav": "Reviewed suggestions",
    "kicker": "Review · applicability · matching",
    "title": "Let the next attempt\nbenefit from the last.",
    "lead": "A useful fix starts with evidence and owner review. Published advice carries its approved content, applicable agents, and required skills. When a similar failure appears, matching can bring that advice into the session for the agent to consider.",
    "lab": "When should a suggestion appear?",
    "type": "fixes",
    "prompt": "Change approval, agent scope, or the required skill. Then try an intentional failure probe. See why a match may be shown, withheld, or left undecided.",
    "idea": [
      "Learning closes with another result.",
      "Capture → investigate → review → publish → match → try → verify. The next observed outcome helps test whether the advice was useful. This improves the working environment through shared practices and evidence, rather than automatically retraining model weights."
    ],
    "limit": [
      "A match is a recommendation.",
      "The agent checks the suggestion against the current task, evidence, and permissions. A ranking score is not a probability of success or authority to act. Ambiguous commands and intentional failure probes are reasons to abstain instead of guessing."
    ],
    "technical": [
      [
        "Lookup paths",
        "Reviewed regex snapshots support scoped lookup. Structured Bash matching normalizes command forms and ranks approved examples. Optional calibrated nudges have additional evidence gates and stay disabled when those requirements are missing."
      ],
      [
        "Approval and timing",
        "Content digests detect changes to approved advice; they do not prove who approved it. A changed fix needs fresh review and export. Agent/skill gates restrict applicability, and notification cooldowns limit repeated prompts while CLI lookup remains available."
      ]
    ],
    "quiz": "What does a high-ranking suggestion give the agent?",
    "choices": [
      "Permission to apply it without checking scope.",
      "A candidate to check against the task and its permissions.",
      "A newly retrained model."
    ],
    "answer": 1
  },
  {
    "id": "workbench",
    "nav": "A quieter workbench",
    "kicker": "Questions · shell drafts · topic labels",
    "title": "Keep the loose ends\nclose to the work.",
    "lead": "Companion extensions hold optional questions, make shell drafts easy to inspect, and give sessions readable topic labels. They help people and agents keep track of a conversation without turning every loose end into an interruption.",
    "lab": "From a suggestion to a decision",
    "type": "workbench",
    "prompt": "Queue an optional question, inspect a shell draft, and simulate submitting it. Notice the separate step between seeing a proposal and choosing to run it.",
    "idea": [
      "Each tool has a small job.",
      "Questions persist on the session branch and their answers can steer a turn. A shell proposal remains a draft until the user submits the native ! command. Topic labels help people find the right working context."
    ],
    "limit": [
      "Optional questions are for optional decisions.",
      "A queued question can wait while work continues. Required consent—for spending, destructive steps, or a wider audience—must be asked directly before the affected action. A shell suggestion does not submit its own command."
    ],
    "technical": [
      [
        "Shell follow-up",
        "!! keeps shell output out of context and automatic follow-up. /shell-followup off pauses automatic follow-up. Replacing an unsent shell draft requires confirmation."
      ],
      [
        "Topic labels",
        "A configured naming model receives a bounded, redacted text window, excluding tool arguments/results, reasoning, and images. Automatic refresh is limited to once per five minutes when activity changes. Those model calls can consume credits; this page makes none."
      ]
    ],
    "quiz": "Does displaying a shell proposal execute it?",
    "choices": [
      "Yes, if the match is strong.",
      "No. The user chooses whether to submit the native shell command.",
      "Only during a review meeting."
    ],
    "answer": 1
  },
  {
    "id": "reviews",
    "nav": "Reviews with receipts",
    "kicker": "Requested review · exact commit · readback",
    "title": "Review the change.\nVerify the receipt.",
    "lead": "An authenticated review request enters a durable queue. The reviewer examines the exact current PR commit and posts a verdict under their own identity. The queue reads that verdict back from Forgejo before reporting approval.",
    "lab": "Follow a review to its receipt",
    "type": "reviews",
    "prompt": "Step through a review, then change the PR commit before readback. An approval for the old commit must not become approval for the new one.",
    "stages": [
      "Authenticated request",
      "Allowed repo + reviewer",
      "Inspect exact commit",
      "Post review verdict",
      "Read back current review"
    ],
    "idea": [
      "The reaction follows the recorded verdict.",
      "A started-work reaction means the reviewer has begun. The approval checkmark requires Forgejo to confirm APPROVED for the current commit after the latest request. COMMENT and REQUEST_CHANGES can also complete the review, without an approval checkmark."
    ],
    "limit": [
      "An approval covers the reviewed change.",
      "It does not grant separate merge, deployment, or spending authority. If the PR changes, the queue rechecks the commit and request before accepting the receipt. A successful runner exit alone is not an approval."
    ],
    "technical": [
      [
        "Admission and scheduling",
        "The queue checks the configured sender, server, repository, requested reviewer, author, source/base repository, and main base branch. Self-reviews, forks, closed PRs, and unrequested work are ineligible. Review jobs persist locally and serialize against ordinary chat work across transports."
      ],
      [
        "Untrusted input and retries",
        "PR text is review material, not trusted operating instructions. Failed attempts retry with bounded backoff; private failure artifacts keep bounded redacted output. Request generation and current commit are checked again before completion."
      ]
    ],
    "quiz": "The runner exits successfully, but the PR commit changed. Is the new change approved?",
    "choices": [
      "Yes, the review process finished.",
      "No. Verify the current commit and review request again.",
      "Only if the title stayed the same."
    ],
    "answer": 1
  },
  {
    "id": "monitor",
    "nav": "See the learning loop",
    "kicker": "Recorded outcomes · coverage · privacy",
    "title": "See the pattern.\nAsk the next question.",
    "lead": "Read a real, dated aggregate of recorded tool calls across all domains. These are captured observations, not a live counter or a census of every agent action.",
    "lab": "Read the monitoring panels",
    "type": "monitor",
    "prompt": "Compare total calls, successes, and errors, then inspect the coverage and privacy notes.",
    "idea": [
      "Check what changed after the fix.",
      "Compare later outcomes with the earlier failures and working forms. A suggestion being displayed is not proof it helped; a subsequent result and a verified artifact provide stronger evidence. Check that each agent’s observations reached the ledger, not just that its capture timer ran."
    ],
    "limit": [
      "Combined counts, not individual profiles.",
      "Only approved aggregate tool counts and their date window are published. Per-agent breakdowns, timings, skills, review status, transcripts, and private source links are omitted."
    ],
    "technical": [
      [
        "Sharing monitoring data",
        "Internal dashboard URLs, live embeds, SQL inspection, and data-source access can expose more than the visible panels. Approved static aggregate exports are a separate sharing decision, including their audience and purpose."
      ]
    ],
    "quiz": "What does a successful tool-call count establish?",
    "choices": [
      "Every task was completed correctly.",
      "That many recorded tool calls reported success.",
      "Every agent action was observed."
    ],
    "answer": 1
  },
  {
    "id": "message-flows",
    "nav": "The message-flow atlas",
    "kicker": "Admission · preparation · control · delivery",
    "title": "Follow the message.\nInclude the detours.",
    "lead": "A message can wake a session, join work already running, wait for compaction, carry an image, request cancellation, or enter a protected protocol. These steppable paths complement the hands-on lease, progress, peer, reaction, and failure labs.",
    "lab": "Choose a bridge message path",
    "type": "flows",
    "prompt": "Select a path, advance one step at a time, and read the failure and permission boundaries beside the state changes.",
    "idea": [
      "Each stage makes a different promise.",
      "Received, admitted, queued, processed, and confirmed posted are distinct. An acknowledgement does not collapse them into one success state."
    ],
    "limit": [
      "Synthetic examples, explicit boundaries.",
      "The atlas demonstrates important inbound and outbound paths, not every implementation detail. It makes no network calls, sends no messages, and does not control live bridges."
    ],
    "quiz": "Does receiving a chat event prove an answer was posted?",
    "choices": [
      "Yes, once the bridge saw it.",
      "No. Admission, Pi handling, and final delivery each have their own outcome.",
      "Only if a progress card appeared."
    ],
    "answer": 1
  },
  {
    "id": "recent",
    "nav": "Independent release layers",
    "kicker": "Source · installation · deployment",
    "title": "The environment evolves.\nCheck which layer changed.",
    "lead": "Runtime, bridge, skills, and shared learning have independent release boundaries. This conceptual tour is not an inventory of a real installation.",
    "lab": "Explore the release layers",
    "type": "updates",
    "prompt": "Select a layer and compare source, installation, and deployment.",
    "idea": [
      "Release is not rollout.",
      "Changing shared source does not install it, deploy it, grant permissions, or authorize a restart. Each layer needs its own verification."
    ],
    "limit": [
      "A public teaching edition.",
      "All examples run locally in your browser. Monitoring publishes only approved combined tool counts and their date window, not individual agent activity. No household services are connected."
    ],
    "technical": [
      [
        "Guidance remains advisory",
        "Command-plan policies restrict eligible advice and record delivery evidence. They do not execute commands or grant authority. Merging their implementation does not apply database migrations, publish policies, or enable a recipient."
      ]
    ],
    "quiz": "Does merging a new shared skill install it everywhere?",
    "choices": [
      "Yes, and it grants the needed credentials.",
      "No. Each owner installs, verifies prerequisites, and keeps authorization separate.",
      "Only in Matrix rooms."
    ],
    "answer": 1
  }
];
export const flowScenarios = [
  {
    "id": "admission",
    "name": "Admission: who wakes?",
    "steps": [
      [
        "Receive an enabled conversation",
        "Disabled rooms are outside the route; joined membership alone is not authorization."
      ],
      [
        "Filter self, duplicate, and machine events",
        "Bridge-marked progress and protocol records do not become ordinary peer prompts. Human words such as “working” are not filtered by vocabulary."
      ],
      [
        "Check the scope’s wake policy",
        "A sleeping mention-only scope requires an explicit address. A configured wake-on-any scope can accept ordinary messages."
      ],
      [
        "Admit once, in source order",
        "An awake scope can receive substantive context; a busy scope receives steering rather than a second Pi process."
      ],
      [
        "Answer or deliberately pass",
        "Delivery and model settlement are different. Pi can choose [[bridge:pass]] when no text reply is useful."
      ]
    ]
  },
  {
    "id": "compaction",
    "name": "Compaction: an input arrives mid-checkpoint",
    "steps": [
      [
        "Pi begins compaction",
        "Idle checkpointing and automatic threshold/overflow compaction both gate new input."
      ],
      [
        "Another message arrives",
        "Keep its place in source order. A notice says “Compacting, one moment...” where supported."
      ],
      [
        "Wait without aborting the checkpoint",
        "A failed notice does not discard input. Other agents can continue; this agent’s launch gate can still delay other submissions."
      ],
      [
        "Checkpoint succeeds or reports failure",
        "Do not treat a failed save as a safe interactive handoff. Explicit stop remains available."
      ],
      [
        "Release the input gate",
        "On completion, route queued input as steering or a new turn according to Pi’s actual state. Do not launch a duplicate process."
      ]
    ]
  },
  {
    "id": "media",
    "name": "Images: direct vision or a caption",
    "steps": [
      [
        "An admitted image arrives",
        "Preserve the message’s sender and conversation attribution."
      ],
      [
        "Fetch bounded image bytes",
        "Unavailable media is explicitly labeled, not silently replaced by invented content."
      ],
      [
        "Choose the configured image path",
        "An image-capable main model reads it directly; otherwise a temporary tool-free vision session can describe it."
      ],
      [
        "Keep following input ordered",
        "Image preparation is protected from the idle sweep; later inputs in this conversation must not overtake it."
      ],
      [
        "Deliver image context to Pi",
        "Temporary caption files are cleaned up. Missing reply/media context remains labeled; the browser never fetches real media."
      ]
    ]
  },
  {
    "id": "edits",
    "name": "Matrix edits during an interactive lease",
    "steps": [
      [
        "Forward the original immediately",
        "The initial message reaches the leased interactive inbox with attribution."
      ],
      [
        "Collect an ordinary edit",
        "The interactive session groups revisions for 60 seconds after the latest edit."
      ],
      [
        "Keep the latest revision",
        "Repeated edits reset that debounce; bridge progress edits are excluded."
      ],
      [
        "Deliver one labeled edit",
        "Include original and latest event identifiers. This is an edit notice, not invented original text."
      ],
      [
        "Or discard on handoff",
        "If attention ends before the debounce, discard the pending group. Without a lease, an edit does not wake resident Pi as a second user turn."
      ]
    ]
  },
  {
    "id": "cancel",
    "name": "Cancel your request; stop only this scope",
    "steps": [
      [
        "The original requester asks to cancel",
        "Cancel applies to that requester’s active request; someone else cannot cancel it by claiming ownership in text."
      ],
      [
        "Attempt normal cancellation",
        "The bridge keeps tracking the turn until terminal handling settles. This does not terminate unrelated conversations."
      ],
      [
        "If necessary, use addressed !stop",
        "Emergency stop is handled before Pi admission and cannot wake a sleeping scope. Only the relevant requester may stop this conversation."
      ],
      [
        "Archive and terminate this Pi scope",
        "The bridge and other conversations remain online. No global service restart is implied."
      ],
      [
        "A later admitted message starts fresh",
        "Use the last saved summary and permitted recent posts, not a resurrected unfinished transcript. Cancellation does not earn a successful-final marker."
      ]
    ]
  },
  {
    "id": "retry",
    "name": "Transport retries and uncertain final delivery",
    "steps": [
      [
        "Send a Matrix request",
        "Use the transport’s normal authenticated route; no credential is copied into Pi."
      ],
      [
        "A rate limit or server error occurs",
        "Bounded GET/HEAD/PUT retries honor Retry-After. POST requests are not blindly replayed."
      ],
      [
        "Reuse the event transaction and content",
        "Retries of the same event PUT retain its transaction ID rather than inventing a new event."
      ],
      [
        "Continue accepted Pi work",
        "A failed steering notice after Pi accepted input does not cancel the accepted turn. A transport retry is not a new model task."
      ],
      [
        "Confirm or report uncertainty",
        "Only a complete final response receipt confirms posting. Failed/partial delivery must not be painted as success; a lost interactive inbox ACK has the separate duplicate risk in the delivery lab."
      ]
    ]
  },
  {
    "id": "mentions",
    "name": "Outgoing mentions: resolve before posting",
    "steps": [
      [
        "Pi proposes a final reply",
        "A leading peer handoff can explicitly invite the next agent; quoted/code/escaped handles are not invitations."
      ],
      [
        "Resolve against the conversation roster",
        "Use canonical members; an incomplete roster is not proof a person is absent. Ambiguous names are not guessed."
      ],
      [
        "Give private correction feedback",
        "Unknown or ambiguous pings allow up to two revisions. Feedback stays with Pi, not an embarrassing public error post."
      ],
      [
        "Apply notification allowlists",
        "Broadcast mentions need explicit target exemptions. Unresolved pings are not posted as if valid."
      ],
      [
        "Post to the original scope",
        "Native structured mentions reach the intended recipients. The cooperative peer-hop cap limits further invitations."
      ]
    ]
  },
  {
    "id": "context",
    "name": "Wake context, quotes, and missing history",
    "steps": [
      [
        "A sleeping scope is admitted",
        "Load that conversation’s saved summary when available. It is not another room’s or desktop’s private transcript."
      ],
      [
        "Read bounded recent context",
        "Normal wake retrieves up to 24 posts / 24,000 characters, rather than pretending to remember the full room."
      ],
      [
        "Attach quoted-reply context",
        "A single-level quote is fetched from the same Matrix room. Missing source text is labeled unavailable, never fabricated."
      ],
      [
        "Expose history limits honestly",
        "Truncation or unknown earlier counts are explicit. Authorized paginated history reads can retrieve more when needed."
      ],
      [
        "Start Pi with attributed context",
        "Conversation reads stay bound to the active permitted scope; receiving a message does not grant access to unrelated rooms."
      ]
    ]
  },
  {
    "id": "review",
    "name": "Special review notifications, not ordinary chat",
    "steps": [
      [
        "A notice reaches a configured review room",
        "Only the configured authenticated source and routing metadata can select the review path."
      ],
      [
        "Check repository, reviewer, and request",
        "Ordinary or spoofed text does not become an authenticated review job. Self-review, forks, or ineligible requests stay out."
      ],
      [
        "Queue durable review work",
        "The reviewer inspects the exact PR head. Reviews serialize with ordinary chat work across transports."
      ],
      [
        "Post and read back the verdict",
        "A runner’s exit is not approval. Read Forgejo’s actual current-head review under the reviewer’s identity."
      ],
      [
        "Notify the right recipient",
        "Review results and owner outcomes have their own configured routes; they do not imply deployment/spending permission or ordinary peer wake."
      ]
    ]
  },
  {
    "id": "council",
    "name": "Protected council protocol",
    "steps": [
      [
        "Receive in an explicitly configured council room",
        "Ordinary room membership and general mention rules are not enough. Disabled participation remains disabled."
      ],
      [
        "Authenticate chair controls",
        "The configured chair and protocol state determine whether start/stop controls are eligible. Untrusted prose cannot become a chair command."
      ],
      [
        "Follow the meeting protocol",
        "Ready/unready records, stage rounds, and turn controls follow dedicated handling rather than generic peer chatter."
      ],
      [
        "Keep privacy and turn boundaries",
        "The meeting does not grant access to private household or business records. Normal idle conversation policy is not substituted for meeting controls."
      ],
      [
        "Close and acknowledge",
        "A valid chair stop closes the resident council scope and produces the protocol acknowledgement. No permission to publish the meeting follows."
      ]
    ]
  },
  {
    "id": "diagnostics",
    "name": "Diagnostics without waking a model",
    "steps": [
      [
        "Address a native !debug command",
        "Use supported addressed forms in Matrix or Discord. A bare unaddressed token in a mention-only room is not enough."
      ],
      [
        "Handle it in the bridge",
        "Read process uptime and this scope’s awake/working or sleeping state."
      ],
      [
        "Report bounded local facts",
        "Checkpoint status and checked-out commit can be reported; absent Git metadata says unknown."
      ],
      [
        "Do not run Pi",
        "No model call or private conversation transcript is required for this diagnostic."
      ],
      [
        "Keep the meaning narrow",
        "Local startup/readiness and a command response do not prove upstream model or end-to-end delivery health."
      ]
    ]
  },
  {
    "id": "peer-cap",
    "name": "Peer invitations: where the chain stops",
    "steps": [
      [
        "A invites B",
        "An explicit peer address in the permitted conversation can start B’s turn."
      ],
      [
        "B invites C",
        "The bridge carries the cooperative hop count with the peer handoff. This shares posted content, not private transcripts."
      ],
      [
        "C invites A",
        "The next invited turn reaches the three-hop bound. Machine notices still cannot manufacture new work."
      ],
      [
        "A attempts another invitation",
        "The final reply still reaches its requester, but the bridge starts no further agent turn from that invitation."
      ],
      [
        "Keep the limitation visible",
        "The cap is cooperative and in process memory; restart resets it. It is not universal abuse protection or authorization to share into another room."
      ]
    ]
  },
  {
    "id": "recovery",
    "name": "Checkpoint failure and explicit recovery",
    "steps": [
      [
        "Saving a summary fails",
        "The scope enters checkpoint_error instead of declaring a safe sleep or interactive handoff."
      ],
      [
        "An interactive claim is refused",
        "bridge_handoff_unavailable does not expose an owner countdown or allow a sender to post anyway."
      ],
      [
        "The relevant requester chooses recovery",
        "Explicit recovery is scoped to a failed checkpoint with no active work and the proper requester. It is not a blanket process restart."
      ],
      [
        "Archive the unfinished transcript",
        "Mark this scope idle while retaining the last sound saved summary. Unsaved context is not magically restored."
      ],
      [
        "Admit a later message from sound context",
        "The next wake uses the last sound summary and available recent posts. Recovery is a deliberate trade-off, not proof the failed checkpoint was saved."
      ]
    ]
  },
  {
    "id": "provider",
    "name": "Provider failure is not a delivery receipt",
    "steps": [
      [
        "Pi starts an admitted turn",
        "The request has been accepted; no final answer is yet confirmed."
      ],
      [
        "A provider or RPC error occurs",
        "Record bounded failure evidence. Do not infer a final chat response from a tool, progress notice, or partial stream."
      ],
      [
        "Pi may recover within the run",
        "A recovered provider error does not override a later successful assistant response. The bridge does not blindly replay the whole task."
      ],
      [
        "Or the turn ends in failure",
        "Persistent failure or a stalled process has a bounded terminal path; this is distinct from a cosmetic status-update failure."
      ],
      [
        "Check final posting separately",
        "A complete final text still needs its transport receipt. Illustrated direct-human markers distinguish confirmed posting from failure/unconfirmed delivery."
      ]
    ]
  },
  {
    "id": "startup",
    "name": "Startup, reconnect, and leased-session loss",
    "steps": [
      [
        "A configured bridge process starts",
        "Each enabled transport connects under that agent’s own identity and credentials."
      ],
      [
        "First successful sync / ready",
        "A configured startup target receives one unpinged version notice per process and transport. Without a target, no notice is invented."
      ],
      [
        "The same process reconnects",
        "A reconnect does not repost that startup notice or turn it into a peer wake."
      ],
      [
        "The process itself restarts",
        "In-memory attention leases are lost. Persistent notes and saved summaries remain; unfinished turns are not automatically resumed."
      ],
      [
        "An interactive sender reacquires before sending",
        "A new guarded send must safely acquire again. Local readiness is not proof of provider or end-to-end traffic health."
      ]
    ]
  }
];
