import { MOODS } from "@/store/journal";
import { cn } from "@/lib/utils";

export function MoodPicker({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label="Mood">
      {MOODS.map((mood) => (
        <button
          key={mood.value}
          type="button"
          role="radio"
          aria-checked={value === mood.value}
          onClick={() => onChange(mood.value)}
          className={cn(
            "flex items-center gap-2 rounded-2xl border border-border/70 bg-card/50 px-4 py-2.5 text-sm transition-all hover:-translate-y-0.5",
            value === mood.value && "border-primary/60 bg-primary/15 text-foreground soft-ring",
          )}
        >
          <span className="text-lg" aria-hidden>
            {mood.emoji}
          </span>
          {mood.label}
        </button>
      ))}
    </div>
  );
}

export function EmotionTags({
  selected,
  onToggle,
  options,
  className,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((tag) => (
        <button
          key={tag}
          type="button"
          aria-pressed={selected.includes(tag)}
          onClick={() => onToggle(tag)}
          className={cn(
            "rounded-full border border-border/70 bg-card/40 px-3 py-1.5 text-xs capitalize text-muted-foreground transition-colors",
            selected.includes(tag) && "border-teal/60 bg-teal/15 text-foreground",
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
