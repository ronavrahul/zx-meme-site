// ViralMemeSite_starter.jsx
// Single-file starter page (use as pages/index.js in Next.js or adapt to /app)
// Dependencies to install:
// npm i next react react-dom tailwindcss framer-motion @lottiefiles/react-lottie-player jspdf html2canvas react-chartjs-2 chart.js react-icons

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import { FiSun, FiMoon } from 'react-icons/fi';

// Lottie Player dynamically imported to avoid SSR issues in Next.js
const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), { ssr: false });

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

// ------- Demo dataset (replace/integrate with Sanity + Analytics) -------
const DEMO_METRICS = {
  totals: {
    posts: 1248,
    monthlyViews: 1_250_000,
    followers: { instagram: 185000, x: 210000, youtube: 42000 },
    engagementRate: 4.7
  },
  timeseries: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    views: [80000, 95000, 120000, 150000, 180000, 210000, 240000, 250000]
  },
  topPosts: [
    { id: 'p1', title: 'When Mondays hit', views: 450000, thumb: '/placeholders/1.jpg' },
    { id: 'p2', title: 'That plot twist', views: 320000, thumb: '/placeholders/2.jpg' },
    { id: 'p3', title: 'Relatable AF', views: 210000, thumb: '/placeholders/3.jpg' }
  ]
};

// ---------- Utility: format numbers ----------
const nf = (n) => n.toLocaleString();

export default function ViralMemeHome() {
  const [theme, setTheme] = useState('dark');
  const [timeframe, setTimeframe] = useState('30');
  const mediaKitRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Chart config (animated draw)
  const chartData = {
    labels: DEMO_METRICS.timeseries.labels,
    datasets: [
      {
        label: 'Monthly Views',
        data: DEMO_METRICS.timeseries.views,
        fill: false,
        tension: 0.3,
        pointRadius: 3
      }
    ]
  };

  const chartOptions = {
    animation: { duration: 1200, easing: 'easeOutQuart' },
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => nf(v) } } }
  };

  // Robust PDF generator for Media Kit
  const generatePDF = async () => {
    // Prevent multiple clicks
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // Ensure code runs only in browser
      if (typeof window === 'undefined') {
        console.warn('generatePDF called on server — skipping.');
        setIsGenerating(false);
        return;
      }

      const el = mediaKitRef.current;
      if (!el) {
        // This is the critical check to avoid the "reading '_' of null" style error.
        console.error('Media kit element not mounted (mediaKitRef.current is null).');
        alert('Media kit not ready. Please try again after the page loads.');
        setIsGenerating(false);
        return;
      }

      // Dynamically import html2canvas to avoid SSR bundling issues
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      // Some browsers or html2canvas may not render elements off-screen correctly.
      // Make the mediaKit element visible temporarily and clone it into a mounted container.
      const clone = el.cloneNode(true);
      // Create a container visible and offscreen (but in DOM flow) so html2canvas can measure styles.
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = el.offsetWidth ? `${el.offsetWidth}px` : '800px';
      container.style.height = el.offsetHeight ? `${el.offsetHeight}px` : 'auto';
      container.style.overflow = 'visible';
      container.style.background = window.getComputedStyle(el).background || '#fff';
      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait a frame so browser paints cloned content and fonts load
      await new Promise((res) => requestAnimationFrame(res));

      // Use html2canvas on the cloned element
      const canvas = await html2canvas(clone, { scale: 2, useCORS: true });
      if (!canvas) throw new Error('html2canvas returned null canvas');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      // Wrap in try/catch because getImageProperties can sometimes fail on corrupted data URIs
      let imgProps;
      try {
        imgProps = pdf.getImageProperties(imgData);
      } catch (err) {
        console.warn('jsPDF.getImageProperties failed, skipping property read, continuing with default sizing.', err);
        // Fallback: draw with default A4 width and approximate height
        const pdfWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdf.internal.pageSize.getHeight());
        pdf.save('media-kit.pdf');
        document.body.removeChild(container);
        setIsGenerating(false);
        return;
      }

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('media-kit.pdf');

      // Cleanup cloned container
      document.body.removeChild(container);
    } catch (err) {
      console.error('generatePDF error:', err);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Smooth-scroll helper
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Head>
        <title>ZX Meme — More entertainment than OTT</title>
        <meta name="description" content="🎬 More entertainment than OTT | 🎗️ Viral • Memes • Trends • Hype — Public analytics & media kit" />
        <meta property="og:title" content="ZX Meme — More entertainment than OTT" />
        <meta property="og:description" content="Public metrics, media kit and sponsor contact for a viral meme brand" />
        <meta property="og:image" content="/og-preview.png" />
      </Head>

      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-500">
        {/* Nav */}
        <header className="sticky top-0 z-40 backdrop-blur-sm bg-white/60 dark:bg-black/60 border-b border-transparent dark:border-neutral-800">
          <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('hero')}>
              <div className="w-10 h-10 flex items-center justify-center bg-red-600 text-white font-bold rounded">ZX</div>
              <div>
                <div className="font-extrabold">ZX Meme</div>
                <div className="text-xs opacity-70">More entertainment than OTT</div>
              </div>
            </div>

            <nav className="flex items-center gap-4">
              <button onClick={() => scrollTo('stats')} className="text-sm opacity-80">Stats</button>
              <button onClick={() => scrollTo('portfolio')} className="text-sm opacity-80">Portfolio</button>
              <button onClick={() => scrollTo('contact')} className="text-sm opacity-80">Contact</button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="p-2 rounded">
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
              </button>
            </nav>
          </div>
        </header>

        {/* HERO */}
        <section id="hero" className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-20 px-6">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">ZX Meme</h1>
              <p className="mt-4 text-lg opacity-80">🎬 More entertainment than OTT | 🎗️ Viral • Memes • Trends • Hype</p>

              <div className="mt-6 flex gap-3">
                <button onClick={() => scrollTo('stats')} className="px-5 py-3 bg-red-600 rounded text-white font-semibold shadow hover:scale-[1.02] transform transition">View Live Stats</button>
                <button onClick={() => scrollTo('contact')} className="px-5 py-3 border rounded font-semibold hover:bg-white/5">Work with us</button>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-sm">
                  <div className="text-xs opacity-70">Total posts</div>
                  <div className="text-2xl font-bold">{DEMO_METRICS.totals.posts}</div>
                </div>
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg shadow-sm">
                  <div className="text-xs opacity-70">Monthly views</div>
                  <div className="text-2xl font-bold">{nf(DEMO_METRICS.totals.monthlyViews)}</div>
                </div>
              </div>

            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="rounded-2xl bg-gradient-to-br from-neutral-100 to-white dark:from-neutral-900 dark:to-black p-6 shadow-2xl">
                  {/* Lottie Player is dynamically imported to avoid SSR errors */}
                  <Player autoplay loop src="https://assets4.lottiefiles.com/packages/lf20_jcikwtux.json" style={{ height: 220, width: '100%' }} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* subtle parallax shapes */}
          <div className="pointer-events-none absolute -right-20 top-10 opacity-20">
            <Player src="https://assets2.lottiefiles.com/packages/lf20_touohxv0.json" autoplay loop style={{ width: 300 }} />
          </div>
        </section>

        {/* STATS SUMMARY */}
        <section id="stats" className="max-w-6xl mx-auto py-12 px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ scale: 1.02 }} className="p-6 rounded-2xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur border border-neutral-200 dark:border-neutral-800">
              <div className="text-xs opacity-70">Followers (total)</div>
              <div className="text-3xl font-bold">{nf(DEMO_METRICS.totals.followers.instagram + DEMO_METRICS.totals.followers.x + DEMO_METRICS.totals.followers.youtube)}</div>
              <div className="mt-2 text-sm opacity-80">IG {nf(DEMO_METRICS.totals.followers.instagram)} • X {nf(DEMO_METRICS.totals.followers.x)} • YT {nf(DEMO_METRICS.totals.followers.youtube)}</div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="p-6 rounded-2xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur border border-neutral-200 dark:border-neutral-800">
              <div className="text-xs opacity-70">Engagement Rate</div>
              <div className="text-3xl font-bold">{DEMO_METRICS.totals.engagementRate}%</div>
              <div className="mt-2 text-sm opacity-80">Average likes/comments per post</div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="p-6 rounded-2xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur border border-neutral-200 dark:border-neutral-800">
              <div className="text-xs opacity-70">Top Viral</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {DEMO_METRICS.topPosts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-neutral-200 rounded overflow-hidden flex items-center justify-center text-sm">IMG</div>
                    <div>
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="text-xs opacity-70">{nf(p.views)} views</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Chart + timeframe selector */}
          <div className="mt-8 bg-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Views over time</h3>
              <div className="flex items-center gap-2">
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="bg-transparent border px-3 py-1 rounded">
                  <option value="7">7d</option>
                  <option value="30">30d</option>
                  <option value="90">90d</option>
                  <option value="365">12mo</option>
                </select>
                <button onClick={() => generatePDF()} disabled={isGenerating} className="px-3 py-1 bg-red-600 text-white rounded">
                  {isGenerating ? 'Generating...' : 'Download Media Kit'}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </section>

        {/* PORTFOLIO / CASE STUDIES */}
        <section id="portfolio" className="max-w-6xl mx-auto py-12 px-6">
          <h2 className="font-bold text-2xl">Case Studies</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border">
                <div className="h-36 bg-neutral-200 rounded mb-4 flex items-center justify-center">Campaign {i} image</div>
                <div className="font-semibold">Brand collab: Product X</div>
                <div className="text-sm opacity-70 mt-2">Result: {nf(120000 * i)} views • CTR 1.8% • Engagement up</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* LATEST POSTS / GALLERY */}
        <section className="max-w-6xl mx-auto py-12 px-6">
          <h2 className="font-bold text-2xl">Latest Posts</h2>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div key={i} whileHover={{ scale: 1.03 }} className="h-40 bg-neutral-200 rounded-lg flex items-center justify-center">Post {i + 1}</motion.div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="max-w-4xl mx-auto py-12 px-6">
          <h2 className="font-bold text-2xl">Work with us</h2>
          <p className="mt-2 opacity-80">Fill this form and we’ll share our media kit + campaign options.</p>

          <form className="mt-6 grid grid-cols-1 gap-4">
            <input placeholder="Company / Brand" className="p-3 rounded border bg-transparent" />
            <input placeholder="Email" className="p-3 rounded border bg-transparent" />
            <textarea placeholder="Short campaign brief" className="p-3 rounded border bg-transparent" rows={4} />
            <div className="flex items-center gap-3">
              <input type="checkbox" id="agree" />
              <label htmlFor="agree" className="text-sm opacity-80">I agree to share campaign details and receive emails.</label>
            </div>
            <button type="button" className="px-5 py-3 bg-red-600 text-white rounded">Send Request</button>
          </form>
        </section>

        {/* Media Kit DOM: keep mounted and accessible to html2canvas. We avoid using display:none; instead keep it visually hidden but measurable */}
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '0', overflow: 'visible', pointerEvents: 'none' }}>
          <div ref={mediaKitRef} style={{ width: 800, padding: 24, background: '#fff', color: '#000', pointerEvents: 'auto' }}>
            <h1>ZX Meme — Media Kit</h1>
            <p>🎬 More entertainment than OTT • 🎗️ Viral • Memes • Trends • Hype</p>
            <hr />
            <p>Total posts: {DEMO_METRICS.totals.posts}</p>
            <p>Monthly views: {nf(DEMO_METRICS.totals.monthlyViews)}</p>
            <p>Followers: IG {nf(DEMO_METRICS.totals.followers.instagram)} • X {nf(DEMO_METRICS.totals.followers.x)} • YT {nf(DEMO_METRICS.totals.followers.youtube)}</p>
          </div>
        </div>

        <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-12">
          <div className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© {new Date().getFullYear()} ZX Meme</div>
            <div className="text-sm opacity-70">Privacy • Terms • Cookie settings</div>
          </div>
        </footer>
      </div>

      {/* Styles: minimal Tailwind utility requires configuration in a Next.js project -- this file assumes Tailwind is active */}
    </>
  );
}

/*
HOW TO USE:
1. Create Next.js app: npx create-next-app@latest
2. Install dependencies listed at top.
3. Configure Tailwind (https://tailwindcss.com/docs/guides/nextjs)
4. Create pages/index.js and paste this component (rename export default accordingly)
5. Add public placeholders (images, og-preview.png) and Lottie URLs are used for demo.
6. Replace DEMO_METRICS with data pulled from Sanity or your analytics API.
7. For media-kit PDF, you can replace jsPDF/html2canvas with server-side Puppeteer for higher-quality PDFs.
8. Accessibility: respect prefers-reduced-motion CSS or toggles in the UI.

DEBUG NOTES (what changed to fix the error):
- The PDF generation now dynamically imports html2canvas to avoid SSR bundling/runtime issues.
- The function checks that mediaKitRef.current exists and shows a helpful message if not.
- Instead of calling html2canvas on an off-DOM hidden element, it clones the element into a temporary offscreen container appended to document.body. This ensures measurements/styles are available to html2canvas and prevents null pointer errors.
- Added try/catch and user-friendly alerts + console logs to help debug future failures.
- Player (Lottie) is dynamically imported to prevent SSR errors in Next.js.
*/
