export type FAQTemplate = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  preset: string;
  items: Array<{ question: string; answer: string; category: string }>;
};

export const FAQ_TEMPLATES: Array<FAQTemplate> = [
  {
    id: 'online-store', name: 'Online store', emoji: '🛍️', preset: 'product',
    description: 'Shipping, returns, payments and order tracking.',
    items: [
      { category: 'Shipping', question: 'How long does shipping take?', answer: '<p>Orders ship within 1–2 business days. Standard delivery takes 3–7 business days; express delivery takes 1–3 business days.</p>' },
      { category: 'Shipping', question: 'Do you ship internationally?', answer: '<p>Yes, we ship to most countries. Shipping costs and delivery times are shown at checkout.</p>' },
      { category: 'Shipping', question: 'How can I track my order?', answer: '<p>Once your order ships, we email you a tracking link. You can also find it in your account under <strong>My Orders</strong>.</p>' },
      { category: 'Returns', question: 'What is your return policy?', answer: '<p>You can return unused items in their original packaging within 30 days of delivery for a full refund.</p>' },
      { category: 'Returns', question: 'How long do refunds take?', answer: '<p>Refunds are issued to your original payment method within 5–10 business days after we receive your return.</p>' },
      { category: 'Payments', question: 'Which payment methods do you accept?', answer: '<p>We accept all major credit and debit cards, PayPal, and other payment methods shown at checkout.</p>' },
      { category: 'Payments', question: 'Is my payment information secure?', answer: '<p>Yes. All payments are processed over an encrypted connection by a PCI-compliant payment provider. We never store your card details.</p>' },
      { category: 'Orders', question: 'Can I change or cancel my order?', answer: '<p>Contact us as soon as possible. We can change or cancel orders that have not shipped yet.</p>' },
    ],
  },
  {
    id: 'restaurant', name: 'Restaurant', emoji: '🍽️', preset: 'conversation',
    description: 'Reservations, menu, dietary needs and events.',
    items: [
      { category: 'Reservations', question: 'Do I need a reservation?', answer: '<p>Walk-ins are welcome, but we recommend booking ahead for dinner and weekends.</p>' },
      { category: 'Reservations', question: 'How do I cancel or change my booking?', answer: '<p>Use the link in your confirmation email or call us. Please let us know at least 24 hours in advance.</p>' },
      { category: 'Menu', question: 'Do you have vegetarian or vegan options?', answer: '<p>Yes. Vegetarian and vegan dishes are marked on our menu, and many dishes can be adapted.</p>' },
      { category: 'Menu', question: 'Can you accommodate food allergies?', answer: '<p>Please tell your server about any allergies. Our kitchen will advise which dishes are safe and adapt where possible.</p>' },
      { category: 'Visiting', question: 'Is there parking nearby?', answer: '<p>Yes, there is public parking within a short walk of the restaurant.</p>' },
      { category: 'Events', question: 'Can I book the restaurant for a private event?', answer: '<p>Yes. We host private dinners and celebrations. Contact us with your date and group size for options.</p>' },
    ],
  },
  {
    id: 'services', name: 'Bookings & services', emoji: '📅', preset: 'help-center',
    description: 'Appointments, cancellations, pricing and preparation.',
    items: [
      { category: 'Booking', question: 'How do I book an appointment?', answer: '<p>Choose a service and an available time on our booking page, then confirm your details.</p>' },
      { category: 'Booking', question: 'What is your cancellation policy?', answer: '<p>You can cancel or reschedule free of charge up to 24 hours before your appointment.</p>' },
      { category: 'Pricing', question: 'How much do your services cost?', answer: '<p>Prices are listed with each service on our booking page. Packages and memberships offer discounted rates.</p>' },
      { category: 'Pricing', question: 'When do I pay?', answer: '<p>You can pay online when booking or in person at your appointment.</p>' },
      { category: 'Preparation', question: 'What should I bring to my first session?', answer: '<p>Please arrive 10 minutes early and bring anything mentioned in your confirmation email.</p>' },
    ],
  },
  {
    id: 'saas', name: 'Software & SaaS', emoji: '💻', preset: 'docs',
    description: 'Plans, billing, accounts and data security.',
    items: [
      { category: 'Plans', question: 'Is there a free trial?', answer: '<p>Yes. Every plan includes a 14-day free trial with no credit card required.</p>' },
      { category: 'Plans', question: 'Can I change my plan later?', answer: '<p>You can upgrade or downgrade at any time. Changes take effect on your next billing cycle.</p>' },
      { category: 'Billing', question: 'How does billing work?', answer: '<p>Plans are billed monthly or yearly in advance. Yearly plans include a discount.</p>' },
      { category: 'Account', question: 'How do I reset my password?', answer: '<p>Click <strong>Forgot password</strong> on the login page and follow the link we email you.</p>' },
      { category: 'Security', question: 'How is my data protected?', answer: '<p>Your data is encrypted in transit and at rest, backed up daily, and never shared with third parties.</p>' },
      { category: 'Account', question: 'How do I cancel my subscription?', answer: '<p>Go to <strong>Settings → Billing</strong> and click <strong>Cancel plan</strong>. You keep access until the end of the billing period.</p>' },
    ],
  },
  {
    id: 'events', name: 'Events & tickets', emoji: '🎟️', preset: 'onboarding',
    description: 'Tickets, venue, schedule and refunds.',
    items: [
      { category: 'Tickets', question: 'How do I get my tickets?', answer: '<p>Tickets are emailed to you right after purchase. Show them on your phone or print them at home.</p>' },
      { category: 'Tickets', question: 'Can I get a refund?', answer: '<p>Tickets are refundable up to 7 days before the event. After that, you can transfer your ticket to someone else.</p>' },
      { category: 'Venue', question: 'Is the venue accessible?', answer: '<p>Yes. The venue has step-free access and accessible restrooms. Contact us if you need assistance.</p>' },
      { category: 'Schedule', question: 'What time do doors open?', answer: '<p>Doors open one hour before the start time shown on your ticket.</p>' },
    ],
  },
];
