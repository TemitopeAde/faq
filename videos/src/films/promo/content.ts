import { FAQ_TEMPLATES } from "@/lib/faq-templates";
import type { TwinItem } from "../../twins/WidgetTwin";

// Real template content shipped in the app (src/lib/faq-templates.ts → "Online store").
const store = FAQ_TEMPLATES.find((template) => template.id === "online-store")!;
export const storeItems: Array<TwinItem> = store.items.map((item, index) => ({ id: `q${index}`, ...item }));

// The site page fits five questions; both "refund" matches (q3, q4) are among them.
export const siteItems: Array<TwinItem> = storeItems.slice(0, 5);
