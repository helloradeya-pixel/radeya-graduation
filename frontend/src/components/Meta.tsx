import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { NextSeo } from 'next-seo';

type IMetaProps = {
  title: string;
  description: string;
  canonical?: string;
  addPixelId?: string;
};

const Meta = (props: IMetaProps) => {
  const router = useRouter();
  const MAIN_PIXEL_ID = '804715912719122';
  
  const activePixelId = props.addPixelId || MAIN_PIXEL_ID;

  useEffect(() => {
    const getCookie = (name: string) => {
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

  return (
    <>
      <Head>
        <meta charSet="UTF-8" key="charset" />
        <meta name="viewport" content="width=device-width,initial-scale=1" key="viewport" />

        {/* Favicons */}
        <link rel="apple-touch-icon" href={`${router.basePath}/apple-touch-icon.png`} key="apple" />
        <link rel="icon" type="image/png" sizes="32x32" href={`${router.basePath}/favicon-32x32.png`} key="icon32" />
        <link rel="icon" type="image/png" sizes="16x16" href={`${router.basePath}/favicon-16x16.png`} key="icon16" />
        <link rel="icon" href={`${router.basePath}/favicon.ico`} key="favicon" />

        {/* META PIXEL */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');

              fbq('init', '${activePixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img height="1" width="1" style={{display: 'none'}}
            src={`https://www.facebook.com/tr?id=${activePixelId}&ev=PageView&noscript=1`}
          />
        </noscript>
      </Head>

      <NextSeo
        title={props.title}
        description={props.description}
        canonical={props.canonical}
        openGraph={{
          title: props.title,
          description: props.description,
          url: props.canonical,
          locale: 'id_ID',
          site_name: 'Radeyaphoto Booking',
        }}
      />
    </>
  );
};

export { Meta };
