import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface CollapsableSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

const collapsedSections: Record<string, boolean> = {};

export default function CollapsableSection({
  title,
  defaultCollapsed = false,
  children,
  ...props
}: CollapsableSectionProps) {
  const [collapsed, setCollapsed] = useState(
    collapsedSections[title] ?? defaultCollapsed,
  );

  useEffect(() => {
    collapsedSections[title] = collapsed;
  }, [collapsed]);

  return (
    <div className="properties-section" {...props}>
      <div className="properties-section-header">
        <div className="properties-section-title">{title}</div>
        <button
          className="file-tab-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight /> : <ChevronDown />}
        </button>
      </div>
      {!collapsed && (
        <div className="properties-section-content">{children}</div>
      )}
    </div>
  );
}
