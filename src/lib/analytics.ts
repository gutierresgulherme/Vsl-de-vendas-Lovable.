import { supabase } from \"@/integrations/supabase/client\";

// Mock de labels para manter compatibilidade
const BUTTON_LABELS: Record<string, string> = {
    \"btn-comprar-13-1\": \"Plano Prata\",
    \"btn-comprar-24-1\": \"Plano Gold\",
};

const getUtmify = () => (window as any).Utmify || (window as any).__utmify || (window as any).utmify;

export const getSessionId = (): string => \"session_utmify\";

export const getUtmParams = (): Record<string, string> => ({});

// Redirecionado para UTMify, mantendo assinatura original
export const trackButtonClick = async (buttonId: string): Promise<void> => {
    const utmify = getUtmify();
    if (utmify && utmify.track) {
        utmify.track('click', { button_id: buttonId });
    }
    console.log(\"[UTMIFY] Click tracked:\", buttonId);
};

// Redirecionado para UTMify, mantendo assinatura original
export const trackVideoEvent = async (
    eventType: \"play\" | \"pause\" | \"progress\" | \"ended\",
    currentTimeSeconds: number,
    durationSeconds: number
): Promise<void> => {
    const utmify = getUtmify();
    if (utmify && utmify.track) {
        const percent = durationSeconds > 0 ? Math.round((currentTimeSeconds / durationSeconds) * 100) : 0;
        utmify.track('video_' + eventType, { percent });
    }
};

export const initPageSession = async (): Promise<void> => {
    console.log(\"[Analytics] Session handled by UTMify\");
};

export const setupButtonTracking = (): void => {
    if ((window as any)._trackingInitialized) return;
    document.addEventListener(\"click\", (event) => {
        const target = event.target as HTMLElement;
        const button = target.closest(\"[id^='btn-comprar-']\");
        if (button) {
            const buttonId = button.getAttribute(\"id\");
            if (buttonId) trackButtonClick(buttonId);
        }
    }, true);
    (window as any)._trackingInitialized = true;
};

// Interface original para não quebrar o build do Admin
export interface AnalyticsData {
    buttonClicks: Array<{ button_id: string; button_label: string; count: number }>;
    videoRetention: Array<{ percent: number; sessions: number }>;
    totalSessions: number;
    totalClicks: number;
    ctr: number;
    topUtmSources: Array<{ source: string; count: number }>;
}

// Retorna dados vazios para o Admin sem dar erro de banco
export const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
    return {
        buttonClicks: [],
        videoRetention: [],
        totalSessions: 0,
        totalClicks: 0,
        ctr: 0,
        topUtmSources: [],
    };
};
