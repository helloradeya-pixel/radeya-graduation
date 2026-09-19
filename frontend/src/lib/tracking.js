const isBrowser = () => typeof window !== 'undefined';

export const generateEventId = () => {
  return `graduation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const metaTrack = (event, event_id, params = {}) => {
  if (!isBrowser()) return;

  const monetaryValue = params.amount_paid || params.value;
  
  const payload = {
    segment: 'graduation',
    ...params,
    ...(monetaryValue ? { value: Number(monetaryValue), currency: 'IDR' } : {}),
  };

  // Parameter ke-4 khusus untuk eventID agar deduplikasi CAPI 100% berhasil
  window.fbq?.('track', event, payload, { eventID: event_id });
};

export const gaTrack = (event, params = {}) => {
  if (!isBrowser()) return;
  window.gtag?.('event', event, {
    event_category: 'graduation',
    ...params,
  });
};

export const trackWA = (label = 'unknown', extra = {}, customEventId = null) => {
  const event_id = customEventId || generateEventId();

  metaTrack('Contact', event_id, {
    content_name: `WA_graduation_${label}`,
    ...extra,
  });

  gaTrack('click_whatsapp', { event_label: label, ...extra });
  return event_id;
};

export const trackLead = (label = 'form_submit', extra = {}, customerData = {}) => {
  const event_id = generateEventId();

  metaTrack('Lead', event_id, {
    content_name: `Lead_graduation_${label}`,
    ...extra,
    ...customerData, // <-- Menggabungkan identitas ke Pixel Browser
  });

  gaTrack('generate_lead', { event_label: label, ...extra, ...customerData });
  return event_id;
};

export const trackPurchase = (label = 'booking_dp', extra = {}, customerData = {}, options = {}) => {
  // Gunakan eventID yang dipass dari BookingPage agar 100% klop dengan CAPI
  const event_id = options?.eventID || generateEventId();

  metaTrack('Purchase', event_id, {
    content_name: `Purchase_graduation_${label}`,
    content_type: 'product',
    ...extra,
    ...customerData, // <-- Menggabungkan identitas ke Pixel Browser
  });

  gaTrack('purchase', { event_label: label, ...extra, ...customerData });
  return event_id;
};
