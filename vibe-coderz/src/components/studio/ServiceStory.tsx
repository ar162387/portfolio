import type { ReactNode } from "react";

export const serviceStories: Record<string, { title: string; stages: [string, string, string]; captions: [string, string, string] }> = {
  "ai-automation": { title: "From incoming work to done.", stages: ["Map the work", "Connect the tools", "Keep people in control"], captions: ["Find the trigger, the rules, and the exceptions.", "Move the right information between your tools.", "Approve sensitive actions. Track every outcome."] },
  "ai-agents": { title: "An answer with a source.", stages: ["Organise knowledge", "Retrieve what matters", "Answer with evidence"], captions: ["Turn approved documents into searchable knowledge.", "Find relevant passages within defined permissions.", "Evaluate answers, show sources, and escalate uncertainty."] },
  "voice-agents": { title: "A conversation that goes somewhere.", stages: ["Listen & understand", "Check availability", "Confirm or hand over"], captions: ["Shape the call around the caller’s actual intent.", "Connect the conversation to calendars and customer records.", "Confirm the next step, with a clear path to a person."] },
  chatbots: { title: "From question to useful next step.", stages: ["Welcome the question", "Find an approved answer", "Make the handoff"], captions: ["A focused chat experience meets visitors where they are.", "Ground responses in your team’s approved knowledge.", "Pass the context along so nobody has to start again."] },
  "web-development": { title: "A clear structure. A living website.", stages: ["Structure the pages", "Build the experience", "Check & launch"], captions: ["Give every page a purpose and every visitor a route.", "Turn the structure into a responsive, accessible interface.", "Check discoverability, speed, and the details before launch."] },
  "custom-software": { title: "One system for the whole operation.", stages: ["Map the process", "Build around roles", "Bring the data across"], captions: ["Understand who owns each task and where work gets stuck.", "Give each role the tools and access it actually needs.", "Migrate carefully, validate records, and hand over the system."] },
  ecommerce: { title: "Every order has a journey.", stages: ["Build the storefront", "Connect checkout", "Fulfil with confidence"], captions: ["Make products easy to browse, understand, and choose.", "Connect payment states to a reliable order workflow.", "Keep inventory and fulfilment in step with the sale."] },
  "web-mobile-apps": { title: "One product. Across everyday screens.", stages: ["Shape the journey", "Build across screens", "Connect & release"], captions: ["Define the useful first release around real user journeys.", "Carry the experience from browser to mobile.", "Test the APIs, sync, and release paths that hold it together."] },
  "technical-seo": { title: "Make the important pages reachable.", stages: ["Trace the crawl", "Resolve the signals", "Validate the fixes"], captions: ["Find broken routes and pages that are hard to discover.", "Align internal links, canonical URLs, and structured data.", "Check the implementation and monitor indexation signals."] },
  "organic-growth": { title: "Expertise grows through useful connections.", stages: ["Map real questions", "Create useful pages", "Connect the content"], captions: ["Group buyer questions by intent, not just keyword volume.", "Turn expertise into focused briefs and helpful pages.", "Build internal links and a sustainable editorial rhythm."] },
  "analytics-insights": { title: "From activity to a better decision.", stages: ["Define the events", "See the journey", "Choose the next improvement"], captions: ["Measure the actions that matter to your business.", "Connect acquisition, engagement, and conversion signals.", "Use the evidence to prioritise a testable improvement."] },
  "answer-engine-optimisation": { title: "Expertise that can be checked.", stages: ["Clarify the entity", "Support the answer", "Monitor visibility"], captions: ["Make the business, its expertise, and its claims consistent.", "Build concise answers around verifiable primary sources.", "Monitor how answers represent you. Inclusion is not guaranteed."] },
};

export function ServiceStory({ service, active }: { service: string; active: number }) {
  const layer = (stage: number, children: ReactNode) => <g className={`story-layer ${stage <= active ? "is-revealed" : ""} ${stage === active ? "is-current" : ""}`}>{children}</g>;
  const label = (x: number, y: number, text: string) => <text x={x} y={y} className="story-label">{text}</text>;
  const box = (x: number, y: number, w: number, h: number, title: string) => <g><rect x={x} y={y} width={w} height={h} rx="7" className="story-card" />{label(x + 12, y + 23, title)}</g>;
  const lines = (x: number, y: number, w = 65) => <path d={`M${x} ${y}h${w}m-${w} 10h${w * .72}m-${w * .72} 10h${w * .86}`} className="story-lines" />;
  const wire = (d: string) => <path d={d} className="story-wire" />;
  const check = (x: number, y: number) => <g className="story-check"><circle cx={x} cy={y} r="12" /><path d={`m${x - 5} ${y} 4 4 7-8`} /></g>;
  const browser = (x: number, y: number, w: number, h: number) => <g><rect x={x} y={y} width={w} height={h} rx="7" className="story-card" /><path d={`M${x} ${y + 20}h${w}`} className="story-lines" /><circle cx={x + 12} cy={y + 10} r="2" className="story-accent" /><circle cx={x + 20} cy={y + 10} r="2" className="story-muted" /></g>;
  const scenes: Record<string, ReactNode> = {
    "ai-automation": <>
      {layer(0, <>{box(20, 45, 104, 64, "NEW REQUEST")}{lines(32, 84)}{box(20, 145, 104, 58, "CRM RECORD")}{wire("M124 78h37v46h27M124 174h37v-50")}</>)}
      {layer(1, <>{box(188, 92, 110, 66, "CHECK RULES")}<path d="m205 136 7-7 7 7m15-7h39" className="story-lines" />{wire("M298 124h28v-64h27M326 124v70h27")}</>)}
      {layer(2, <>{box(353, 30, 105, 63, "APPROVAL")}{check(377, 73)}{box(353, 162, 105, 64, "ACTION LOG")}{lines(365, 201, 65)}{wire("M405 94v67")}</>)}
    </>,
    "ai-agents": <>
      {layer(0, <>{box(22, 31, 101, 116, "DOCUMENTS")}{lines(35, 74)}{lines(35, 111, 57)}{box(37, 161, 101, 47, "PERMISSIONS")}</>)}
      {layer(1, <>{wire("M124 87h48M138 183h34V87")}{box(173, 45, 128, 150, "RETRIEVAL")}{[0,1,2].map(i => <rect key={i} x="187" y={85+i*30} width={i===1?98:78} height="19" rx="3" className={i===1?"story-highlight":"story-muted-block"} />)}{wire("M301 121h31")}</>)}
      {layer(2, <>{box(332, 52, 128, 143, "GROUNDED ANSWER")}{lines(345, 93, 98)}{lines(345, 128, 82)}<rect x="345" y="161" width="80" height="20" rx="3" className="story-highlight" />{label(352,175,"SOURCE [1]")}</>)}
    </>,
    "voice-agents": <>
      {layer(0, <><circle cx="100" cy="120" r="62" className="story-orbit" /><circle cx="100" cy="120" r="44" className="story-card" />{[24,42,65,38,52,25].map((h,i)=><rect key={i} x={69+i*11} y={120-h/2} width="4" height={h} rx="2" className="story-wave" style={{animationDelay:`${i*.12}s`}} />)}{label(56,210,"CALLER INTENT")}</>)}
      {layer(1, <>{wire("M163 120h30")}{box(194, 57, 122, 127, "AVAILABILITY")}{[0,1,2,3,4,5].map(i=><rect key={i} x={208+(i%3)*30} y={100+Math.floor(i/3)*31} width="22" height="22" rx="3" className={i===4?"story-highlight":"story-muted-block"} />)}</>)}
      {layer(2, <>{wire("M317 120h27")}{box(345, 68, 116, 105, "BOOKING")}{label(359,118,"TUE · 10:30")}{check(402,147)}{label(344,207,"HUMAN FALLBACK")}</>)}
    </>,
    chatbots: <>
      {layer(0, <>{box(30, 25, 276, 55, "VISITOR · How can I change my order?")}<path d="m51 80-8 12h28" className="story-lines" /></>)}
      {layer(1, <>{box(124, 100, 322, 62, "ASSISTANT · Here’s the approved process.")}{lines(140,140,224)}{wire("M372 80v19")}{label(322,69,"KNOWLEDGE")}</>)}
      {layer(2, <>{box(66, 187, 350, 48, "SUPPORT · Order details & conversation attached")}{check(439,211)}{wire("M270 162v24")}</>)}
    </>,
    "web-development": <>
      {layer(0, <>{box(24, 47, 94, 42, "HOME")}{box(24, 116, 94, 38, "SERVICES")}{box(24, 182, 94, 38, "CONTACT")}{wire("M118 69h23v132h-23M141 135h25")}</>)}
      {layer(1, <>{browser(168,34,202,186)}<rect x="184" y="70" width="170" height="58" rx="4" className="story-highlight" />{label(198,102,"A CLEAR FIRST IMPRESSION")}{lines(185,149,90)}<rect x="184" y="184" width="75" height="20" rx="3" className="story-highlight" /></>)}
      {layer(2, <>{browser(395,84,64,136)}<rect x="404" y="114" width="46" height="44" rx="3" className="story-highlight" />{lines(404,173,38)}{check(425,49)}</>)}
    </>,
    "custom-software": <>
      {layer(0, <>{box(20,32,130,51,"SALES · New lead")}{box(20,105,130,51,"OPS · Qualify")}{box(20,178,130,51,"FINANCE · Invoice")}{wire("M85 83v21m0 52v22")}</>)}
      {layer(1, <>{wire("M150 130h30")}{browser(181,37,176,189)}{label(193,81,"SHARED WORKSPACE")}{[0,1,2].map(i=><g key={i}><rect x="194" y={96+i*35} width="148" height="25" rx="3" className="story-muted-block" />{label(204,113+i*35,["ASSIGNED","IN PROGRESS","APPROVED"][i])}</g>)}</>)}
      {layer(2, <>{wire("M357 130h22")}{box(380,63,83,120,"DATA")}{lines(391,105,57)}{check(420,157)}{label(381,211,"VALIDATED")}</>)}
    </>,
    ecommerce: <>
      {layer(0, <>{browser(20,39,140,181)}{[0,1,2,3].map(i=><g key={i}><rect x={31+(i%2)*64} y={72+Math.floor(i/2)*65} width="54" height="43" rx="4" className="story-muted-block" /><path d={`m${47+(i%2)*64} ${102+Math.floor(i/2)*65}v-18h22v18z`} className="story-lines" /></g>)}{label(34,208,"CHOOSE A PRODUCT")}</>)}
      {layer(1, <>{wire("M160 129h23")}{box(184,65,125,134,"CHECKOUT")}{lines(197,106,96)}<rect x="198" y="153" width="96" height="29" rx="4" className="story-highlight" />{label(220,172,"PAYMENT")}</>)}
      {layer(2, <>{wire("M309 129h25")}{box(334,40,125,180,"ORDER RECEIVED")}{check(396,96)}{label(347,140,"STOCK UPDATED")}{label(347,166,"PACK → DISPATCH")}{label(347,194,"TRACKING SENT")}</>)}
    </>,
    "web-mobile-apps": <>
      {layer(0, <>{box(25,46,104,43,"DISCOVER")}{box(25,109,104,43,"TAKE ACTION")}{box(25,172,104,43,"RETURN")}{wire("M77 89v20m0 43v20")}</>)}
      {layer(1, <>{browser(170,37,155,146)}<rect x="182" y="71" width="130" height="49" rx="4" className="story-highlight" />{lines(182,137,107)}{browser(352,61,82,155)}<rect x="363" y="94" width="60" height="48" rx="4" className="story-highlight" />{lines(363,164,49)}</>)}
      {layer(2, <>{wire("M250 184v39h102v-7M129 131h40")}{box(210,209,116,34,"SHARED API")}{check(444,44)}</>)}
    </>,
    "technical-seo": <>
      {layer(0, <>{wire("M77 70h94v63h54M77 70v117h94M171 70h54")}{box(25,44,103,47,"CRAWLER")}{[70,133,196].map((y,i)=><g key={y}><rect x="225" y={y-20} width="91" height="38" rx="4" className="story-card" />{label(236,y+3,["/HOME","/SERVICE","/ARTICLE"][i])}</g>)}</>)}
      {layer(1, <>{wire("M316 70h38m-38 63h38m-38 63h38")}{[70,133,196].map(y=><g key={y}>{check(366,y)}</g>)}</>)}
      {layer(2, <>{box(396,46,64,171,"SITE")}{[0,1,2,3].map(i=><rect key={i} x="408" y={86+i*27} width="39" height="15" rx="3" className="story-highlight" />)}{label(30,239,"CRAWL → REPAIR → VALIDATE")}</>)}
    </>,
    "organic-growth": <>
      {layer(0, <>{box(18,33,143,42,"WHAT DOES IT COST?")}{box(18,111,143,42,"HOW DOES IT WORK?")}{box(18,189,143,42,"IS IT RIGHT FOR ME?")}</>)}
      {layer(1, <>{wire("M161 54h29v77h19M161 132h48M161 210h29v-79")}{box(210,89,114,85,"CORE TOPIC")}{lines(224,129,84)}</>)}
      {layer(2, <>{wire("M324 131h26V48h19M350 131h19M350 131v83h19")}{[48,131,214].map((y,i)=><g key={y}>{box(370,y-24,92,48,["GUIDE","SERVICE","CASE STUDY"][i])}</g>)}</>)}
    </>,
    "analytics-insights": <>
      {layer(0, <>{[0,1,2,3].map(i=><g key={i}><circle cx="40" cy={58+i*47} r="5" className="story-accent" />{label(55,62+i*47,["PAGE VIEW","ENQUIRY","SIGN UP","PURCHASE"][i])}</g>)}</>)}
      {layer(1, <>{wire("M145 130h30")}<path d="M179 55h131l-22 41h-87zm22 51h87l-19 39h-49zm19 49h49l-12 39h-25z" className="story-funnel" />{label(199,225,"WHERE PEOPLE LEAVE")}</>)}
      {layer(2, <>{box(335,42,126,180,"NEXT EXPERIMENT")}<path d="M348 155l20-13 19 5 26-39 29-20" className="story-trend" />{label(348,185,"TEST → MEASURE")}{label(348,204,"LEARN → IMPROVE")}</>)}
    </>,
    "answer-engine-optimisation": <>
      {layer(0, <><circle cx="86" cy="127" r="46" className="story-card" />{label(57,123,"BUSINESS")}{label(58,141,"& EXPERTISE")}{wire("M86 81V47m0 126v34")}{label(48,34,"CLEAR ENTITIES")}{label(36,227,"CONSISTENT FACTS")}</>)}
      {layer(1, <>{wire("M133 127h34")}{box(168,45,127,170,"PRIMARY EVIDENCE")}{lines(182,86,96)}{lines(182,126,81)}{check(232,184)}</>)}
      {layer(2, <>{wire("M295 127h26")}{box(322,69,139,135,"ANSWER")}{lines(336,110,108)}<rect x="336" y="153" width="105" height="27" rx="3" className="story-highlight" />{label(346,171,"SOURCE LINK ↗")}{label(328,232,"OBSERVE VISIBILITY")}</>)}
    </>,
  };
  return <svg className="service-story" viewBox="0 0 480 260" aria-hidden="true"><g>{scenes[service]}</g></svg>;
}
