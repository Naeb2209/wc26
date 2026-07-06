"use client";

/**
 * SpotlightCard - Reusable insight card component
 *
 * Props:
 * - icon: Material icon name
 * - iconColor: Color class (e.g., "text-primary", "text-tertiary")
 * - title: Card headline (e.g., "Player of the Round")
 * - subtitle: Secondary text (e.g., "Top rated performance")
 * - value: Main display value (e.g., player name, score)
 * - valueDetail: Optional detail below value (e.g., "7.5 rating", "3 goals")
 * - secondaryValue: Optional secondary stat (e.g., assists count)
 * - variant: "default" | "highlight" | "stat" (styling)
 */
export default function SpotlightCard({
  icon = "star",
  iconColor = "text-primary",
  title = "",
  subtitle = "",
  value = "",
  valueDetail = "",
  secondaryValue = null,
  variant = "default",
}) {
  const variantStyles = {
    default: "bg-surface-container-low border-primary",
    highlight: "bg-surface-container border-tertiary",
    stat: "bg-primary text-on-primary border-primary",
  };

  const textColorClass = variant === "stat" ? "text-on-primary" : "text-on-surface";
  const subtitleColorClass = variant === "stat" ? "text-on-primary/70" : "text-on-surface-variant";
  const valueColorClass = variant === "stat" ? "text-on-primary" : "text-primary";
  const iconColorFinal = variant === "stat" ? "text-on-primary" : iconColor;

  return (
    <div
      className={`
        rounded-lg border-2 p-4 transition-all hover:shadow-sm
        ${variantStyles[variant]}
      `}
    >
      {/* Header: Icon + Title */}
      <div className="flex items-start gap-3 mb-3">
        <span className={`material-symbols-outlined text-[24px] ${iconColorFinal} flex-shrink-0`}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className={`text-xs font-bold uppercase tracking-wider ${textColorClass}`}>
            {title}
          </h4>
          {subtitle && (
            <p className={`text-xs ${subtitleColorClass} mt-1 line-clamp-1`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Main Value */}
      <div className="ml-9">
        <div className={`text-lg font-bold ${valueColorClass} truncate`}>
          {value}
        </div>
        {valueDetail && (
          <div className={`text-sm ${subtitleColorClass} mt-1`}>
            {valueDetail}
          </div>
        )}
        {secondaryValue && (
          <div className={`text-xs font-semibold ${valueColorClass} mt-2 flex items-center gap-1`}>
            <span className="material-symbols-outlined text-[16px] inline">trending_up</span>
            {secondaryValue}
          </div>
        )}
      </div>
    </div>
  );
}
