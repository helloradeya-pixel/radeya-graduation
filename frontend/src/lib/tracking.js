const isBrowser = () => typeof window !== 'undefined';

// 1. Helper untuk merapikan nomor HP ke standar E.164 Meta (628xxx)
export const formatPhone = (phone) => {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

// 2. Generator Event ID dengan fallback
export const generateEventId = (uniqueKey) => {
  if (uniqueKey) return `graduation_${uniqueKey}`;
  return `graduation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const metaTrack = (event, event_id, params = {}, customerData = {}) => {
  if (!isBrowser()) return;

  const monetaryValue = params.amount_paid || params.value;
  
  const payload = {
    segment: 'graduation',
    ...params,
    ...(monetaryValue ? { value: Number(monetaryValue), currency: 'IDR' } : {}),
  };

  // 3. Tangkap data pelanggan untuk Advanced Matching Meta Pixel
  const cleanPh = customerData.ph ? formatPhone(customerData.ph) : undefined;
  const cleanEm = customerData.em ? String(customerData.em).toLowerCase().trim() : undefined;
  const cleanFn = customerData.fn ? String(customerData.fn).toLowerCase().trim() : undefined;
  const cleanLn = customerData.ln ? String(customerData.ln).toLowerCase().trim() : undefined;

  // Jika ada data identitas, re-init Advanced Matching ke Pixel agar Meta membaca No HP & Email
  if (cleanEm || cleanPh || cleanFn) {
    window.fbq?.('init', '804715912719122', {
      em: cleanEm,
      ph: cleanPh,
      fn: cleanFn,
      ln: cleanLn,
    });
  }

  // Parameter ke-4 khusus untuk eventID agar deduplikasi CAPI 100% klop dengan backend
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
  }, customerData);

  gaTrack('generate_lead', { event_label: label, ...extra, ...customerData });
  return event_id;
};

export const trackPurchase = (label = 'booking_dp', extra = {}, customerData = {}, options = {}) => {
  // Gunakan eventID yang dipass dari BookingPage (invoice_number / event_id)
  const event_id = options?.eventID || generateEventId();

  metaTrack('Purchase', event_id, {
    content_name: `Purchase_graduation_${label}`,
    content_type: 'product',
    ...extra,
  }, customerData);

  gaTrack('purchase', { event_label: label, ...extra, ...customerData });
  return event_id;
};
