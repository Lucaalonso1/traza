import { Geist, Geist_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import Footer from "@/components/Footer";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
// Solo para la palabra de la intro
const intro = Inter_Tight({ subsets: ["latin"], weight: ["600", "900"], variable: "--font-intro" });


export const metadata = {
  title: "Traza — La comunidad de esquiadores",
  description:
    "Spots, rutas fuera de pista y clips de cada estación, compartidos por quienes las esquían. Y un asesor con IA para elegir tus esquís.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080706" },
    { media: "(prefers-color-scheme: light)", color: "#f5f1ec" },
  ],
};

// Aplica el tema guardado (o el del sistema) antes de pintar, sin destellos
const themeGate = `try{var q=new URLSearchParams(location.search).get('tema');var t=q==='claro'?'light':q==='oscuro'?'dark':localStorage.getItem('traza.theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}try{if(sessionStorage.getItem('traza.intro')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('intro-seen')}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${intro.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeGate }} />
      </head>
      <body>
        <AuthProvider>
          <div className="ambient" aria-hidden="true" />
          <SmoothScroll />
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <Nav />
          <main id="contenido">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
