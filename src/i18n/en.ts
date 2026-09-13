import { ja } from "./ja";

/**
 * The English half of every hard-coded UI string.
 *
 * `satisfies typeof ja` means a key missing here — or shaped differently from
 * its Japanese counterpart — is a type error at build time, not a blank
 * label discovered on the English site later.
 */

export const en = {
  meta: {
    htmlLang: "en",
    ogLocale: "en_US",
    skipToContent: "Skip to content",
  },

  common: {
    nameSeparator: ", ",
  },

  dates: {
    withDow: (date: string, dow: string) => `${date} (${dow})`,
    dowSuffix: (dow: string) => ` (${dow}) `,
  },

  notFound: {
    session: (slug: string) => `Session "${slug}"`,
    speaker: (slug: string) => `Speaker "${slug}"`,
    talk: (slug: string) => `Talk "${slug}"`,
    city: (slug: string) => `City "${slug}"`,
    title: "Not found — DevFest 2026 Preview",
    heading: (what: string) => `${what} isn't here`,
    body: "It may not be drafted yet, its slug may have changed, or this city isn't published.",
    statusLink: "Check the preview status",
  },

  topbar: {
    homeAria: (siteName: string, onHome: boolean) =>
      `${siteName} — ${onHome ? "Back to top" : "Go to home page"}`,
    sectionNavAria: "Section navigation",
    registerCta: "Register",
  },

  footer: {
    navAria: "Footer navigation",
  },

  hero: {
    registerCta: "Register",
    sessionsCta: "View sessions",
    feeLabel: "Fee",
    preeventBefore: "Pre-event:",
    preeventLinkLabel: (no: number) => `DevFest Meetup #${no}`,
    preeventAfter: (date: string, dow: string) =>
      `is open for registration — ${date} (${dow})`,
  },

  countdown: {
    heading: "Countdown",
  },

  overview: {
    heading: "Overview",
    lede: (region: string, year: string) =>
      `The essentials for DevFest ${year} in ${region}. We'll keep this updated as details are confirmed.`,
    dtDate: "Date",
    dtHours: "Hours",
    socialNote: (hours: string, label: string) =>
      `${label} planned at ${hours}`,
    dtVenue: "Venue",
    dtFormat: "Format",
    dtFee: "Fee",
    dtHost: "Host",
    coHostsNote: (coHosts: string) => `Co-hosted with: ${coHosts}`,
    disclaimer: "Note: event details and times are subject to change.",
  },

  preEvents: {
    heading: "Pre-event announced!",
    lede: (monthDay: string) =>
      `Ahead of ${monthDay}, we're holding a "DevFest Meetup" pre-event — a smaller-scale chance to talk through the day's themes beforehand. Registration for the pre-event is separate from the main event.`,
  },

  about: {
    heading: "About this event",
  },

  timetable: {
    heading: "Timetable",
    lede: (trackCount: number, hasTimetable: boolean) =>
      `We're planning for ${trackCount} tracks. ${
        hasTimetable
          ? "Confirmed sessions are listed in order."
          : "Session times are still being finalized."
      }`,
    tbdHeading: "Time TBD",
    note: "Note: the timetable is subject to change.",
  },

  sessions: {
    heading: "Sessions",
    lede: "A look at the sessions confirmed so far.",
    note: "Note: session titles, content, formats, and tracks are subject to change. We'll update this as details are confirmed.",
  },

  whatIsDevFest: {
    heading: "What is DevFest",
    body1:
      "DevFest is a community-driven technology conference held by Google Developer Groups (GDG) in regions around the world.",
    body2:
      "Through sessions on Google technology and industry trends, hands-on workshops, and networking among attendees, it creates a place to encounter both technology and community.",
    body3:
      "It's open to more than just developers — product managers, designers, students, and anyone looking to build applications or solve problems with AI are all welcome.",
  },

  partners: {
    heading: "Partners",
    lede: (region: string) => `Made together with the ${region} community.`,
  },

  codeOfConduct: {
    heading: "So everyone can take part safely",
    harassmentTitle: "Anti-Harassment Policy",
    harassmentIntro:
      "Harassment includes offensive comments related to gender, gender identity and expression, sexual orientation, disability, physical appearance, race, religion, sexual images in public spaces, deliberate intimidation, stalking, unwelcome photography or recording, inappropriate physical contact, and unwelcome attention of any of these kinds.",
    harassmentItems: [
      "GDG is committed to a harassment-free experience for everyone so they can focus on sharing knowledge",
      "Harassment of any kind will not be tolerated",
      "Attendance may be refused if participation is judged to be for an inappropriate purpose",
    ] as string[],
    harassmentFooter:
      "This policy applies not only at the venue but also to posts on social media and blogs. If you witness or experience harassment, please contact the organizers.",
    cocTitle: "Code of Conduct",
    cocDesc:
      "GDG has a Code of Conduct so that everyone can take part safely and enjoyably.",
    cocJaLabel: "行動規範（日本語）",
    cocEnLabel: "Code of Conduct (English)",
  },

  register: {
    headingLine1: "Bring your own expertise, and",
    headingLine2: (monthDay: string, city: string) =>
      `join us in ${city} on ${monthDay}.`,
    lede: (title: string) =>
      `Whether you want to deepen your expertise, get a new perspective, or build something with AI — everyone is welcome. Let's think together about the future people and AI build together, at ${title}.`,
    ctaRegister: "Register",
    ctaCommunity: (host: string) => `About ${host}`,
    note: (fee: string) =>
      `The fee is ${fee} for both in-person and online attendance. Use the button above to register.`,
  },

  meetupCard: {
    statusOpen: "Open",
    statusClosed: "Closed",
    statusDone: "Held",
    ctaDefault: "Register",
    ctaCompletedDefault: "View event page",
    factVenue: "Venue",
    factCapacity: "Capacity",
    factFee: "Fee",
    factTime: "Time",
    programHeading: "Timetable",
    programCount: (talkCount: number) =>
      talkCount > 0
        ? ` (${talkCount} lightning talk${talkCount === 1 ? "" : "s"} + social)`
        : "",
  },

  sessionCard: {
    pendingAbstract: "The session abstract is still being finalized.",
  },

  detail: {
    backToList: "← Back to sessions",
    speakersHeading: "Speakers",
    appearancesHeading: "Appearances",
    sessionPrefix: "Session: ",
    talksHeading: (count: number) => `Talks in this session (${count})`,
    metaFallback: (title: string, names: string) =>
      `${title} / Speakers: ${names}`,
    speakerMetaFallback: (name: string, role: string, siteTitle: string) =>
      `${name} (${role}) is speaking at ${siteTitle}.`,
  },

  portal: {
    title: "DevFest — All cities",
    description:
      "A list of DevFest events held by Google Developer Groups around the region. Each city's page has its sessions, speakers, and timetable.",
    introLede:
      "DevFest is a community-driven technology conference held by Google Developer Groups around the world in their own regions. Pick a city to see that year's sessions and speakers.",
    upcomingHeading: "Upcoming",
    pastHeading: "Past events",
    emptyMessage: "No upcoming DevFest events have been published yet.",
    footerBefore:
      "DevFest is a community event by Google Developer Groups. For brand and program details, see",
    footerAfter: ".",
  },

  eventCard: {
    privateBadge: "Private",
    externalSiteLabel: " (external site)",
  },

  og: {
    fee: (fee: string) => `Fee ${fee}`,
  },
} satisfies typeof ja;
