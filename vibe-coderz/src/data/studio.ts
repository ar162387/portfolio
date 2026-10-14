import { content } from "./content";
export const studio = {
  name: "Vibecoderzz",
  email: content.contact.email,
  location: "Central London, United Kingdom",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.vibecoderzz.com",
};
export const groups = [
  {
    name: "AI receptionists",
    caption: "You get on with the work. Callers get a next step.",
    code: "01",
    services: [
      {
        slug: "voice-agents",
        name: "AI voice receptionists",
        summary: "Calls handled around your rules, with a team behind the agent.",
        detail:
          "Your team has a job to finish or a client to look after. We build an AI receptionist around the calls your business actually receives: routine questions, new enquiries and appointment requests. Where supported, it can book directly into your calendar. When a person needs to step in, the call flow includes that handoff. We test the rules together and agree how the agent will be reviewed and maintained after launch.",
        deliverables: [
          "Your call flow, approved information and coverage rules",
          "Tested booking or enquiry capture with supported integrations",
          "Human handoff, call-review process and agreed ongoing care",
        ],
        fit: "Home-service businesses and health or beauty businesses handling routine enquiries and appointments. We agree what the agent can answer and when it must hand over to your team.",
      },
    ],
  },
  {
    name: "Custom CRM & software",
    caption: "Less copying between tabs. More getting things done.",
    code: "02",
    services: [
      {
        slug: "custom-software",
        name: "Custom CRM, booking & invoicing",
        summary: "A clearer path from the first enquiry to the invoice.",
        detail:
          "Bring your customer records, lead tracking, appointments, and invoices into software built around the way your business works. Start with the workflow causing the most friction. We can connect an existing system or build a focused replacement, with permissions, integrations, and handover agreed before development begins.",
        deliverables: [
          "Workflow mapping and a focused first release",
          "Customer records, lead tracking, booking or invoicing tools",
          "Agreed integrations, access controls, and handover",
        ],
        fit: "Service businesses managing enquiries, bookings, or invoices across spreadsheets and disconnected tools. Available as its own project or alongside an AI receptionist.",
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
export const articles: {
  slug: string;
  category: string;
  title: string;
  summary: string;
  sections: string[][];
  source?: string;
}[] = [
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
    slug: "before-your-ai-receptionist-books",
    category: "CALLS & BOOKING",
    title: "Before your AI receptionist books, define the rules.",
    summary:
      "A useful booking flow starts with availability, clear boundaries, and a route to your team.",
    sections: [
      [
        "Start with the real appointment",
        "Define the services a caller can book, who provides them, how long they take, and the availability the agent can use. A booking request and a confirmed appointment are different outcomes. Make that distinction clear to the caller.",
      ],
      [
        "Test what happens when a slot is unavailable",
        "Try a full calendar, an unsupported service, a caller changing their mind, and a disconnected integration. The agent should explain the next step and pass the request to your team when it cannot complete the booking.",
      ],
      [
        "Confirm the details before calling it booked",
        "Read back the selected time and the details needed for the appointment. Ask the caller to confirm, then check the calendar response. A successful conversation alone does not prove that an appointment exists.",
      ],
    ],
  },
];
