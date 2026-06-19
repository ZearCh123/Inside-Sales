import { redirect } from "next/navigation";

export default function MonthlyRedirect({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  redirect(
    searchParams.period ? `/app/market?period=${searchParams.period}` : "/app/market",
  );
}
