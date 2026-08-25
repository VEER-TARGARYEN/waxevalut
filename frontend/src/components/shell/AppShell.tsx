/** The lightweight shell: header + routed content + global overlays. No permanent sidebar;
 *  content owns the viewport. Overlays (palette, observe, provenance) live here so they float
 *  above any route without unmounting it. */
import type { ReactNode } from "react";
import { Header } from "./Header";
import { CommandPalette } from "./CommandPalette";
import { ObserveModal } from "@/components/observe/ObserveModal";
import { ProvenanceDrawer } from "@/components/provenance/ProvenanceDrawer";
import { MobileAgentBar } from "./MobileAgentBar";
import { AmbientShader } from "./AmbientShader";
import { BottomDock } from "./BottomDock";
import { SideRail } from "./SideRail";
import { ActivityRail } from "./ActivityRail";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientShader />
      <Header />
      <MobileAgentBar />
      <SideRail />
      <ActivityRail />
      <main className="flex-1">{children}</main>
      <BottomDock />
      <CommandPalette />
      <ObserveModal />
      <ProvenanceDrawer />
    </div>
  );
}
