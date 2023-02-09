import '../public/styles.css';
import { Analytics } from '@vercel/analytics/react';

export default function Turrero({ Component, pageProps }) {
    return <>
    <Component {...pageProps} />
    <Analytics />
  </>
}