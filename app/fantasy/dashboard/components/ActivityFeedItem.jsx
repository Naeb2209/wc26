"use client";

/**
 * ActivityFeedItem - Reusable activity feed card component
 *
 * Props:
 * - icon: Material icon name
 * - iconColor: Color class (e.g., "text-primary", "text-tertiary")
 * - title: Item headline
 * - description: Detailed description
 * - value: Optional value/stat to display
 * - valueLabel: Label for the value
 * - timestamp: Optional timestamp string
 * - variant: "default" | "highlight" | "info" (background styling)
 */
export default function ActivityFeedItem({
  icon = "info",
  iconColor = "text-primary",
  title = "",
  description = "",
  value = null,
  valueLabel = "",
  timestamp = null,
  variant = "default",
}) {
  // Variant styles for background
  const variantStyles = {
    default: "bg-surface-container-low border-l-4 border-primary",
    highlight: "bg-surface-container border-l-4 border-tertiary",
    info: "bg-surface-container-lowest border-l-4 border-outline-variant",
  };

  return (
    <div
      className={`
        rounded-lg px-4 py-3 transition-all hover:shadow-sm
        ${variantStyles[variant]}
      `}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 pt-0.5">
          <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>
            {icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Value Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-label-large text-on-surface leading-tight">
              {title}
            </h4>
            {value !== null && (
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-bold text-primary">{value}</div>
                {valueLabel && (
                  <div className="text-xs text-on-surface-variant">{valueLabel}</div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-on-surface-variant line-clamp-2">
              {description}
            </p>
          )}

          {/* Timestamp */}
          {timestamp && (
            <div className="text-xs text-on-surface-variant mt-2">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
