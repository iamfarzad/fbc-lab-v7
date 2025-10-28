"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { AGENT_STAGE_CONFIG } from "@/config/constants";
import { type ComponentProps } from "react";

type StageKey = keyof typeof AGENT_STAGE_CONFIG;

interface StageVisualizationProps extends ComponentProps<'div'> {
  currentStage: string;
  agent: string;
}

export function StageVisualization({ currentStage, agent, className, ...props }: StageVisualizationProps) {
  // Get all stages and sort by order
  const allStages = Object.entries(AGENT_STAGE_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order);
  
  // Find current stage config
  const currentStageConfig = AGENT_STAGE_CONFIG[currentStage as StageKey];
  
  if (!currentStageConfig) {
    return null;
  }

  // Get unique orders to handle stages with same order (WORKSHOP_PITCH & CONSULTING_PITCH)
  const uniqueOrders = [...new Set(allStages.map(([, config]) => config.order))].sort();
  const currentOrder = currentStageConfig.order;

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)} {...props}>
      <span className="font-medium">{currentStageConfig.label}</span>
      <div className="ml-2 flex items-center gap-1">
        {uniqueOrders.map((order) => {
          // Get representative stage for this order (first one if there are duplicates)
          const stageForOrder = allStages.find(([, config]) => config.order === order);
          if (!stageForOrder) return null;
          
          const [, stageConfig] = stageForOrder;
          const isActive = order === currentOrder;
          const isPassed = order < currentOrder;
          
          return (
            <HoverCard key={order} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button 
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    isActive || isPassed 
                      ? "bg-primary" 
                      : "bg-muted-foreground/30"
                  )}
                  aria-label={`${stageConfig.label}: ${stageConfig.description}`}
                />
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-64 p-3" 
                side="top"
                align="center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{stageConfig.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stageConfig.description}
                  </p>
                  {isActive && (
                    <div className="mt-2 text-xs font-medium text-primary">
                      Current Stage
                    </div>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    </div>
  );
}
