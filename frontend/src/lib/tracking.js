const isBrowser = () => typeof window !== 'undefined';

// Helper: Membuat ID unik untuk deduplikasi Meta (Pixel + CAPI)
export const generateEventId = () => {
  return `graduation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Helper: Ambil FBC (Facebook Click ID) dari cookie atau localStorage
const getFbc = () => {
  if (!isBrowser()) return undefined;
  const match = document.cookie.match(/_fbc=([^;]+)/);
  return match ? match[1] : localStorage.getItem('fbc') || undefined;
};

const metaTrack = (event, event_id, params = {}, userData = {}) => {
  if (!isBrowser()) return;

  const finalUserData = {
    ...userData,
    fbc: getFbc(),
  };

  const payload = {
    segment: 'graduation',
    ...params,
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

export const trackLead = (label = 'form_submit', extra = {}, wa = '') => {
  const event_id = generateEventId();
  const userData = wa ? { ph: wa } : {};

  metaTrack('Lead', event_id, {
    content_name: `Lead_graduation_${label}`,
    ...extra,
  }, userData);

  gaTrack('generate_lead', { event_label: label, ...extra });
  
  return event_id;
};
