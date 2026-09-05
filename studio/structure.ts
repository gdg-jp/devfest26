import type { StructureResolver } from "sanity/structure";

/** Every type that belongs to exactly one city. */
export const CITY_SCOPED_TYPES = [
  "track",
  "session",
  "talk",
  "speaker",
  "meetup",
  "partner",
  "aboutPage",
  "photoSet",
] as const;

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Cities")
        .child(
          S.documentTypeList("event")
            .title("Cities")
            .child((eventId) =>
              S.list()
                .title("City Content")
                .items([
                  S.listItem()
                    .title("Tracks")
                    .child(
                      S.documentList()
                        .title("Tracks")
                        .schemaType("track")
                        .filter('_type == "track" && event._ref == $eventId')
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("track-by-event", {
                            eventId,
                          }),
                        ])
                        .defaultOrdering([
                          { field: "order", direction: "asc" },
                        ]),
                    ),
                  S.listItem()
                    .title("Sessions")
                    .child(
                      S.documentList()
                        .title("Sessions")
                        .schemaType("session")
                        .filter('_type == "session" && event._ref == $eventId')
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("session-by-event", {
                            eventId,
                          }),
                        ])
                        // "track.order" is compiled to the GROQ dereference
                        // "track->order", so the list runs in the order the
                        // site prints: track by track, session by session.
                        // A session is placed by its own start, which is the
                        // only running order it has — there is no separate
                        // order field to keep in step. GROQ sorts null lowest,
                        // so a session with no time yet sits at the top of its
                        // track, which is where it wants to be while it is
                        // still being decided.
                        .defaultOrdering([
                          { field: "track.order", direction: "asc" },
                          { field: "start", direction: "asc" },
                        ]),
                    ),
                  // Only a city that runs several talks in one session has
                  // anything here; the rest leave the list empty.
                  S.listItem()
                    .title("Talks")
                    .child(
                      S.documentList()
                        .title("Talks")
                        .schemaType("talk")
                        .filter('_type == "talk" && event._ref == $eventId')
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("talk-by-event", {
                            eventId,
                          }),
                        ])
                        // Talks belong to sessions, which set their order.
                        // Here they are listed alphabetically by title.
                        .defaultOrdering([
                          { field: "title", direction: "asc" },
                        ]),
                    ),
                  S.listItem()
                    .title("Speakers")
                    .child(
                      S.documentList()
                        .title("Speakers")
                        .schemaType("speaker")
                        .filter('_type == "speaker" && event._ref == $eventId')
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("speaker-by-event", {
                            eventId,
                          }),
                        ]),
                    ),
                  S.listItem()
                    .title("Meetups")
                    .child(
                      S.documentList()
                        .title("Meetups")
                        .schemaType("meetup")
                        .filter('_type == "meetup" && event._ref == $eventId')
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("meetup-by-event", {
                            eventId,
                          }),
                        ])
                        .defaultOrdering([{ field: "no", direction: "asc" }]),
                    ),
                  S.listItem()
                    .title("Partners")
                    .child(
                      S.documentList()
                        .title("Partners")
                        .schemaType("partner")
                        .filter('_type == "partner" && event._ref == $eventId')
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("partner-by-event", {
                            eventId,
                          }),
                        ])
                        .defaultOrdering([
                          { field: "order", direction: "asc" },
                        ]),
                    ),
                  S.listItem()
                    .title("About Pages")
                    .child(
                      S.documentList()
                        .title("About Pages")
                        .schemaType("aboutPage")
                        .filter(
                          '_type == "aboutPage" && event._ref == $eventId',
                        )
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("aboutPage-by-event", {
                            eventId,
                          }),
                        ]),
                    ),
                  S.listItem()
                    .title("Photos")
                    .child(
                      S.documentList()
                        .title("Photos")
                        .schemaType("photoSet")
                        .filter('_type == "photoSet" && event._ref == $eventId')
                        .params({ eventId })
                        .initialValueTemplates([
                          S.initialValueTemplateItem("photoSet-by-event", {
                            eventId,
                          }),
                        ]),
                    ),
                ]),
            ),
        ),
      S.divider(),
      S.listItem()
        .title("Events (Tenant config)")
        .child(S.documentTypeList("event").title("Events")),
      // Deliberately outside "Cities": an external event belongs to none of
      // them. It carries no `event` reference, so nesting it under a city
      // would promise a link that does not exist.
      S.listItem()
        .title("External Events")
        .child(
          S.documentTypeList("externalEvent")
            .title("External Events")
            .defaultOrdering([{ field: "startsAt", direction: "desc" }]),
        ),
    ]);
