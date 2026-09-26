export const CONSENT_VERSION = 1;

export const CONSENT_TEXT = {
  banner: {
    title: "🍪 We value your privacy",
    text: "We use essential cookies to keep the site working. With your permission, we also use analytics and marketing cookies to understand how the site is used and to improve our service. You can change your choice at any time.",
    acceptAll: "Accept All",
    rejectNonEssential: "Reject Non-Essential",
    settings: "Cookie Settings",
  },
  modal: {
    title: "Cookie Settings",
    essential: {
      title: "Essential",
      description: "Needed for login, security, and remembering your store settings. The site cannot work without these.",
    },
    analytics: {
      title: "Analytics",
      description: "Helps us see which pages are used and where things break, so we can make the product better. Data is anonymous where possible.",
    },
    marketing: {
      title: "Marketing",
      description: "Lets us measure our ads and show you relevant offers on other sites.",
    },
    save: "Save My Choices",
  },
};

export interface ConsentChoices {
  v: number;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  ts: string;
}

export const defaultConsent: ConsentChoices = {
  v: CONSENT_VERSION,
  essential: true,
  analytics: false,
  marketing: false,
  ts: "",
};
