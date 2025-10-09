import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Zap } from "lucide-react";

interface StatusIndicatorProps {
  isEnhancedResearchActive?: boolean;
  isAutoGroundingActive?: boolean;
  className?: string;
}

export function StatusIndicator({ 
  isEnhancedResearchActive = true, 
  isAutoGroundingActive = true,
  className 
}: StatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isEnhancedResearchActive && !isAutoGroundingActive) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 cursor-pointer transition-all duration-200",
              "hover:scale-105 active:scale-95",
              className
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* Accent dot indicator */}
            <div className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              isEnhancedResearchActive 
                ? "bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/0.6)] animate-pulse" 
                : "bg-muted-foreground/40"
            )} />
            
            {/* Expanded state - show full text */}
            {isExpanded && (
              <div className="flex items-center gap-1.5">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs px-2 py-0.5 border-accent/30 bg-accent/10 text-accent-foreground",
                    "font-medium tracking-wide"
                  )}
                >
                  <Search className="h-3 w-3 mr-1" />
                  Enhanced Research
                </Badge>
                {isAutoGroundingActive && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-2 py-0.5 border-primary/30 bg-primary/10 text-primary-foreground",
                      "font-medium tracking-wide"
                    )}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Auto-grounding
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        
        {/* Tooltip for collapsed state */}
        {!isExpanded && (
          <TooltipContent side="bottom" className="text-xs">
            <div className="flex flex-col gap-1">
              {isEnhancedResearchActive && <span>Enhanced Research Active</span>}
              {isAutoGroundingActive && <span>Auto-grounding Enabled</span>}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
