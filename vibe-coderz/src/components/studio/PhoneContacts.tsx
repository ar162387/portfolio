import { Phone } from "lucide-react";

const contacts = [
  { country: "United Kingdom", flag: "🇬🇧", number: "+44 7459 137977", digits: "447459137977" },
];

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.65 15.02L2 22l5.12-1.34A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.08-1.12l-.29-.17-3.04.8.81-2.96-.19-.31A8 8 0 1 1 12 20Zm4.4-5.85c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.15 1.51.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export function PhoneContacts({ placement }: { placement: "header" | "footer" | "contact" }) {
  return (
    <div className={`phone-contacts phone-contacts--${placement}`} role="group" aria-label="Contact us on WhatsApp or by phone">
      {contacts.map(({ country, flag, number, digits }) => (
        <div className="phone-contact-row" key={digits}>
          <a className="phone-number" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${country}: ${number}`}>
            <span className="phone-country" aria-hidden="true"><span>{flag}</span></span>
            <span className="phone-copy"><span>{number}</span></span>
          </a>
          <a className="phone-action phone-whatsapp" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" aria-label={`Message ${country} on WhatsApp`} title={`WhatsApp ${country}`}>
            <WhatsAppIcon />
          </a>
          <a className="phone-action" href={`tel:+${digits}`} aria-label={`Call ${country}: ${number}`} title={`Call ${country}`}>
            <Phone size={17} aria-hidden="true" />
          </a>
        </div>
      ))}
    </div>
  );
}
