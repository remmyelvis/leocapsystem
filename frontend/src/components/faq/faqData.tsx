import { useMemo, type ReactNode } from "react";
import { plainText, RichText } from "@/lib/siteContent/format";
import { TOPICS, type Topic } from "@/lib/siteContent/types";
import { useContact, useSiteContent } from "@/lib/siteContent/useSiteContent";

export { TOPICS };
export type { Topic };

export interface Faq {
  id: string;
  topic: Topic;
  q: string;
  /** Plain text of the answer: what the search looks at and what search engines read. */
  text: string;
  answer: ReactNode;
  popular?: boolean;
}

// The questions and answers are content: they live in lib/siteContent/defaults.ts and can be changed by an admin
// (Admin > Site content), so this reads whatever is current.
export function useFaqs(): Faq[] {
  const { faq } = useSiteContent();
  const contact = useContact();
  return useMemo(
    () => faq.items.map((f) => ({ id: f.id, topic: f.topic, q: f.q, popular: f.popular, text: plainText(f.a, contact), answer: <RichText source={f.a} contact={contact} /> })),
    [faq, contact]
  );
}
