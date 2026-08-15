/* eslint-disable no-unused-expressions */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function Meta({ title, description, addPixelId }) {
  const location = useLocation();
  const MAIN_PIXEL_ID = '804715912719122';
  const activePixelId = addPixelId || MAIN_PIXEL_ID;

  // Tangkap fbc & fbp ke localStorage
  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const fbc = getCookie('_fbc');
    const fbp = getCookie('_fbp');

    if (fbc) localStorage.setItem('fbc', fbc);
    if (fbp) localStorage.setItem('fbp', fbp);
  }, []);

  // Injeksi Meta Pixel ke browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (title) document.title = title;
    if (description) {
      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    if (!window.fbq) {
      !(function(f,b,e,v,n,t,s) {
        if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      window.fbq('init', activePixelId);
    }
    
    window.fbq('track', 'PageView');
  }, [location, activePixelId, title, description]);

  return null;
}
