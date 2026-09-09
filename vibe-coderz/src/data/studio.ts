import { content } from "./content";
export const studio = {
  name: "Vibecoderzz",
  email: content.contact.email,
  location: "Central London, United Kingdom",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.vibecoderzz.com",
};
export const groups = [
  {
    name: "AI & automation",
    caption: "Give busywork a new owner.",
    code: "01",
    services: [
      {
        slug: "ai-automation",
        name: "AI automation",
        summary: "Connect your tools. Let the repetitive work run itself.",
        detail:
          "Turn repetitive business processes into connected workflows, with clear rules, human approvals, and a useful record of every action.",
        deliverables: [
          "Workflow and integration audit",
          "Connected CRM, email, and business tools",
          "Approval steps, retries, and monitoring",
        ],
        fit: "Teams copying information between tools or spending hours on repeatable admin.",
      },
      {
        slug: "ai-agents",
        name: "AI agents & RAG",
        summary: "Useful intelligence, grounded in your business.",
        detail:
          "Build assistants that retrieve information from your documents and take carefully scoped actions. We define what an agent can access, when it should ask for help, and how to measure answer quality.",
        deliverables: [
          "Knowledge ingestion and retrieval",
          "Tool integrations and access controls",
          "Evaluation cases and human handoffs",
        ],
        fit: "Businesses with scattered knowledge, complex support questions, or research workflows.",
      },
      {
        slug: "voice-agents",
        name: "Voice agents",
        summary: "A better first conversation. Even after hours.",
        detail:
          "Create a voice assistant for routine questions, appointment requests, and call routing. Conversation design includes disclosure, consent requirements, and a clear route to a person.",
        deliverables: [
          "Call flow and knowledge setup",
          "Calendar and CRM integration",
          "Escalation rules and call testing",
        ],
        fit: "Service businesses handling repeat enquiries and appointment scheduling.",
      },
      {
        slug: "chatbots",
        name: "Customer support chatbots",
        summary: "Answers that help. Handoffs that make sense.",
        detail:
          "Give visitors a useful way to find answers, explore your services, and reach the right person. Responses draw from approved content with a clear fallback when information is missing.",
        deliverables: [
          "Website chat experience",
          "Approved knowledge and response testing",
          "Lead capture and support handoff",
        ],
        fit: "Teams answering the same questions across their website and support inbox.",
      },
    ],
  },
  {
    name: "Development",
    caption: "From first idea to daily use.",
    code: "02",
    services: [
      {
        slug: "web-development",
        name: "Web development",
        summary: "Fast, thoughtful websites built to be found.",
        detail:
          "We build responsive business websites with a clear content structure, accessible interfaces, and technical SEO foundations. Your team gets a site that is straightforward to use and maintain.",
        deliverables: [
          "Page architecture and responsive build",
          "Metadata, sitemap, and structured data",
          "Performance checks and launch handover",
        ],
        fit: "Businesses replacing a basic website with a credible platform for enquiries.",
      },
      {
        slug: "custom-software",
        name: "Custom software & CRMs",
        summary: "Software that fits how your business works.",
        detail:
          "Bring customers, operations, and reporting into one system designed around your actual process. Start with the highest-value workflow, then expand without losing control of data and permissions.",
        deliverables: [
          "Workflow mapping and system architecture",
          "Role-based dashboards and integrations",
          "Data migration plan and operating documentation",
        ],
        fit: "Teams whose work has outgrown spreadsheets or disconnected off-the-shelf tools.",
      },
      {
        slug: "ecommerce",
        name: "Ecommerce",
        summary: "From browsing to buying. Without the friction.",
        detail:
          "Connect a clear shopping experience to the work behind the order: catalogue management, payments, inventory, and fulfilment. We test the full journey, including failed payments and order updates.",
        deliverables: [
          "Storefront and product catalogue",
          "Payment and order workflows",
          "Inventory tools and checkout testing",
        ],
        fit: "Retailers and food businesses that need their storefront and operations to work together.",
      },
      {
        slug: "web-mobile-apps",
        name: "Web & mobile apps",
        summary: "Real products. Ready for the everyday.",
        detail:
          "Build useful applications for browsers and mobile devices, from the first working release through integrations and ongoing improvements. We choose the stack around the product, team, and constraints.",
        deliverables: [
          "Product scope and key user journeys",
          "Web or cross-platform mobile application",
          "API integrations, testing, and release handover",
        ],
        fit: "Founders and businesses turning a validated idea into a working product.",
      },
    ],
  },
  {
    name: "SEO, growth & insights",
    caption: "Be found. Understand what works.",
    code: "03",
    services: [
      {
        slug: "technical-seo",
        name: "Technical SEO",
        summary: "Give search engines a site they can understand.",
        detail:
          "Identify the technical issues preventing useful pages from being discovered and understood. We prioritise crawlability, indexation, internal links, page structure, and real performance problems.",
        deliverables: [
          "Technical audit and prioritised fixes",
          "Canonical, sitemap, and structured data review",
          "Search Console setup guidance and validation",
        ],
        fit: "Businesses with useful content that is difficult to discover in organic search.",
      },
      {
        slug: "organic-growth",
        name: "Organic growth & content",
        summary: "Useful pages for the questions your buyers ask.",
        detail:
          "Build a content plan around your expertise and your customers’ questions. We map topics to service pages and practical articles, with a focus on useful information rather than bulk publishing.",
        deliverables: [
          "Search intent and topic mapping",
          "Service page and content briefs",
          "Internal linking and editorial plan",
        ],
        fit: "Studios and service businesses looking to earn relevant search traffic over time.",
      },
      {
        slug: "analytics-insights",
        name: "Analytics & ranking insights",
        summary: "Know what brings people in. And what comes next.",
        detail:
          "Connect acquisition data with meaningful actions such as qualified enquiries and completed purchases. Establish a baseline, make reporting understandable, and use it to decide what to improve next.",
        deliverables: [
          "Measurement plan and event definitions",
          "Analytics and search performance dashboards",
          "Conversion review and improvement backlog",
        ],
        fit: "Teams that need to connect website activity with business decisions.",
      },
      {
        slug: "answer-engine-optimisation",
        name: "GEO & answer visibility",
        summary: "Clear expertise for a changing search landscape.",
        detail:
          "Make your expertise easy to find, verify, and understand across traditional search and AI-assisted discovery. Work centres on accurate entities, primary evidence, and well-structured answers; inclusion is never guaranteed.",
        deliverables: [
          "Entity and content clarity review",
          "Source-backed answer content",
          "Structured data and visibility monitoring plan",
        ],
        fit: "Businesses strengthening how their expertise is represented across search experiences.",
      },
    ],
  },
];
export const services = groups.flatMap((g) =>
  g.services.map((s) => ({ ...s, group: g.name, code: g.code })),
);
export const projects = content.portfolio.map((p) => ({
  ...p,
  screenshots: p.screenshots.filter((s) => s !== "/assets/img/yapp/image3.png"),
  type: p.tags.includes("Mobile") ? "Mobile" : "Web",
  description:
    p.id === "yapp-multimedia"
      ? "A Flutter application that combines an image with recorded audio to create a shareable video. The product includes media capture, on-device processing, playback, and a library for managing creations."
      : p.description,
  tech:
    p.id === "bms-system"
      ? "React, TypeScript, Laravel, WebSockets"
      : p.id === "yapp-multimedia"
        ? "Flutter, FFmpegKit, Provider"
        : p.tech,
}));
export const articles = [
  {
    slug: "before-you-build-custom-software",
    category: "PRODUCT STRATEGY",
    title: "Before you build custom software, map the work.",
    summary:
      "A practical starting point for replacing spreadsheets and disconnected tools.",
    sections: [
      [
        "Start with one real workflow",
        "Follow a task from the moment it arrives to the moment it is finished. Write down who touches it, what information they need, and where they wait. A specific process reveals more than a long feature wishlist.",
      ],
      [
        "Separate the rule from the exception",
        "Record the usual path and the exceptions: missing information, approvals, duplicate records, and cancellations. These details shape the data model and permissions before a screen is designed.",
      ],
      [
        "Choose a first release people can use",
        "Pick a complete, narrow workflow. Define how existing records will move, who will validate them, and what happens if the new system needs to be rolled back. Expansion becomes easier once the first workflow works in practice.",
      ],
    ],
  },
  {
    slug: "automation-needs-a-human-handoff",
    category: "AI & AUTOMATION",
    title: "Good automation knows when to ask a person.",
    summary: "Design the exception path before you automate the happy path.",
    sections: [
      [
        "Define the boundary",
        "Give every automation a limited job, a clear source of information, and explicit permissions. Drafting a reply and sending it are different actions. Deciding which actions need approval is part of the product design.",
      ],
      [
        "Make uncertainty visible",
        "Missing information, conflicting records, and unexpected responses should trigger an understandable handoff. Show the reviewer the original request, the available evidence, and the proposed next step.",
      ],
      [
        "Test the awkward cases",
        "Use duplicate submissions, unavailable services, ambiguous requests, and expired permissions as test cases. Keep an action log, add safe retries, and make it possible to stop the workflow without losing its history.",
      ],
    ],
  },
  {
    slug: "search-ready-website-foundations",
    category: "SEARCH & GROWTH",
    title: "Search visibility starts with your site structure.",
    summary:
      "Why useful service pages deserve more than a section on your homepage.",
    sections: [
      [
        "Give each service a useful home",
        "A dedicated service page can explain who it helps, what is included, and how the work happens. Link it to relevant examples so a visitor can move from the offer to evidence without searching through a portfolio.",
      ],
      [
        "Make the basics explicit",
        "Use descriptive page titles, readable URLs, and internal links. Publish a sitemap and check that important content is present in the page HTML. These foundations help search engines discover and understand the site.",
      ],
      [
        "Measure discovery and enquiries",
        "After launch, use Search Console to inspect indexation and search queries. Pair those signals with meaningful conversions. A published sitemap does not guarantee indexation or rankings; useful content and continued iteration still matter.",
      ],
    ],
    source:
      "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
  },
];
