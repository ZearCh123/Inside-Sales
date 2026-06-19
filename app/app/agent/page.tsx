import { ModulePlaceholder } from "@/components/module-placeholder";
import { PhoneCall } from "lucide-react";

export default function Page() {
  return (
    <ModulePlaceholder
      title="Live call agent"
      icon={PhoneCall}
      subtitle="Live call coach med RAG — bygges senere."
    />
  );
}
