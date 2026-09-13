import { event } from "./event";
import { speaker } from "./speaker";
import { track } from "./track";
import { session } from "./session";
import { talk } from "./talk";
import { meetup } from "./meetup";
import { partner } from "./partner";
import { aboutPage } from "./aboutPage";
import { photoSet } from "./photoSet";
import { externalEvent } from "./externalEvent";
import { deploy } from "./deploy";
import { stringList } from "./types/stringList";
import { richText } from "./types/richText";

export const schemaTypes = [
  event,
  speaker,
  track,
  session,
  talk,
  meetup,
  partner,
  aboutPage,
  photoSet,
  externalEvent,
  deploy,
  // Alias types named in `internationalizedArray`'s `fieldTypes`, in
  // sanity.config.ts — not documents, but registered the same way.
  stringList,
  richText,
];
