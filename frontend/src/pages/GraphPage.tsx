/** Page 3 route wrapper. Full-viewport graph explorer; the entity comes from ?entity= (or a
 *  sensible default) so the view is shareable. */
import { useSearchParams } from "react-router-dom";
import { GraphView } from "@/components/graph/GraphView";

export function GraphPage() {
  const [params] = useSearchParams();
  const entity = params.get("entity") || "Billing Service";
  // Cytoscape needs a resolved pixel height at init, so the container uses an explicit calc
  // rather than flex-fill (percentage height through a flex chain collapses it to 0).
  // Below md the agent switcher occupies its own 61px bar beneath the 56px header (=117);
  // at md+ only the header. dvh tracks mobile browser chrome.
  return (
    <div className="h-[calc(100dvh-117px)] w-full md:h-[calc(100dvh-56px)]">
      <GraphView key={entity} entity={entity} />
    </div>
  );
}
