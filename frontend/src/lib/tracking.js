const isBrowser = () => typeof window !== 'undefined';

export const generateEventId = () => {
  return `graduation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Ambil fbc & fbp dari cookie atau localStorage
const getCookie = (name) => {
  if (!isBrowser()) return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : undefined;
};

const getFbc = () => {
  if (!isBrowser()) return undefined;
  return getCookie('_fbc') || localStorage.getItem('fbc') || undefined;
};

const getFbp = () => {
  if (!isBrowser()) return undefined;
  return getCookie('_fbp') || localStorage.getItem('fbp') || undefined;
};

// Helper: Memecah Nama Lengkap otomatis jadi Nama Depan & Belakang
const splitName = (fullName = "") => {
  const cleanName = fullName.trim().replace(/\s+/g, " ");
  if (!cleanName) return { fn: "", ln: "" };
  
  const parts = cleanName.split(" ");
  const fn = parts[0] || "";
  const ln = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return { fn, ln };
};

const metaTrack = (event, event_id, params = {}, userData = {}) => {
  if (!isBrowser()) return;

  const finalUserData = {
    ...userData,
    fbc: getFbc(),
    fbp: getFbp(),
  };

  // Pisahkan nilai value dan currency agar terbaca sistem iklan untuk ROAS
  const monetaryValue = params.amount_paid || params.value;
  
  const payload = {
    segment: 'graduation',
    ...params,
    ...(monetaryValue ? { value: Number(monetaryValue), currency: 'IDR' } : {}),
    user_data: finalUserData,
  };

  window.fbq?.('track', event, payload, { eventID: event_id });
};

export const gaTrack = (event, params = {}) => {
  if (!isBrowser()) return;
  window.gtag?.('event', event, {
    event_category: 'graduation',
    ...params,
  });
};

export const trackWA = (label = 'unknown', extra = {}, wa = '') => {
  const event_id = generateEventId();
  const userData = wa ? { ph: wa } : {};

  metaTrack('Contact', event_id, {
    content_name: `WA_graduation_${label}`,
    ...extra,
  }, userData);

  gaTrack('click_whatsapp', { event_label: label, ...extra });
};

// Digunakan untuk form minta pricelist / konsultasi di Landing Page (Bio IG)
export const trackLead = (label = 'form_submit', extra = {}, customerData = {}) => {
  const event_id = generateEventId();
  const { fn, ln } = splitName(customerData.full_name);

  const userData = {
    ph: customerData.whatsapp,
    em: customerData.email,
    fn: fn,
    ln: ln,
  };

  metaTrack('Lead', event_id, {
    content_name: `Lead_graduation_${label}`,
    ...extra,
  }, userData);

  gaTrack('generate_lead', { event_label: label, ...extra });
  return event_id;
};

// [BARU] Digunakan khusus untuk Form Booking DP agar Meta tahu ini adalah event 'Purchase' (Pembelian/DP)
export const trackPurchase = (label = 'booking_dp', extra = {}, customerData = {}) => {
  const event_id = generateEventId();
  const { fn, ln } = splitName(customerData.full_name);

  const userData = {
    ph: customerData.whatsapp,
    em: customerData.email,
    fn: fn,
    ln: ln,
  };

  metaTrack('Purchase', event_id, {
    content_name: `Purchase_graduation_${label}`,
    content_type: 'product',
    ...extra,
  }, userData);

  gaTrack('purchase', { event_label: label, ...extra });
  return event_id;
};
