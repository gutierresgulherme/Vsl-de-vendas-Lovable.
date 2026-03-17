import { useEffect, useRef, lazy, Suspense, useCallback, useState } from "react";
import { Check, Play, X, Clock } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { getCurrentVSLInfo, VSLVariant } from "@/lib/vslService";
import { YouTubePlayer, isYouTubeUrl, extractYouTubeId } from "@/components/YouTubePlayer";
import lovableIcon from "@/assets/lovable-icon-heart.jpg";
import lovableInfinitoTitle from "@/assets/lovable-infinito-title.png";
import feedback1 from "@/assets/feedback-1.png";
import feedback2 from "@/assets/feedback-2.png";
import feedback3 from "@/assets/feedback-3.png";
import chatgptBonus from "@/assets/chatgpt-bonus.png";
import canvaBonus from "@/assets/canva-bonus.png";
import garantia7dias from "@/assets/garantia-7dias.png";
import { initPageSession, setupButtonTracking, trackVideoEvent } from "@/lib/analytics";

const db = supabasePublic as any;

// Lazy load components
const PricingCard = lazy(() => import("@/components/PricingCard").then(m => ({ default: m.PricingCard })));
const FAQItem = lazy(() => import("@/components/FAQItem").then(m => ({ default: m.FAQItem })));

const Index = () => {
    // --- States ---
    const [vslData, setVslData] = useState<VSLVariant | null>(null);
    const [currency, setCurrency] = useState("BRL");
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(true);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [showFallbackPlay, setShowFallbackPlay] = useState(false);
    const [checkoutLinks, setCheckoutLinks] = useState<Record<string, string>>({
        br_prata: 'https://www.sharckpay.vip/checkout/lovable-infinito-17-90-p36m',
        br_gold: 'https://www.sharckpay.vip/checkout/lovable-infinito-27-90-y3s5',
        usa_prata: 'https://www.sharckpay.vip/checkout/destrave-seu-lovable-17-90-sr88',
        usa_gold: 'https://www.sharckpay.vip/checkout/destrave-seu-lovable-27-90-5s18',
        // Links exclusivos para metodo-lovable-infinito.vip
        infinito_prata: 'https://www.sharckpay.vip/checkout/lovable-infinito-17-90-p36m',
        infinito_gold: 'https://www.sharckpay.vip/checkout/lovable-infinito-27-90-y3s5',
    });
    const [timeLeft, setTimeLeft] = useState({ minutes: 5, seconds: 0 });

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoTrackingRef = useRef<{ lastTrackedPercent: number }>({ lastTrackedPercent: 0 });
    const unmuteListenersAdded = useRef(false);

    // --- Initial Data Fetching ---
    useEffect(() => {
        const initPage = async () => {
            try {
                console.log("[INDEX] Inicializando página...");

                // 1. Get Active VSL & Domain Config
                const { vsl, isActive: domainActive, currency: domainCurrency } = await getCurrentVSLInfo();

                setIsActive(domainActive);
                setCurrency(domainCurrency);

                if (vsl) {
                    setVslData(vsl);
                    try {
                        await initPageSession();
                        
                        // 🟢 UTMIFY: Disparo manual de PageView para garantir rastreamento
                        const utmifyPixel = (window as any).Utmify || (window as any).__utmify || (window as any).utmify;
                        if (utmifyPixel?.track) {
                            utmifyPixel.track('pageView');
                            console.log("[UTMIFY] PageView disparado manualmente");
                        } else {
                            // Fallback caso o script ainda esteja carregando
                            setTimeout(() => {
                                const retryUtmify = (window as any).Utmify || (window as any).__utmify || (window as any).utmify;
                                if (retryUtmify?.track) {
                                    retryUtmify.track('pageView');
                                    console.log("[UTMIFY] PageView disparado manualmente (após delay)");
                                }
                            }, 2000);
                        }
                    } catch (analyticsErr) {
                        console.warn("[Analytics] Initialization failed:", analyticsErr);
                    }
                } else {
                    setVideoError("Nenhuma VSL encontrada.");
                }

                // 2. Load Checkout Links from DB
                // Links de checkout são definidos manualmente (sharckpay.vip) — não sobrescrever com dados do banco
                console.log("[INDEX] Links de checkout fixos (sharckpay.vip) — ignorando banco de dados");
            } catch (err) {
                console.error("Error initializing page:", err);
            } finally {
                setLoading(false); if (!vslData && !loading) setVslData({ video_url: 'https://eidcxqxjmraargwhrdai.supabase.co/storage/v1/object/public/videos/vsl-v2.mp4' } as any);
            }
        };

        initPage();
        setupButtonTracking();
    }, []);

    // --- Video Player Logic ---
    useEffect(() => {
        if (!vslData?.video_url || !videoRef.current) return;

        const videoElement = videoRef.current;
        console.log("[VSL] Attempting to load video:", vslData.video_url);

        const initPlayer = async () => {
            try {
                if (videoElement.paused) {
                    videoElement.play().catch(e => console.warn("[VSL] Play deferred", e));
                }

                // Shaka Player apenas para HLS (.m3u8)
                if (vslData.video_url?.includes('.m3u8')) {
                    const shaka = await import('shaka-player/dist/shaka-player.ui.js').then(m => m.default);
                    if (shaka.Player.isBrowserSupported()) {
                        const player = new shaka.Player(videoElement);
                        await player.load(vslData.video_url!);
                    }
                }
            } catch (e: any) {
                console.error("Video load error", e);
                setVideoError(`Erro ao carregar vídeo: ${e.message}`);
            }
        };

        initPlayer();

        // Sound Unlocker
        if (!unmuteListenersAdded.current) {
            const unlockSound = () => {
                if (videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.play().catch(() => { });
                }
                document.removeEventListener('click', unlockSound);
                document.removeEventListener('touchstart', unlockSound);
                document.removeEventListener('scroll', unlockSound);
            };
            document.addEventListener('click', unlockSound);
            document.addEventListener('touchstart', unlockSound);
            document.addEventListener('scroll', unlockSound);
            unmuteListenersAdded.current = true;
        }
    }, [vslData?.video_url]);

    // Fallback: Check if video is playing
    useEffect(() => {
        const checkPlaying = setInterval(() => {
            if (videoRef.current && videoRef.current.paused && vslData?.video_url && !videoError) {
                setShowFallbackPlay(true);
            } else if (videoRef.current && !videoRef.current.paused) {
                setShowFallbackPlay(false);
            }
        }, 3000);
        return () => clearInterval(checkPlaying);
    }, [vslData?.video_url, videoError]);
    
    // Countdown Timer logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.minutes === 0 && prev.seconds === 0) {
                    return { minutes: 5, seconds: 0 }; // Restart loop or stop
                }
                if (prev.seconds === 0) {
                    return { minutes: prev.minutes - 1, seconds: 59 };
                }
                return { ...prev, seconds: prev.seconds - 1 };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);


    // --- Video Tracking Handler ---
    const handleVideoTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        const percent = Math.floor((video.currentTime / video.duration) * 100);
        const last = videoTrackingRef.current.lastTrackedPercent;

        if ([25, 50, 75, 95].some(p => percent >= p && last < p)) {
            trackVideoEvent('progress', video.currentTime, video.duration);
            videoTrackingRef.current.lastTrackedPercent = percent;
        }
    };

    // --- Helper Functions ---
    const getCurrentDate = () => {
        return new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    };

    const getCheckoutLink = useCallback((plan: 'prata' | 'gold') => {
        const hostname = window.location.hostname;
        // Domínio metodo-lovable-infinito.vip → links exclusivos
        if (hostname.includes('metodo-lovable-infinito.vip')) {
            return checkoutLinks[plan === 'prata' ? 'infinito_prata' : 'infinito_gold'];
        }
        // Domínio lovable-app.vip → links USA
        if (hostname.includes('lovable-app.vip')) {
            return checkoutLinks[plan === 'prata' ? 'usa_prata' : 'usa_gold'];
        }
        // Padrão (BR / localhost / outros)
        return checkoutLinks[plan === 'prata' ? 'br_prata' : 'br_gold'];
    }, [checkoutLinks]);

    const handleCheckoutClick = async (buttonId: string, baseUrl: string) => {
        try {
            const url = new URL(baseUrl);
            const currentParams = new URLSearchParams(window.location.search);
            const isUSA = window.location.hostname.includes('lovable-app.vip');
            const currency = isUSA ? 'USD' : 'BRL';

            const cleanUtm = (val: string | null) => {
                if (!val) return '';
                const fbclidPattern = /j[A-Z][a-z][0-9a-f]{16,}/;
                return val.replace(fbclidPattern, '').split('?')[0].split('#')[0].trim();
            };

            // Lista de UTMs e parâmetros de rastreio
            const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];

            utmKeys.forEach(key => {
                const value = currentParams.get(key) || sessionStorage.getItem(key);
                if (value) {
                    url.searchParams.set(key, cleanUtm(value));
                }
            });

            // 🔴 UTMIFY: Disparar evento initiateCheckout ANTES de redirecionar
            const utmifyPixel = (window as any).Utmify || (window as any).__utmify || (window as any).utmify;
            if (utmifyPixel?.track) {
                try {
                    utmifyPixel.track('initiateCheckout', {
                        value: 0,
                        currency: currency,
                    });
                    console.log(`[UTMIFY] initiateCheckout disparado (${currency}) - botão:`, buttonId);
                } catch (pixelErr) {
                    console.warn("[UTMIFY] Erro ao disparar initiateCheckout:", pixelErr);
                }
            } else {
                // Fallback: tentar via pixel global ou pixelId
                try {
                    const w = window as any;
                    if (w.PixelManager?.track) {
                        w.PixelManager.track('initiateCheckout', { currency: currency });
                    }
                } catch(e) { /* silent */ }
            }

            console.log(`[CHECKOUT] [${currency}] Redirecionando para:`, url.toString());

            // Pequeno delay para garantir que o evento foi enviado antes do redirect
            setTimeout(() => {
                window.location.href = url.toString();
            }, 150);
        } catch (err) {
            console.error("[CHECKOUT] Erro ao processar URL:", err);
            window.location.href = baseUrl;
        }
    };

    if (!isActive) return <div className="fixed inset-0 bg-black z-[9999]" />;

    const HEADLINE = vslData?.headline || "VOCÊ AINDA PAGA PRA USAR O LOVABLE?";
    const PRICE_PRATA = 'R$17,90';
    const PRICE_GOLD = 'R$27,90';
    const OLD_PRICE = 'R$49,90';

    return (
        <div className="min-h-screen bg-gradient-to-br from-[hsl(240,10%,3.9%)] via-[hsl(267,50%,10%)] to-[hsl(190,50%,10%)] text-foreground relative">
            <div className="bg-[hsl(0,100%,50%)] py-2 text-center sticky top-0 z-50 shadow-[0_8px_30px_rgba(255,0,0,0.5)] animate-pulse-glow">
                <p className="text-white font-bold text-xs md:text-sm">🎯 DESCONTO VÁLIDO SOMENTE HOJE — {getCurrentDate()}</p>
            </div>

            <div className="fixed top-2 right-0 w-8 h-8 z-[100] cursor-default opacity-0 hover:cursor-pointer" onClick={() => window.location.href = '/login'} />

            {/* HERO SECTION */}
            <section className="relative pt-12 pb-6 px-6 md:px-4 overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="mb-8 transform hover:scale-105 transition-transform duration-700">
                        <img src={lovableInfinitoTitle} alt="Lovable Infinito" className="w-[60%] md:w-[75%] max-w-[320px] md:max-w-[440px] mx-auto rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.1)] filter brightness-110" />
                    </div>

                    <div className="space-y-4 mb-10">
                        <h1 className="text-3xl md:text-6xl font-[900] uppercase tracking-tight leading-[0.95] perspective-1000">
                            <span className="block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                {HEADLINE.split('?')[0]}?
                            </span>
                            <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent filter saturate-150 drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                                DESTRAVE O SEU
                            </span>
                        </h1>
                        <p className="text-lg md:text-2xl font-light text-gray-400 max-w-2xl mx-auto leading-relaxed tracking-wider font-orbitron">
                            VOCÊ ESTAVA ESPERANDO <span className="text-rose-500 font-black border-b-2 border-rose-500/50 italic">VIRAR O DIA</span> PARA CONTINUAR SEU PROJETO?
                        </p>
                    </div>

                    <div className="relative inline-block group mb-2">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-cyan-600 to-purple-600 rounded-[1.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-all duration-1000"></div>
                        <div className="relative bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[1.2rem] p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                                    <span className="text-[9px] md:text-xs font-black uppercase tracking-[0.4em] text-rose-500">Liberação Instantânea</span>
                                </div>
                                <p className="text-xs md:text-sm text-gray-500 line-through font-medium mb-1">Original: {OLD_PRICE}</p>
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest italic opacity-50">Por apenas</span>
                                        <span className="text-5xl md:text-7xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] tracking-tighter">{PRICE_PRATA}</span>
                                    </div>
                                    <span className="text-[10px] md:text-xs text-emerald-400 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                                        <div className="w-3 h-px bg-emerald-400/50"></div>ACESSO VITALÍCIO<div className="w-3 h-px bg-emerald-400/50"></div>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* VIDEO PLAYER */}
            <section className="pb-12 pt-4 px-6 md:px-4 relative z-0">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent flex-1" />
                        <h2 className="text-sm md:text-base font-bold text-center text-gray-400 uppercase tracking-[0.3em]">Assista à Apresentação</h2>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent flex-1" />
                    </div>

                    {/* YouTube Player (quando URL é do YouTube) */}
                    {vslData?.video_url && isYouTubeUrl(vslData.video_url) ? (
                        <div className="relative w-full max-w-[100%] rounded-2xl overflow-hidden bg-black">
                            {/* Borda decorativa externa estilo PandaVideo */}
                            <div className="absolute -inset-[2px] bg-gradient-to-b from-purple-500/20 via-transparent to-emerald-500/20 rounded-2xl z-[-1]" />
                            <YouTubePlayer
                                videoId={extractYouTubeId(vslData.video_url) || ''}
                                autoPlay={true}
                                onTimeUpdate={(currentTime, duration) => {
                                    const percent = Math.floor((currentTime / duration) * 100);
                                    const last = videoTrackingRef.current.lastTrackedPercent;
                                    if ([25, 50, 75, 95].some(p => percent >= p && last < p)) {
                                        trackVideoEvent('progress', currentTime, duration);
                                        videoTrackingRef.current.lastTrackedPercent = percent;
                                    }
                                }}
                                onPlay={() => {
                                    trackVideoEvent('play', 0, 0);
                                    setShowFallbackPlay(false);
                                }}
                                onPause={() => trackVideoEvent('pause', 0, 0)}
                                onEnded={() => trackVideoEvent('ended', 0, 0)}
                            />
                        </div>
                    ) : (
                        /* Player nativo para vídeos MP4/HLS */
                        <div className="relative w-full max-w-[100%] rounded-xl overflow-hidden shadow-2xl bg-black aspect-video flex items-center justify-center group/video">
                            {loading && !videoError && (
                                <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                        <p className="text-emerald-500 font-orbitron text-xs animate-pulse">PREPARANDO VÍDEO...</p>
                                    </div>
                                </div>
                            )}
                            {showFallbackPlay && !loading && !videoError && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 cursor-pointer group" onClick={() => videoRef.current?.play().then(() => setShowFallbackPlay(false))}>
                                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                                        <Play className="w-10 h-10 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}
                            {videoError && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                                    <p className="text-red-500 font-bold mb-2">⚠️ Eita! O vídeo não carregou.</p>
                                    <p className="text-sm font-mono text-gray-300 mb-4">{videoError}</p>
                                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold">RECARREGAR PÁGINA</button>
                                </div>
                            )}
                            <video
                                key={vslData?.video_url}
                                ref={videoRef}
                                id="vsl-player"
                                src={vslData?.video_url || undefined}
                                autoPlay muted playsInline controls
                                crossOrigin="anonymous"
                                onTimeUpdate={handleVideoTimeUpdate}
                                onPlay={() => setShowFallbackPlay(false)}
                                className="w-full h-auto max-h-[500px] rounded-xl"
                            />
                        </div>
                    )}

                    <div className="flex justify-center mt-8 relative z-10">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-600/50 to-rose-600/50 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-60"></div>
                            <a
                                id="btn-comprar-17-1"
                                href={getCheckoutLink('prata')}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => { e.preventDefault(); handleCheckoutClick('btn-comprar-17-1', getCheckoutLink('prata')); }}
                                className="relative flex items-center justify-center gap-3 w-full max-w-[300px] px-6 py-3.5 rounded-full bg-gradient-to-b from-red-500 to-red-700 border border-white/20 text-white font-black text-base md:text-lg uppercase tracking-tighter shadow-[0_10px_30px_rgba(185,28,28,0.4)] active:scale-95 transition-all duration-300 overflow-hidden"
                            >
                                <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000 group-hover:left-[100%]"></div>
                                <span className="relative z-10 flex flex-col items-center leading-tight">
                                    <span className="block italic text-[9px] opacity-70 tracking-widest mb-0.5">Garanta Agora</span>
                                    QUERO O MÉTODO LOVABLE ILIMITADO
                                    <span className="text-xs font-black text-white/90 drop-shadow-md">POR APENAS {PRICE_PRATA}</span>
                                </span>
                                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse"></div>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* O QUE VOU RECEBER SECTION */}
            <section className="py-12 px-6 md:px-4">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-black text-center text-white mb-8 uppercase italic">
                        O QUE VOU RECEBER:
                    </h2>

                    {/* Grid de 6 benefícios */}
                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-white font-medium">Acesso <span className="text-cyan-400 font-bold">ILIMITADO</span> ao Lovable</span>
                        </div>
                        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-white font-medium">Criar <span className="text-cyan-400 font-bold">SITES E APLICATIVOS</span> ilimitadas com IA</span>
                        </div>
                        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-white font-medium">Sem bloqueio, sem limite, sem trava</span>
                        </div>
                        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-white font-medium">Método testado e aprovado pelos <span className="text-cyan-400 font-bold">GRINGOS</span></span>
                        </div>
                        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-white font-medium">Suporte se tiver qualquer dúvida</span>
                        </div>
                        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-white font-medium">Chegou o fim da palhaçada</span>
                        </div>
                    </div>

                    {/* Caixa de texto explicativo */}
                    <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] border border-white/10 rounded-xl p-6 mb-6">
                        <p className="text-gray-300 text-lg leading-relaxed mb-4">
                            A gente descobriu uma brecha limpa no sistema do Lovable.
                        </p>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            E agora você pode ter acesso completo, vitalício, sem limite de páginas, sem pagar <span className="text-emerald-400 font-bold">NADA</span> todo mês.
                        </p>
                    </div>

                    {/* 3 Destaques finais */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-[#0d1117] border border-cyan-500/30 rounded-xl p-4 text-center">
                            <span className="text-rose-500 font-bold">✦</span>
                            <span className="text-cyan-400 font-bold ml-2">Não precisa cartão<br />internacional</span>
                        </div>
                        <div className="bg-[#0d1117] border border-cyan-500/30 rounded-xl p-4 text-center">
                            <span className="text-rose-500 font-bold">✦</span>
                            <span className="text-cyan-400 font-bold ml-2">Não é pirataria</span>
                        </div>
                        <div className="bg-[#0d1117] border border-cyan-500/30 rounded-xl p-4 text-center">
                            <span className="text-rose-500 font-bold">✦</span>
                            <span className="text-orange-400 font-bold ml-2">Funciona AGORA</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEEDBACK DA GALERA - Prova Social (movido para cá) */}
            <section className="py-8 md:py-12 px-6 md:px-4 bg-black/20">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-center text-white uppercase">FEEDBACK DA GALERA QUE <br /> COMPROU:</h2>
                    <div className="space-y-4">
                        <img src={feedback1} alt="Feedback 1" className="w-full rounded-xl border border-white/10 shadow-lg" />
                        <img src={feedback2} alt="Feedback 2" className="w-full rounded-xl border border-white/10 shadow-lg" />
                        <img src={feedback3} alt="Feedback 3" className="w-full rounded-xl border border-white/10 shadow-lg" />
                    </div>
                </div>
            </section>

            {/* DYNAMIC COPY SECTIONS - 2 TIPOS DE PESSOAS + Timer + Ancoragem */}
            {vslData?.benefits_copy && (
                <section className="py-8 md:py-12 px-6 md:px-4">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-8">O QUE VOU RECEBER:</h2>
                        <div className="whitespace-pre-wrap text-lg text-gray-300 leading-relaxed bg-black/40 p-6 rounded-xl border border-white/10">{vslData.benefits_copy}</div>
                    </div>
                </section>
            )}

            {!vslData?.benefits_copy && (
                <section className="py-8 md:py-12 px-6 md:px-4">
                    <div className="max-w-5xl mx-auto space-y-4">
                        <div className="space-y-12">
                            {/* 2 TYPES SECTION */}
                            <div className="space-y-6">
                                <h2 className="text-2xl md:text-3xl font-black text-center text-white uppercase tracking-tight">
                                    SÓ EXISTEM 2 TIPOS DE PESSOAS AQUI:
                                </h2>
                                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                    <div className="bg-black/40 border-2 border-emerald-500/50 rounded-xl p-6 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                                        <div className="relative z-10 flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-5 h-5 text-white" />
                                            </div>
                                            <p className="text-gray-200 font-medium leading-relaxed">
                                                As que pegam agora esse método e <span className="text-emerald-400 font-bold">desbloqueiam o Lovable de forma ilimitada</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 border-2 border-red-900/30 rounded-xl p-6 relative overflow-hidden group hover:border-red-500/30 transition-colors">
                                        <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
                                        <div className="relative z-10 flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center flex-shrink-0">
                                                <X className="w-5 h-5 text-red-500" />
                                            </div>
                                            <p className="text-gray-400 font-medium leading-relaxed">
                                                As que vão continuar presas no plano gratuito, empacadas nos projetos sem poder testar logo
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PRICE ANCHOR SECTION */}
                            <div className="max-w-3xl mx-auto relative">
                                {/* Red Banner - Timer */}
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-[110%] md:w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 py-2 px-4 shadow-[0_0_20px_rgba(220,38,38,0.5)] z-20 text-center transform -rotate-1 rounded-sm">
                                    <p className="text-white font-black text-xs md:text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                                        <Clock className="w-4 h-4 animate-pulse" />
                                        🔥 OFERTA LOVABLE INFINITO EXPIRA EM: <span className="font-mono text-yellow-300 text-base">{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
                                    </p>
                                </div>

                                <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl p-8 pt-12 md:p-12 mt-8 relative overflow-hidden shadow-2xl">
                                    <div className="space-y-8 relative z-10">
                                        <h3 className="text-xl md:text-2xl font-bold text-center text-gray-200 uppercase">
                                            SE FOSSE PAGAR O PREÇO REAL POR TUDO ISSO...
                                        </h3>

                                        <div className="space-y-4">
                                            {[
                                                { item: "só pra ter acesso ao Lovable", price: "US$20", period: "por mês" },
                                                { item: "pra usar o Gamma PRO sem limitações", price: "US$15", period: "mensais" },
                                                { item: "pra liberar o verdadeiro poder do ChatGPT PRO", price: "US$20", period: "mensais" },
                                                { item: "pra liberar todos os recursos do Canva PRO ANUAL", price: "US$58", period: "mensais" },
                                                // Removed Canva Pro monthly line as it's not in the new request list, kept the one from previous code or just stick to the new list?
                                                // The user request says: "Canva PRO: US$ 15/mês". I will use 15.
                                            ].map((row, i) => {
                                                // Quick fix for the map to match specific values requested if different from array
                                                // Actually I'll just rewrite the array below cleanly.
                                                return null;
                                            })}

                                            <div className="flex items-center gap-3 text-sm md:text-base border-b border-white/5 pb-2">
                                                <span className="text-yellow-500">💰</span>
                                                <p className="text-gray-400 flex-1"><span className="text-red-400 font-bold">US$20</span> por mês só pra ter acesso ao Lovable</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm md:text-base border-b border-white/5 pb-2">
                                                <span className="text-yellow-500">💰</span>
                                                <p className="text-gray-400 flex-1"><span className="text-red-400 font-bold">US$20</span> mensais pra liberar o verdadeiro poder do ChatGPT PRO</p>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm md:text-base border-b border-white/5 pb-2">
                                                <span className="text-yellow-500">💰</span>
                                                <p className="text-gray-400 flex-1"><span className="text-red-400 font-bold">US$15</span> mensais pra liberar todos os recursos do Canva PRO</p>
                                            </div>
                                        </div>

                                        <div className="text-center space-y-2 pt-4 border-t border-white/10">
                                            <p className="text-lg md:text-xl text-white">
                                                Soma total? <span className="text-red-500 font-bold">US$55/mês</span>
                                            </p>
                                            <p className="text-emerald-500 font-bold text-sm">(aprox. R$ 300,00/mês)</p>
                                        </div>

                                        <div className="text-center space-y-4 pt-4">
                                            <p className="text-gray-400 uppercase tracking-widest text-xs">E o que você vai pagar aqui?</p>
                                            <div className="flex flex-col items-center">
                                                <span className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                                    Apenas {PRICE_GOLD}
                                                </span>
                                                <span className="text-yellow-400 font-bold uppercase tracking-widest text-sm mt-2">UMA ÚNICA VEZ.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* CTA Button - Quero Método + 2 Bônus */}
            <div className="flex flex-col items-center py-8 relative z-10 px-6">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/50 to-green-600/50 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-60"></div>
                    <a
                        id="btn-comprar-bonus"
                        href={getCheckoutLink('gold')}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.preventDefault(); handleCheckoutClick('btn-comprar-bonus', getCheckoutLink('gold')); }}
                        className="relative flex items-center justify-center gap-3 w-full max-w-[340px] px-6 py-3.5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700 border border-white/20 text-white font-black text-base md:text-lg uppercase tracking-tight shadow-[0_10px_30px_rgba(5,150,105,0.4)] active:scale-95 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000 group-hover:left-[100%]"></div>
                        <span className="relative z-10 text-center leading-tight">QUERO O MÉTODO + 2 BÔNUS <br /><span className="text-xs font-black text-white/90">E AULA EXCLUSIVA POR {PRICE_GOLD}</span></span>
                    </a>
                </div>
            </div>

            {/* BONUS SECTION */}
            <section className="py-8 md:py-12 px-6 md:px-4">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-4xl font-bold text-center text-white mb-8 uppercase tracking-wider">
                        <span className="text-emerald-400">3 BÔNUS EXCLUSIVOS</span> PARA QUEM ENTRAR HOJE
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6 relative z-10">
                        {/* Bonus 1 - O CÉREBRO */}
                        <div className="group relative bg-gradient-to-br from-[#10a37f]/10 to-transparent p-1 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#10a37f]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="bg-[#0A0A0F]/90 h-full p-6 rounded-xl flex flex-col items-center text-center border border-[#10a37f]/20 group-hover:border-[#10a37f]/50 relative z-10">
                                <div className="w-24 h-24 mb-4 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#10a37f]/20 to-[#10a37f]/5 border-2 border-[#10a37f]/30">
                                    <img src={chatgptBonus} alt="ChatGPT Plus" className="w-full h-full object-cover drop-shadow-[0_0_15px_rgba(16,163,127,0.3)]" />
                                </div>
                                <span className="text-[#10a37f] font-bold text-xs uppercase tracking-widest mb-2">BÔNUS #01 - O CÉREBRO</span>
                                <h3 className="text-xl font-bold text-white mb-2">ChatGPT Plus</h3>
                                <p className="text-gray-400 text-sm">Tenha o poder da inteligência artificial mais avançada do mundo para pensar, planejar e escrever todo o seu projeto de forma automática.</p>
                            </div>
                        </div>

                        {/* Bonus 2 - O EDITOR */}
                        <div className="group relative bg-gradient-to-br from-[#00c4cc]/10 to-transparent p-1 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00c4cc]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="bg-[#0A0A0F]/90 h-full p-6 rounded-xl flex flex-col items-center text-center border border-[#00c4cc]/20 group-hover:border-[#00c4cc]/50 relative z-10">
                                <div className="w-24 h-24 mb-4 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#00c4cc]/20 to-[#00c4cc]/5 border-2 border-[#00c4cc]/30">
                                    <img src={canvaBonus} alt="Canva Pro" className="w-full h-full object-cover drop-shadow-[0_0_15px_rgba(0,196,204,0.3)]" />
                                </div>
                                <span className="text-[#00c4cc] font-bold text-xs uppercase tracking-widest mb-2">BÔNUS #02 - O EDITOR</span>
                                <h3 className="text-xl font-bold text-white mb-2">Canva Pro</h3>
                                <p className="text-gray-400 text-sm">Crie designs profissionais, logos e artes de alto nível para valorizar seu projeto e atrair mais clientes com um clique.</p>
                            </div>
                        </div>

                        {/* Bonus 3 - O CRIADOR */}
                        <div className="group relative bg-gradient-to-br from-rose-500/10 to-transparent p-1 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="bg-[#0A0A0F]/90 h-full p-6 rounded-xl flex flex-col items-center text-center border border-rose-500/20 group-hover:border-rose-500/50 relative z-10">
                                <div className="w-24 h-24 mb-4 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-rose-500/20 to-rose-500/5 border-2 border-rose-500/30">
                                    <img src={lovableIcon} alt="Lovable Infinito" className="w-full h-full object-cover drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
                                </div>
                                <span className="text-rose-500 font-bold text-xs uppercase tracking-widest mb-2">BÔNUS #03 - O CRIADOR</span>
                                <h3 className="text-xl font-bold text-white mb-2">Lovable Infinito</h3>
                                <p className="text-gray-400 text-sm">A ferramenta definitiva para tirar suas ideias do papel e construir aplicações completas sem precisar escrever uma única linha de código.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </section>

            <section id="pricing" className="py-8 md:py-12 px-6 md:px-4">
                <div className="max-w-6xl mx-auto space-y-4">
                    <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground">ESCOLHA SEU PLANO</h2>
                    <Suspense fallback={<div className="h-96 animate-pulse bg-black/20" />}>
                        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                            <PricingCard
                                title="🟡 PLANO GOLD" price={PRICE_GOLD}
                                features={["Método Lovable Infinito", "Acesso Ilimitado", "Bônus ChatGPT 5 Plus", "Bônus Canva PRO", "Suporte Premium"]}
                                variant="gold" buttonText="QUERO PLANO GOLD"
                                checkoutLink={getCheckoutLink('gold')}
                                buttonId="btn-comprar-27-2"
                                onCheckout={() => handleCheckoutClick('btn-comprar-27-2', getCheckoutLink('gold'))}
                            />
                            <PricingCard
                                title="⚙️ PLANO PRATA" price={PRICE_PRATA}
                                features={["Método Lovable Infinito", "Acesso Ilimitado", "Suporte Básico"]}
                                variant="silver" buttonText="QUERO PLANO PRATA"
                                checkoutLink={getCheckoutLink('prata')}
                                buttonId="btn-comprar-17-2"
                                onCheckout={() => handleCheckoutClick('btn-comprar-17-2', getCheckoutLink('prata'))}
                            />
                        </div>
                    </Suspense>
                </div>
            </section>

            {/* GUARANTEE SECTION */}
            <section className="py-12 px-6 bg-black/20">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center text-center md:text-left gap-8 bg-gradient-to-b from-white/5 to-transparent p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] group-hover:bg-emerald-500/20 transition-all"></div>
                    <img src={garantia7dias} alt="Garantia 7 Dias" className="w-40 md:w-56 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] flex-shrink-0" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-3">RISCO ZERO POR 7 DIAS</h2>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            Entre, assista às aulas, use os bônus. Se você achar que não é pra você, devolvemos <span className="text-white font-bold">100% do seu dinheiro</span>. Sem perguntas.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section className="py-12 md:py-20 px-6 md:px-4">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-center text-white">PERGUNTAS FREQUENTES</h2>
                    <div className="space-y-4">
                        <Suspense fallback={<div className="h-20 bg-white/5 animate-pulse rounded-lg" />}>
                            <FAQItem question="Preciso saber programar?" answer="Não! O método ensina exatamente como usar a IA do Lovable para criar códigos complexos sem que você precise digitar uma linha sequer." />
                            <FAQItem question="Funciona para iniciantes?" answer="Sim, o curso é desenhado para pegar do zero e levar até a publicação do seu primeiro app." />
                            <FAQItem question="O acesso é vitalício?" answer="Sim! No Plano Prata e Gold você garante acesso vitalício às aulas e futuras atualizações do método." />
                            <FAQItem question="E se eu não gostar?" answer="Você tem 7 dias de garantia incondicional. Se não curtir, devolvemos seu dinheiro." />
                            <FAQItem question="Como recebo o acesso?" answer="Imediatamente após a aprovação do pagamento, você recebe um e-mail com seu login e senha exclusivos." />
                        </Suspense>
                    </div>
                </div>
            </section>

            <footer className="py-8 px-6 border-t border-white/10 bg-black/40 text-center">
                <p className="text-gray-500 text-sm">© 2026 — Todos os direitos reservados</p>
            </footer>
        </div>
    );
};

export default Index;





