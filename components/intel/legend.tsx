import { Chip } from "./chips";

/** Explains the radar's terms and badges so the report is self-documenting. */
export function Legend() {
  return (
    <details className="rounded-2xl border border-[#E7D7D2] bg-white/60 p-4 text-sm">
      <summary className="cursor-pointer font-medium text-[#1B1418]">
        Hvad betyder symbolerne? (signaturforklaring)
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-4 text-[13px] text-[#6B5D5A] sm:grid-cols-3">
        <div>
          <p className="mb-1.5 font-semibold text-[#1B1418]">Ændring (vs. sidste måned)</p>
          <ul className="space-y-1">
            <li>🆕 Ny — dukker op første gang</li>
            <li>⬆ Eskalerer — samme historie, højere indsats</li>
            <li>➡ Ongoing — fortsætter uændret</li>
            <li>⬇ Køler af — mister momentum</li>
            <li>✅ Afsluttet — sagen er afgjort</li>
          </ul>
        </div>
        <div>
          <p className="mb-1.5 font-semibold text-[#1B1418]">Retning</p>
          <p className="mb-1.5">
            Er udviklingen god eller dårlig for jer? Pilen viser trenden (↑ stigende,
            → stabil, ↓ aftagende).
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Chip variant="tail">Medvind</Chip>
            <Chip variant="head">Modvind</Chip>
            <Chip variant="neu">Blandet / Neutral</Chip>
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-semibold text-[#1B1418]">Impact &amp; trussel</p>
          <p className="mb-1.5">
            <b>Impact</b> = hvor stor betydning begivenheden har.
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Chip variant="hi">High</Chip>
            <Chip variant="med">Med</Chip>
            <Chip variant="neu">Low</Chip>
          </div>
          <p>
            I <b>trussels-dossiererne</b> viser ↑ Stigende / → Stabil / ↓ Aftagende,
            om en konkurrent rykker tættere på at konkurrere med jeres produkt.
          </p>
        </div>
      </div>
    </details>
  );
}
