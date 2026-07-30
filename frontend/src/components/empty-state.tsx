import emptyArt from "@/assets/empty-state.png";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="glass animate-rise flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <img
        src={emptyArt}
        alt=""
        loading="lazy"
        width={768}
        height={640}
        className="mb-2 w-44 opacity-90 animate-float"
      />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionTo && (
        <Button asChild className="mt-6 rounded-full">
          <Link to={actionTo as string as never}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
