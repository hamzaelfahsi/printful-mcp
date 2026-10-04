import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  ShoppingBag, 
  Pin as PinIcon, 
  Save, 
  CheckCircle2, 
  Layers, 
  AlertCircle,
  Eye,
  Sliders,
  History,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { Button } from '../common/Button.js';
import { FullAIContentPackage } from '../../../server/services/GeminiService.js';

export const ContentGeneratorView: React.FC = () => {
  const { products, showToast, showConfirmDialog, setActiveTab } = useApp();

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [platform, setPlatform] = useState<'both' | 'etsy' | 'pinterest'>('both');
  const [tone, setTone] = useState('Mystical & Celestial');
  const [targetAudience, setTargetAudience] = useState('Anime fans, Art collectors, Aesthetic lovers');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Content Versions
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [versions, setVersions] = useState<Array<{ version: number; package: FullAIContentPackage; status: 'DRAFT' | 'APPROVED' }>>([
    {
      version: 1,
      status: 'DRAFT',
      package: {
        etsy: {
          title: 'Japanese Celestial Dragon Phone Case — Stained Glass Art Nouveau Cover',
          description: `Embrace the mythic power of the celestial dragon with this handcrafted aesthetic phone case. Featuring vibrant stained glass artwork, rich deep jewel tones, and opulent gold foil accents. Designed for superior drop protection without adding bulk.

✨ High-definition 2D print with scratch-resistant matte finish.
✨ Precision cutouts for all ports and wireless charging compatibility.
✨ Ideal gift for anime enthusiasts and fantasy art lovers.`,
          tags: [
            'dragon phone case',
            'stained glass case',
            'celestial artwork',
            'japanese anime case',
            'gold foil aesthetic',
            'art nouveau cover',
            'mystical fantasy gift',
            'iphone protector',
            'samsung case',
            'otaku aesthetic',
            'mythic creature',
            'aesthetic phone cover',
            '2d art print case'
          ],
          keywords: ['stained glass phone case', 'celestial dragon cover', 'art nouveau case', 'anime aesthetic case'],
          categorySuggestions: ['Electronics & Accessories > Phone Cases', 'Art & Collectibles > Prints']
        },
        pinterest: {
          title: 'Celestial Dragon Stained Glass Phone Case ✨ Gold Foil Art Nouveau',
          description: 'Transform your daily carry with this stunning celestial dragon phone case. Intricate stained glass details, gold foil accents, and vibrant magical vibes. Available now on Etsy!',
          keywords: ['#phonecase', '#animeaesthetic', '#stainedglassart', '#celestialdragon', '#goldfoilcase'],
          altText: 'Flat 2D vertical illustration of a Japanese celestial dragon with stained glass patterns and gold foil lines',
          suggestedBoard: 'Celestial Dragon & Mythic Art Cases'
        },
        generationMetadata: {
          model: 'gemini-3.8-flash',
          timestamp: new Date().toISOString(),
          promptTokensEst: 420,
          disclaimer: 'AI SUGGESTION — Requires human review and approval.'
        }
      }
    }
  ]);

  const activePackage = versions.find((v) => v.version === currentVersion)?.package || versions[0].package;
  const currentStatus = versions.find((v) => v.version === currentVersion)?.status || 'DRAFT';

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    showToast({ type: 'info', title: 'Copié dans le presse-papier', message: 'Texte prêt à coller.' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const nextVer = versions.length + 1;
      const newPackage: FullAIContentPackage = {
        etsy: {
          title: `${selectedProduct?.title || 'Art Nouveau Case'} — Edition V${nextVer}`,
          description: `Sublimez votre quotidien avec cette coque d'artiste exclusive. L'illustration 2D met en scène des motifs vitraux célestes avec incrustations dorées.\n\n• Finition haute résolution anti-rayures\n• Compatible charge sans fil\n• Prise en main ergonomique et protection antichoc.`,
          tags: [
            'coque manga vitrail',
            'design celestiel',
            'art nouveau coque',
            'protection antichoc',
            'coque doree or',
            'cadeau anime unique',
            'accessoire smartphone',
            'dragon japonais',
            'otaku lifestyle',
            'edition limitee',
            'design artisanal',
            'case iphone 16',
            'case samsung s24'
          ],
          keywords: ['coque vitrail manga', 'accessoire celestiel', 'art nouveau case'],
          categorySuggestions: ['Electronics & Accessories > Cases', 'Handmade Art']
        },
        pinterest: {
          title: `Coque Artistique Vitrail Céleste — ${selectedProduct?.title}`,
          description: 'Découvrez notre nouvelle collection de coques artistiques effet vitrail et dorures magiques. Cliquez pour explorer sur notre boutique Etsy ! ✨',
          keywords: ['#coquetel', '#animeart', '#stainedglasscase', '#aestheticphonecase'],
          altText: `Illustration 2D de haute précision pour ${selectedProduct?.title}`,
          suggestedBoard: 'Stained Glass Anime Phone Cases'
        },
        generationMetadata: {
          model: 'gemini-3.8-flash',
          timestamp: new Date().toISOString(),
          promptTokensEst: 460,
          disclaimer: 'AI SUGGESTION — Generated via Gemini 3.8 Flash'
        }
      };

      setVersions([...versions, { version: nextVer, package: newPackage, status: 'DRAFT' }]);
      setCurrentVersion(nextVer);
      showToast({
        type: 'success',
        title: `Version content_v${nextVer} générée`,
        message: 'Contenu optimisé prêt pour vérification et approbation.'
      });
    }, 1200);
  };

  const handleApprove = () => {
    showConfirmDialog({
      title: 'Approuver ce contenu pour publication ?',
      message: `La version content_v${currentVersion} sera marquée comme APPROVED et pourra être programmée sur vos canaux Etsy et Pinterest. Aucune publication automatique n'est déclenchée immédiatement.`,
      confirmLabel: 'Approuver la version',
      confirmVariant: 'warning',
      onConfirm: () => {
        setVersions(
          versions.map((v) => (v.version === currentVersion ? { ...v, status: 'APPROVED' } : v))
        );
        showToast({
          type: 'success',
          title: `Version content_v${currentVersion} approuvée`,
          message: 'Prêt pour le scheduler et la file d’attente.'
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <span>AI Content & SEO Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Génération de titres, tags Etsy et épingles Pinterest propulsée par Gemini 3.8 Flash (Validation Humaine Requise)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('content-queue')}
            icon={<Layers className="w-4 h-4 text-indigo-400" />}
          >
            File d'Attente ({versions.filter((v) => v.status === 'APPROVED').length} Approuvés)
          </Button>

          <Button
            variant="amber"
            size="sm"
            loading={isGenerating}
            onClick={handleGenerate}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Générer Nouveau Package IA
          </Button>
        </div>
      </div>

      {/* Control Panel: Product & Settings */}
      <Card className="p-4 bg-slate-900 border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Produit Référence</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Plateformes Cibles</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="both">Etsy & Pinterest (Package Complet)</option>
              <option value="etsy">Etsy SEO Uniquement</option>
              <option value="pinterest">Pinterest Pin Uniquement</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Tonalité & Style</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Audience Cible</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>
      </Card>

      {/* Version Selector & Approval Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300">Versions Disponibles :</span>
          <div className="flex gap-1.5">
            {versions.map((v) => (
              <button
                key={v.version}
                onClick={() => setCurrentVersion(v.version)}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  currentVersion === v.version
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                v{v.version} {v.status === 'APPROVED' && '✓'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={currentStatus === 'APPROVED' ? 'success' : 'warning'} size="sm" dot>
            Statut : {currentStatus}
          </Badge>

          {currentStatus !== 'APPROVED' ? (
            <Button
              variant="amber"
              size="sm"
              onClick={handleApprove}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Approuver cette Version
            </Button>
          ) : (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Version validée pour diffusion
            </span>
          )}
        </div>
      </div>

      {/* Generated Outputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ETSY SEO SECTION */}
        {(platform === 'both' || platform === 'etsy') && (
          <Card className="p-5 bg-slate-900 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Optimisations Etsy SEO</h3>
              </div>
              <Badge variant="amber" size="sm">Gemini 3.8 Flash</Badge>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Titre Optimisé (Max 140 car.)</span>
                <button
                  onClick={() => handleCopy(activePackage.etsy.title, 'etsy-title')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedField === 'etsy-title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-medium leading-relaxed">
                {activePackage.etsy.title}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">13 Tags Etsy Dédupliqués</span>
                <button
                  onClick={() => handleCopy(activePackage.etsy.tags.join(', '), 'etsy-tags')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedField === 'etsy-tags' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                {activePackage.etsy.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Description Marchande</span>
                <button
                  onClick={() => handleCopy(activePackage.etsy.description, 'etsy-desc')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedField === 'etsy-desc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                {activePackage.etsy.description}
              </div>
            </div>
          </Card>
        )}

        {/* PINTEREST SECTION */}
        {(platform === 'both' || platform === 'pinterest') && (
          <Card className="p-5 bg-slate-900 border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PinIcon className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-sm">Épingle Pinterest Business</h3>
              </div>
              <Badge variant="purple" size="sm">Format Organique</Badge>
            </div>

            {/* Pin Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Titre de l'Épingle (Max 100 car.)</span>
                <button
                  onClick={() => handleCopy(activePackage.pinterest.title, 'pin-title')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedField === 'pin-title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-medium leading-relaxed">
                {activePackage.pinterest.title}
              </div>
            </div>

            {/* Pin Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Description & Call to Action</span>
                <button
                  onClick={() => handleCopy(activePackage.pinterest.description, 'pin-desc')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedField === 'pin-desc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {activePackage.pinterest.description}
              </div>
            </div>

            {/* Alt Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Texte Alternatif (Accessibilité & SEO)</span>
                <button
                  onClick={() => handleCopy(activePackage.pinterest.altText, 'pin-alt')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedField === 'pin-alt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 italic leading-relaxed">
                "{activePackage.pinterest.altText}"
              </div>
            </div>

            {/* Suggested Board */}
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 flex items-center justify-between text-xs">
              <span className="text-slate-400">Tableau Pinterest Suggéré :</span>
              <span className="font-bold text-rose-300">{activePackage.pinterest.suggestedBoard}</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
