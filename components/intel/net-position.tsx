import { Chip } from "./chips";

export function NetPosition({
  verdict,
  text,
}: {
  verdict: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-[#1B1418] p-5 text-white">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">
          Net position-read
        </h3>
        <Chip variant="tail">{verdict}</Chip>
      </div>
      <p className="text-sm leading-relaxed text-white/80">{text}</p>
    </div>
  );
}
