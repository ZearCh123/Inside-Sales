import { ModulePlaceholder } from "@/components/module-placeholder";
import { LayoutDashboard } from "lucide-react";

export default function Page() {
  return (
    <ModulePlaceholder
      title="My dashboard"
      icon={LayoutDashboard}
      subtitle="Sælgerens personlige dashboard — bygges senere."
    />
  );
}
