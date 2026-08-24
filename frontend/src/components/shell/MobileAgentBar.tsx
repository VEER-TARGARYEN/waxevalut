/** On narrow viewports the agent switcher moves out of the header into its own bar, so the
 *  lens control stays prominent without crowding the top row. */
import { AgentSwitcher } from "./AgentSwitcher";

export function MobileAgentBar() {
  return (
    <div
      className="flex items-center justify-center px-4 py-2 md:hidden"
      style={{ borderBottom: "1px solid var(--color-line)", background: "var(--color-surface-1)" }}
    >
      <AgentSwitcher />
    </div>
  );
}
