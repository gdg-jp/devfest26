import type { ImageMetadata } from "astro";
import googleLogo from "../../assets/tokyo/googlelogo.png";

export interface OrganizerLink {
  label: string;
  url: string;
}

export interface OrganizerItem {
  name: string;
  xHandle?: string;
  xUrl?: string;
  description?: string;
  links?: OrganizerLink[];
  logo?: {
    image: ImageMetadata | string;
    alt: string;
    url?: string;
    width?: number;
  };
  rail?: "blue" | "green" | "yellow" | "red";
}

export interface OrganizerSection {
  category: "organizer" | "co-organizer" | "sponsor";
  title: string;
  items: OrganizerItem[];
}

export const TOKYO_ORGANIZERS: OrganizerSection[] = [
  {
    category: "organizer",
    title: "主催",
    items: [
      {
        name: "GDG Tokyo",
        xHandle: "@gdgtokyo",
        xUrl: "https://x.com/gdgtokyo",
        description: `Google Developer Group (GDG) Tokyo は、主に Google のテクノロジーに興味のある人たちで情報を共有し合うコミュニティです。平日夜や週末に東京で勉強会などを行っています。ご興味のある方は気軽にご参加ください。\nGoogle Developer Group (GDG) Tokyo is a group of people who are interested in Google technology and share information. #GDGTokyo #GDG #DevFest`,
        links: [
          {
            label: "https://gdg-tokyo.connpass.com/",
            url: "https://gdg-tokyo.connpass.com/",
          },
        ],
        rail: "blue",
      },
      {
        name: "GDG Shibuya",
        description: `Google Developer Group (GDG) Shibuya は、渋谷を拠点に国内外のエンジニアやクリエイターが集う国際色豊かなテックコミュニティです。日本に滞在・勤務するエキスパートや海外エキスパットはもちろん、グローバルな開発環境や英語での技術交流に関心のある日本人エンジニアも大歓迎です。Google の最新テクノロジーに関する勉強会やネットワーキングを通じて、多様なバックグラウンドを持つ仲間とつながりましょう！\n\nGoogle Developer Group (GDG) Shibuya is an internationally minded tech community based in Shibuya, welcoming expats, international engineers, and local Japanese developers alike. We host meetups, workshops, and networking events centered around Google technologies and modern software development. Whether you are living in Tokyo or looking to connect globally, everyone passionate about building with tech is welcome to join! #GDGShibuya #GDG #DevFest`,
        rail: "green",
      },
    ],
  },
  {
    category: "co-organizer",
    title: "共催",
    items: [
      {
        name: "GDGoC",
        xHandle: "@gdscjp",
        xUrl: "https://x.com/gdscjp",
        description: `Google Developer Groups on Campus (GDGoC) プログラムは、Google のテクノロジーに関心のある学生のためのコミュニティです。学生がテクノロジーの力で身近なコミュニティにおける問題を解決することを目的としています。IT 業界に興味のあるすべての大学・大学院生が参加可能で、世界中の学生との交流やさまざまな活動、ワークショップを通じて、学生の開発能力とリーダーシップ力の向上を支援しています。GDGoC は、113カ国以上、1,500以上の拠点から世界中の学生が参加しているグローバルなプログラムです。`,
        rail: "yellow",
      },
    ],
  },
  {
    category: "sponsor",
    title: "協賛",
    items: [
      {
        name: "Google",
        xHandle: "@googledevjp",
        xUrl: "https://x.com/googledevjp",
        logo: {
          image: googleLogo,
          alt: "Google",
          url: "https://developers.google.com/",
          width: 220,
        },
        rail: "red",
      },
    ],
  },
];
