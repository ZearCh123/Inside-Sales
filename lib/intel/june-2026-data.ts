import type {
  Competitor,
  IntelSnapshotPayload,
  Kpi,
  Storyline,
} from "./types";

// Seed content for the June 2026 Monthly assessment, transcribed from
// docs/intel/Chromologics_Intelligence_Report_June_2026.html. Danish surface
// text matches the prototype (docs/design/Chromologics_Platform_Design_v2.html).

export const JUNE_2026_PERIOD = "2026-06-01";
export const JUNE_2026_MODEL = "seed:june-2026-report";

export const JUNE_2026_VERDICT = "Styrket";

export const JUNE_2026_NET_POSITION =
  "Makro-billedet flyttede sig yderligere i Chromologics' favør: USA's udfasning " +
  "af seks petroleum-farver mod slut-2026 konverteres til hård reformulerings-" +
  "efterspørgsel, og stabile naturlige røde er den knappeste brik — præcis " +
  "Natu.Red®'s value proposition. Men konkurrence-intensiteten i fermenteret rød " +
  "steg lige så hurtigt: Phytolons $23,6M-runde og Debut+Oterra Red 40-alliancen " +
  "landede begge i vinduet. Lyspunkt: FDA's hold på GM-gær rødbede-rød skærper " +
  "fordelen ved Natu.Red®'s non-GMO platform. Net: medvind vejer tungere end " +
  "modvind, men vinduet til at konvertere regulatorisk fremgang til first-mover-" +
  "fordel snævrer ind.";

export const JUNE_2026_STORYLINES: Storyline[] = [
  {
    storyline_key: "phytolon-seriesB",
    entity: "Phytolon",
    category: "competitor",
    change_status: "new",
    impact: "high",
    threat: "high",
    confidence: "confirmed",
    direction: "headwind",
    trajectory: "rising",
    headline: "Series B til US-launch",
    detail:
      "Phytolon lukkede en $23,6M Series B (26. maj) for at kommercialisere gær-" +
      "fermenteret rødbede-rød i USA. Bedst-finansierede direkte fermenteret-rød-" +
      "rival; GM-gær-ruten er dens eksponering.",
    source_name: "PR Newswire",
    source_url:
      "https://www.prnewswire.com/news-releases/phytolon-closes-23-6-million-series-b-to-commercialize-its-innovative-natural-food-colors-302781241.html",
  },
  {
    storyline_key: "debut-oterra-red40",
    entity: "Debut / Oterra",
    category: "competitor",
    change_status: "new",
    impact: "high",
    threat: "high",
    confidence: "confirmed",
    direction: "headwind",
    trajectory: "rising",
    headline: "Red 40-fermentering",
    detail:
      "Debut + Oterra-partnerskab (6. maj) skal skalere et precision-fermentation " +
      "Red 40-alternativ (orange–rød–violet) mod en FDA-filing og kommercielt " +
      "produkt om ~3 år — markedslederen er inde i fermenteret rød.",
    source_name: "PR Newswire",
    source_url:
      "https://www.prnewswire.com/news-releases/debut-and-oterra-partner-to-develop-and-scale-biotech-alternative-to-red-40-for-food-and-beverage-302764178.html",
  },
  {
    storyline_key: "us-dye-phaseout",
    entity: "FDA / HHS",
    category: "regulatory",
    change_status: "escalating",
    impact: "high",
    threat: null,
    confidence: "confirmed",
    direction: "tailwind",
    trajectory: null,
    headline: "US dye phase-out 2026",
    detail:
      "HHS/FDA presser mod fjernelse af seks petroleum-farver (Green 3, Red 40, " +
      "Yellow 5/6, Blue 1/2) inden udgangen af 2026; Red 3 allerede tilbagekaldt. " +
      "~40% af pakkevare-udbuddet har lovet hurtig udfasning. Stabile naturlige " +
      "røde er den knappeste erstatning.",
    source_name: "Consumer Reports",
    source_url:
      "https://advocacy.consumerreports.org/press_release/one-year-after-rfk-called-for-phase-out-of-harmful-dyes-some-major-food-companies-havent-made-commitments-no-drug-companies-have-pledged-to-act/",
  },
  {
    storyline_key: "fda-gm-color-hold",
    entity: "FDA",
    category: "regulatory",
    change_status: "new",
    impact: "medium",
    threat: null,
    confidence: "confirmed",
    direction: "tailwind",
    trajectory: null,
    headline: "Hold på GM-farver",
    detail:
      "FDA satte Phytolons GM-gær rødbede-rød (og en udvidet spirulina-ekstrakt) " +
      "på hold efter GMO-mærknings-indsigelse — en differentierings-åbning for " +
      "Natu.Red®'s non-GMO platform.",
    source_name: "FoodNavigator-USA",
    source_url:
      "https://www.foodnavigator-usa.com/Article/2026/03/31/fda-pauses-beetroot-red-and-spirulina-color-approvals/",
  },
  {
    storyline_key: "sensient-prism-capex",
    entity: "Sensient",
    category: "competitor",
    change_status: "ongoing",
    impact: "medium",
    threat: "medium",
    confidence: "confirmed",
    direction: "mixed",
    trajectory: "rising",
    headline: "$250M kapacitet (Prism)",
    detail:
      "Sensients $250M 'Project Prism' udvider naturlig-farve-kapacitet (St. Louis) " +
      "med mål om $1 mia. naturlig-farve-salg. Skala- og prispres på naturlige " +
      "røde — endnu ikke en fermenteret-rød-trussel.",
    source_name: "PR Newswire",
    source_url:
      "https://www.prnewswire.com/news-releases/sensient-scales-up-natural-color-production-to-fuel-us-shift-from-synthetic-dyes-302725586.html",
  },
  {
    storyline_key: "fermentalg-galdieria-eu",
    entity: "Fermentalg",
    category: "competitor",
    change_status: "escalating",
    impact: "medium",
    threat: "low",
    confidence: "confirmed",
    direction: "neutral",
    trajectory: "stable",
    headline: "Galdieria Blue (EFSA)",
    detail:
      "EFSA-opinion på Fermentalgs Galdieria Blue åbner EU-godkendelse; rekord-Q1 " +
      "2026 (€3,7M, FY25 €13,4M +17%). Blå, ikke rød — lav direkte trussel, men " +
      "beviser at biotech-farver klarer EFSA/FDA.",
    source_name: "Actusnews",
    source_url:
      "https://www.actusnews.com/en/fermentalg/pr/2026/04/02/2025-annual-results-strong-sales-growth-expansion-of-the-customer-portfolio-and-biosolutions-and-strengthening-of-the-financial",
  },
  {
    storyline_key: "michroma-cap-scaleup",
    entity: "Michroma",
    category: "competitor",
    change_status: "ongoing",
    impact: "medium",
    threat: "high",
    confidence: "likely",
    direction: "neutral",
    trajectory: "stable",
    headline: "FDA-petition + pilots",
    detail:
      "Michroma har afsluttet tox-studier til en FDA color-additive-petition; 20+ " +
      "hensigtserklæringer og 12+ betalte pilots; skalerer via CJ CheilJedang. " +
      "Nærmeste svampe-fermenteret rød-konkurrent; pH/varme-stabil-claim overlapper Natu.Red®.",
    source_name: "AgFunderNews",
    source_url:
      "https://agfundernews.com/fermentation-will-power-next-wave-of-natural-colors-says-michroma-as-it-rides-maha-wave",
  },
  {
    storyline_key: "octarine-seriesA",
    entity: "Octarine Bio",
    category: "competitor",
    change_status: "new",
    impact: "medium",
    threat: "low",
    confidence: "confirmed",
    direction: "neutral",
    trajectory: "rising",
    headline: "€12,8M Series A",
    detail:
      "Octarine Bio (DK) lukkede en €12,8M Series A (jan) med dsm-firmenich " +
      "Ventures; full-spectrum PurePalette™ precision-fermentation ventes udrullet " +
      "i 2026. Dansk peer med food-ambitioner — hold øje med et food-red-træk.",
    source_name: "EU-Startups",
    source_url:
      "https://www.eu-startups.com/2026/01/copenhagens-octarine-bio-adds-e5-million-to-series-a-to-advance-sustainable-colour-platform",
  },
  {
    storyline_key: "gnt-mea-lab",
    entity: "GNT / Exberry",
    category: "competitor",
    change_status: "ongoing",
    impact: "medium",
    threat: "medium",
    confidence: "confirmed",
    direction: "neutral",
    trajectory: "stable",
    headline: "MEA-ekspansion",
    detail:
      "GNT/Exberry (clean-label plantebaseret leder) udvider sit MEA-fodaftryk og " +
      "markedsfører aktivt carmine-erstatning (ISM 2026 + nyt applikationslab). " +
      "Levende efterspørgselspulje for vegansk, stabil rød.",
    source_name: "GNT / Exberry",
    source_url: "https://exberry.com/en/color-insights/carmine-replacement/",
  },
  {
    storyline_key: "fda-fast-track",
    entity: "FDA",
    category: "regulatory",
    change_status: "new",
    impact: "high",
    threat: null,
    confidence: "likely",
    direction: "tailwind",
    trajectory: null,
    headline: "Hurtigere naturlige godkendelser",
    detail:
      "FDA signalerer hurtigere naturlig-farve-godkendelser — ~7 nye på det " +
      "seneste år mod ~10 over de forrige 15 år. Regulatorisk accelerations-signal.",
    source_name: "FoodNavigator-USA",
    source_url:
      "https://www.foodnavigator-usa.com/Article/2026/03/23/fermentation-food-colors-gain-traction-as-synthetic-dye-phaseout-nears/",
  },
  {
    storyline_key: "chromologics-reg-funding",
    entity: "Chromologics",
    category: "market",
    change_status: "ongoing",
    impact: "medium",
    threat: null,
    confidence: "confirmed",
    direction: "neutral",
    trajectory: null,
    headline: "Chromologics €7M runde",
    detail:
      "Chromologics rejste €7M (i alt ~$21,7M); Novo Holdings & EIFO re-up, nye: " +
      "Döhler Ventures, Collateral Good Ventures, Synergetic. Midler øremærket " +
      "EFSA/FDA-submissions for Natu.Red®; 90+ producent-trials i EU/US.",
    source_name: "PR Newswire",
    source_url:
      "https://www.prnewswire.com/news-releases/chromologics-raises-7-million-to-bring-its-natural-colour-ingredients-closer-to-market-302618235.html",
  },
  {
    storyline_key: "carmine-volatility",
    entity: "Marked / Supply",
    category: "market",
    change_status: "ongoing",
    impact: "medium",
    threat: null,
    confidence: "confirmed",
    direction: "mixed",
    trajectory: null,
    headline: "Carmine-volatilitet",
    detail:
      "Carmine-markedet ~$43,3M (2026); købere defaulter til carmine som mest " +
      "stabile, regulatorisk-sikre naturlige rød under reformulering trods insekt-" +
      "oprindelse. Leverandører markedsfører carmine-erstatning — mulighed for Natu.Red®.",
    source_name: "Future Market Insights",
    source_url:
      "https://www.futuremarketinsights.com/reports/carmine-color-market",
  },
];

export const JUNE_2026_COMPETITORS: Competitor[] = [
  {
    name: "Phytolon",
    segment: "Emerging fermentation red · gær",
    country: "IL",
    relevance: "Direkte rød-konkurrent",
    threat_trajectory: "rising",
    notes:
      "Bedst-finansierede fermenteret-rød-startup; $23,6M Series B; GM-gær-rute nu forsinket af FDA GMO-hold.",
  },
  {
    name: "Debut",
    segment: "Precision fermentation × biotech · cell-free",
    country: "US",
    relevance: "Direkte rød-konkurrent",
    threat_trajectory: "rising",
    notes:
      "Paret med markedsleder Oterra; Red 40-mål; FDA-filing planlagt, ~3 års kommerciel tidslinje.",
  },
  {
    name: "Oterra",
    segment: "Direkte farveleder",
    country: "DK",
    relevance: "Distributionspartner + fermenterings-entrant",
    threat_trajectory: "rising",
    notes:
      "Markedsleder + Debut-partnerskab = mest farlige kombination; nu fermenteret-rød-spiller.",
  },
  {
    name: "Michroma",
    segment: "Emerging fermentation red · svamp",
    country: "AR/US",
    relevance: "Direkte rød-konkurrent",
    threat_trajectory: "stable",
    notes:
      "Nærmeste fermenteret-rød-konkurrent; tox-studier afsluttet; 20+ LOIs; CJ CheilJedang skalerings-partner.",
  },
  {
    name: "Sensient",
    segment: "Direkte farve (incumbent)",
    country: "US",
    relevance: "Skala- & prispres",
    threat_trajectory: "rising",
    notes:
      "$250M 'Project Prism'-kapacitet; mål $1 mia. naturlig-farve-salg; endnu ikke en fermenteret-rød-trussel.",
  },
  {
    name: "Fermentalg",
    segment: "Biotech-farver · alger (blå)",
    country: "FR",
    relevance: "Tilstødende biotech-farve-peer",
    threat_trajectory: "stable",
    notes:
      "EFSA-godkendt Galdieria Blue; rekord-Q1 2026; €13,4M FY25 (+17%); ikke rød-konkurrent, men regulatorisk signal.",
  },
  {
    name: "Octarine Bio",
    segment: "Full-spectrum precision fermentation",
    country: "DK",
    relevance: "Tilstødende peer, food-ambitions-risiko",
    threat_trajectory: "rising",
    notes:
      "€12,8M Series A; dsm-firmenich-backing; hold øje med food-red-træk; PurePalette™ rollout 2026.",
  },
  {
    name: "GNT / Exberry",
    segment: "Direkte farve (plantebaseret)",
    country: "NL",
    relevance: "Carmine-erstatnings-incumbent",
    threat_trajectory: "stable",
    notes:
      "Clean-label-leder; markedsfører aktivt carmine-erstatning; ISM 2026-push; MEA-ekspansion.",
  },
];

export const JUNE_2026_KPIS: Kpi[] = [
  {
    label: "Net position",
    value: "Styrket",
    caption: "↑ men stigende konkurrence",
    tone: "head",
  },
  {
    label: "Trusler stigende",
    value: "2",
    caption: "↑ Phytolon · Debut+Oterra",
    tone: "head",
  },
  {
    label: "Medvind",
    value: "3",
    caption: "↑ US dye phase-out",
    tone: "tail",
  },
  {
    label: "High-impact events",
    value: "4",
    caption: "i dette vindue",
    tone: "neutral",
  },
];

export const JUNE_2026_IMMEDIATE_KEYS = [
  "phytolon-seriesB",
  "debut-oterra-red40",
  "fda-gm-color-hold",
];

export const JUNE_2026_RISKS = [
  "Phytolon og Debut+Oterra kapløb mod US-skala — risiko for at en rival-fermenteret rød når markedet først.",
  "Sensients $250M-kapacitet lægger pris- og skalapres på naturlige røde.",
  "Vinduet til at konvertere regulatorisk fremgang til first-mover-fordel snævrer ind.",
];

export const JUNE_2026_OPPORTUNITIES = [
  "USA's udfasning af seks petroleum-farver skaber hård reformulerings-efterspørgsel på stabile naturlige røde.",
  "FDA's hold på GM-gær rødbede-rød skærper fordelen ved en non-GMO platform.",
  "Levende carmine-erstatnings-pulje (vegansk/halal/kosher, insekt-fri).",
];

export const JUNE_2026_ACTIONS = [
  "Accelerér og kommunikér EFSA/FDA-submission-milepæle.",
  "Skærp non-GMO-budskabet i lyset af FDA's hold på GM-farver.",
  "Prioritér carmine-erstatnings-konti (vegansk/halal/kosher, insekt-fri).",
  "Re-engagér Döhler (nu investor via Döhler Ventures) som route-to-market.",
];

export const JUNE_2026_SNAPSHOT: IntelSnapshotPayload = {
  period: JUNE_2026_PERIOD,
  verdict: JUNE_2026_VERDICT,
  net_position: JUNE_2026_NET_POSITION,
  kpis: JUNE_2026_KPIS,
  immediate_keys: JUNE_2026_IMMEDIATE_KEYS,
  storylines: JUNE_2026_STORYLINES,
  competitors: JUNE_2026_COMPETITORS,
  risks: JUNE_2026_RISKS,
  opportunities: JUNE_2026_OPPORTUNITIES,
  recommended_actions: JUNE_2026_ACTIONS,
};
