import { redirect } from "next/navigation";

export default function PrintRedirect({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  redirect(
    searchParams.period
      ? `/app/market/print?period=${searchParams.period}`
      : "/app/market/print",
  );
}
