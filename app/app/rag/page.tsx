import { ModulePlaceholder } from "@/components/module-placeholder";
import { Database } from "lucide-react";

export default function Page() {
  return (
    <ModulePlaceholder
      title="RAG Database"
      icon={Database}
      subtitle="Vidensbasen (RAG) — bygges senere."
    />
  );
}
