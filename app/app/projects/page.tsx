import { ModulePlaceholder } from "@/components/module-placeholder";
import { KanbanSquare } from "lucide-react";

export default function Page() {
  return <ModulePlaceholder title="Projects" icon={KanbanSquare} phase={2} />;
}
