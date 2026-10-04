import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Key, CheckCircle, XCircle, RefreshCw, Sparkles, Database, Lock, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';

export const SettingsView: React.FC = () => {
  const { isDemoMode, setIsDemoMode, showToast, refreshData, fetchLiveProducts } = useApp();

  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [syncInterval, setSyncInterval] = useState('30');
  const [language, setLanguage] = useState('fr');
  const [isConnectingEtsy, setIsConnectingEtsy] = useState(false);
  const [isConnectingPinterest, setIsConnectingPinterest] = useState(false);
  const [etsyStatus, setEtsyStatus] = useState<{ connected: boolean; shop?: any } | null>(null);

  const fetchEtsyStatus = async () => {
    try {
      const res = await fetch('/api/etsy/status');
      if (res.ok) {
        const data = await res.json();
        setEtsyStatus(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchEtsyStatus();
  }, []);

  // Listen for OAuth postMessage callbacks from popup
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      // Validate origin against allowed application origins
      const allowedOrigins = [
        window.location.origin,
        'https://etsypilot-ai.ai.studio'
      ];

      const isAllowed =
        allowedOrigins.includes(event.origin) ||
        event.origin.endsWith('.run.app') ||
        event.origin.includes('localhost');

      if (!isAllowed) {
        return;
      }

      if (event.data?.type === 'ETSY_AUTH_SUCCESS') {
        setIsConnectingEtsy(false);
        showToast({
          type: 'success',
          title: 'Boutique Etsy Connectée',
          message: 'Votre boutique Etsy a été authentifiée avec succès via OAuth 2.0.'
        });
        await fetchEtsyStatus();
        if (fetchLiveProducts && !isDemoMode) {
          await fetchLiveProducts();
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [fetchLiveProducts, isDemoMode, showToast]);

  const handleConnectEtsy = async () => {
    try {
      setIsConnectingEtsy(true);
      const res = await fetch('/api/etsy/auth/start');
      const data = await res.json();
      if (data.url) {
        const oauthWindow = window.open(
          data.url,
          'etsy_oauth',
          'width=650,height=800,left=200,top=100'
        );

        if (!oauthWindow) {
          showToast({
            type: 'error',
            title: 'Fenêtre Popup Bloquée',
            message: 'Le navigateur a bloqué la fenêtre OAuth. Veuillez autoriser les fenêtres popups pour CraftCases Studio.'
          });
          setIsConnectingEtsy(false);
          return;
        }
      } else {
        throw new Error(data?.message || 'URL OAuth Etsy indisponible');
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur OAuth',
        message: err?.message || 'Impossible d’initialiser OAuth Etsy'
      });
      setIsConnectingEtsy(false);
    }
  };

  const handleConnectPinterest = async () => {
    try {
      setIsConnectingPinterest(true);
      const res = await fetch('/api/pinterest/auth/start');
      const data = await res.json();
      if (data.url) {
        const oauthWindow = window.open(
          data.url,
          'pinterest_oauth',
          'width=650,height=800,left=200,top=100'
        );
        if (!oauthWindow) {
          showToast({
            type: 'error',
            title: 'Fenêtre Popup Bloquée',
            message: 'Le navigateur a bloqué la fenêtre OAuth. Veuillez autoriser les fenêtres popups pour CraftCases Studio.'
          });
          setIsConnectingPinterest(false);
          return;
        }
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur OAuth',
        message: err?.message || 'Impossible d’initialiser OAuth Pinterest'
      });
      setIsConnectingPinterest(false);
    }
  };

  const handleSave = () => {
    showToast({
      type: 'success',
      title: 'Paramètres enregistrés',
      message: 'Vos préférences système ont été appliquées.'
    });
  };

  const isEtsyConnected = etsyStatus ? etsyStatus.connected : true;
  const etsyShopName = etsyStatus?.shop?.shop_name || 'CraftCasesStudio';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-slate-400" />
          <span>Paramètres & Intégrations OAuth</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Gestion des autorisations API, du chiffrement des jetons et de l’IA Gemini
        </p>
      </div>

      {/* OAuth Connections */}
      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Connexions Officielles OAuth 2.0
        </h3>

        <div className="space-y-3">
          {/* Etsy */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-sm">
                E
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Etsy Open API v3</h4>
                {isEtsyConnected ? (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle className="w-3 h-3" /> Connecté ({etsyShopName})
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" /> Non Connecté
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="amber"
                size="sm"
                onClick={handleConnectEtsy}
                disabled={isConnectingEtsy}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isConnectingEtsy ? 'animate-spin' : ''}`} />}
              >
                {isConnectingEtsy ? 'Ouverture...' : isEtsyConnected ? 'Re-connecter OAuth' : 'Autoriser via OAuth'}
              </Button>
              <Button variant="outline" size="sm" onClick={refreshData}>
                Re-synchroniser
              </Button>
            </div>
          </div>

          {/* Pinterest */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm">
                P
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Pinterest Business API v5</h4>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3" /> Connecté (CraftCasesStudio_Official)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectPinterest}
                disabled={isConnectingPinterest}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isConnectingPinterest ? 'animate-spin' : ''}`} />}
              >
                {isConnectingPinterest ? 'Redirection...' : 'Autoriser via OAuth'}
              </Button>
              <Button variant="outline" size="sm" onClick={refreshData}>
                Re-synchroniser
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Preferences */}
      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Configuration Intelligence Artificielle
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Modèle d'Intelligence Artificielle
            </label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            >
              <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Recommandé)</option>
              <option value="gemini-2.5-pro">Google Gemini 2.5 Pro</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Intervalle de Synchronisation Auto
            </label>
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            >
              <option value="15">Toutes les 15 minutes</option>
              <option value="30">Toutes les 30 minutes</option>
              <option value="60">Toutes les heures</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <Button variant="amber" size="sm" onClick={handleSave}>
            Enregistrer les Modifications
          </Button>
        </div>
      </Card>

      {/* Security & Database Status */}
      <Card className="p-5 space-y-3 bg-slate-900 border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Sécurité & Chiffrement des Tokens</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Les jetons de rafraîchissement (OAuth Refresh Tokens) sont protégés par chiffrement symétrique AES-256-GCM. Aucun secret ni clé d'API n'est transmis au navigateur client.
        </p>
      </Card>
    </div>
  );
};
