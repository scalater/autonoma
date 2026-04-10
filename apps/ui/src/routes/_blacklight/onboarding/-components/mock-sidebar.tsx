import { cn } from "@autonoma/blacklight";
import { BugIcon } from "@phosphor-icons/react/Bug";
import { BugBeetleIcon } from "@phosphor-icons/react/BugBeetle";
import { GearSixIcon } from "@phosphor-icons/react/GearSix";
import { GridFourIcon } from "@phosphor-icons/react/GridFour";
import type { Icon } from "@phosphor-icons/react/lib";
import { LightningIcon } from "@phosphor-icons/react/Lightning";
import { PlayIcon } from "@phosphor-icons/react/Play";
import { WarningIcon } from "@phosphor-icons/react/Warning";

export type MockPage = "generations" | "issues" | "bugs" | "runs";

interface MockNavItem {
  icon: Icon;
  label: string;
  page?: MockPage;
  disabled?: boolean;
}

const NAV_ITEMS: MockNavItem[] = [
  { icon: GridFourIcon, label: "Home", disabled: true },
  { icon: LightningIcon, label: "Generations", page: "generations" },
  { icon: WarningIcon, label: "Issues", page: "issues" },
  { icon: BugBeetleIcon, label: "Bugs", page: "bugs" },
  { icon: PlayIcon, label: "Runs", page: "runs" },
  { icon: BugIcon, label: "Tests", disabled: true },
];

const TOOL_ITEMS: MockNavItem[] = [{ icon: GearSixIcon, label: "Settings", disabled: true }];

interface MockSidebarProps {
  activePage: MockPage;
  onPageChange: (page: MockPage) => void;
}

export function MockSidebar({ activePage, onPageChange }: MockSidebarProps) {
  return (
    <div className="flex h-full flex-col border-r border-border-dim bg-surface-base">
      {/* Header */}
      <div className="flex h-10 items-center gap-2 border-b border-border-dim px-3">
        <div className="flex size-5 shrink-0 items-center justify-center bg-primary font-mono text-4xs font-bold text-primary-foreground">
          A
        </div>
        <span className="truncate text-3xs font-medium text-text-primary">Acme Corp</span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-hidden py-2">
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isGenerations = item.page === "generations";
            const showTooltip = isGenerations && activePage !== "generations";

            return (
              <MockNavItemRow
                key={item.label}
                item={item}
                isActive={item.page != null && activePage === item.page}
                showTooltip={showTooltip}
                onClick={() => {
                  if (item.page != null) onPageChange(item.page);
                }}
              />
            );
          })}
        </nav>

        <div className="mx-3 my-2 h-px bg-border-dim" />

        <nav className="flex flex-col gap-0.5">
          {TOOL_ITEMS.map((item) => (
            <MockNavItemRow
              key={item.label}
              item={item}
              isActive={item.page != null && activePage === item.page}
              onClick={() => {
                if (item.page != null) onPageChange(item.page);
              }}
            />
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-border-dim px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-surface-raised" />
          <span className="text-3xs text-text-secondary">user@acme.com</span>
        </div>
      </div>
    </div>
  );
}

interface MockNavItemRowProps {
  item: MockNavItem;
  isActive: boolean;
  showTooltip?: boolean;
  onClick: () => void;
}

function MockNavItemRow({ item, isActive, showTooltip, onClick }: MockNavItemRowProps) {
  const ItemIcon = item.icon;
  const isDisabled = item.disabled === true;
  const isClickable = !isDisabled && item.page != null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn("relative w-full text-left cursor-pointer", isDisabled && "cursor-default")}
    >
      <div
        className={cn(
          "mx-1 flex items-center gap-2 rounded px-2 py-1.5 text-3xs font-medium transition-colors",
          isActive && "bg-surface-raised text-text-primary",
          isDisabled && "opacity-30",
          isClickable && !isActive && "text-text-secondary hover:bg-surface-raised/50",
          !isClickable && !isActive && !isDisabled && "text-text-secondary",
        )}
      >
        {isActive && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary-ink" />}
        <ItemIcon size={14} weight={isActive ? "fill" : "regular"} className="shrink-0" />
        <span>{item.label}</span>
      </div>

      {showTooltip === true && (
        <div className="absolute -top-7 left-1/2 z-30 -translate-x-1/2 animate-bounce">
          <div className="whitespace-nowrap rounded bg-primary-ink px-2 py-1 font-mono text-4xs font-bold text-primary-foreground shadow-lg">
            Click me!
          </div>
          <div className="mx-auto size-0 border-x-4 border-t-4 border-x-transparent border-t-primary-ink" />
        </div>
      )}
    </button>
  );
}
