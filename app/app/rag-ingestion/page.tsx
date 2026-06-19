import { ModulePlaceholder } from "@/components/module-placeholder";
import { Upload } from "lucide-react";

export default function Page() {
  return (
    <ModulePlaceholder
      title="RAG Ingestion"
      icon={Upload}
      subtitle="Upload og indeksering til vidensbasen — bygges senere."
    />
  );
}
