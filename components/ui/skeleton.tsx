import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative overflow-hidden bg-accent animate-pulse rounded-md shimmer", className)}
      {...props}
    />
  )
}

export { Skeleton }
