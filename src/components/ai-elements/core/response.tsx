"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

// Custom components for special tags
const ReasoningComponent = ({ children }: { children: React.ReactNode }) => (
  <div className="my-2 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md">
    <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Reasoning:</div>
    <div className="text-blue-700 dark:text-blue-300">{children}</div>
  </div>
);

const SourcesComponent = ({ children }: { children: React.ReactNode }) => (
  <div className="my-2 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-md">
    <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Sources:</div>
    <div className="text-green-700 dark:text-green-300">{children}</div>
  </div>
);

const TaskComponent = ({ children }: { children: React.ReactNode }) => (
  <div className="my-2 p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-r-md">
    <div className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">Task:</div>
    <div className="text-purple-700 dark:text-purple-300">{children}</div>
  </div>
);

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 midday-font-sans midday-text-foreground",
        className
      )}
      components={{
        reasoning: ReasoningComponent,
        sources: SourcesComponent,
        task: TaskComponent,
      } as any}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
