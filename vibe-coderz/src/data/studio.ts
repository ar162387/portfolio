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
