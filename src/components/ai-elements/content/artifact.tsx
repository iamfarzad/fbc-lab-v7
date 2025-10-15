"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type LucideIcon, XIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { ShimmerLoader } from "../core/shimmer-loader";

export type ArtifactProps = HTMLAttributes<HTMLDivElement>;

export const Artifact = ({ className, ...props }: ArtifactProps) => (
  <div
    className={cn(
      "flex flex-col overflow-hidden rounded-md border border-border/50 bg-muted/30",
      "[.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2",
      className
    )}
    {...props}
  />
);

export type ArtifactHeaderProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactHeader = ({
  className,
  ...props
}: ArtifactHeaderProps) => (
  <div
    className={cn(
      "flex items-center justify-between border-b border-border/50 bg-transparent px-3 py-2",
      className
    )}
    {...props}
  />
);

export type ArtifactCloseProps = ComponentProps<typeof Button>;

export const ArtifactClose = ({
  className,
  children,
  size = "sm",
  variant = "ghost",
  ...props
}: ArtifactCloseProps) => (
  <Button
    className={cn(
      "size-8 p-0 text-muted-foreground hover:text-foreground",
      className
    )}
    size={size}
    type="button"
    variant={variant}
    {...props}
  >
    {children ?? <XIcon className="size-4" />}
    <span className="sr-only">Close</span>
  </Button>
);

export type ArtifactTitleProps = HTMLAttributes<HTMLParagraphElement> & {
  status?: "streaming" | "loading" | "complete" | "error"
};

export const ArtifactTitle = ({ className, status, children, ...props }: ArtifactTitleProps) => {
  const isProcessing = status === "streaming" || status === "loading"
  
  return (
    <p
      className={cn("font-medium text-foreground text-sm", className)}
      {...props}
    >
      {isProcessing && typeof children === "string" ? (
        <ShimmerLoader state="processing" variant="inline" text={children} />
      ) : (
        children
      )}
    </p>
  )
};

export type ArtifactDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const ArtifactDescription = ({
  className,
  ...props
}: ArtifactDescriptionProps) => (
  <p className={cn("text-muted-foreground text-sm", className)} {...props} />
);

export type ArtifactActionsProps = HTMLAttributes<HTMLDivElement>;

export const ArtifactActions = ({
  className,
  ...props
}: ArtifactActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

export type ArtifactActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
  icon?: LucideIcon;
};

export const ArtifactAction = ({
  tooltip,
  label,
  icon: Icon,
  children,
  className,
  size = "sm",
  variant = "ghost",
  ...props
}: ArtifactActionProps) => {
  const button = (
    <Button
      className={cn(
        "size-8 p-0 text-muted-foreground hover:text-foreground",
        className
      )}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {Icon ? <Icon className="size-4" /> : children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

export type ArtifactContentProps = HTMLAttributes<HTMLDivElement> & {
  status?: "streaming" | "loading" | "complete" | "error"
};

export const ArtifactContent = ({
  className,
  status,
  children,
  ...props
}: ArtifactContentProps) => {
  const isProcessing = status === "streaming" || status === "loading"
  
  return (
    <div className={cn("flex-1 overflow-auto p-4", className)} {...props}>
      {isProcessing && !children ? (
        <ShimmerLoader state="processing" variant="block" />
      ) : (
        children
      )}
    </div>
  )
};
