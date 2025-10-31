"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

// Chart container component
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
    className?: string
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <div
      data-chart={chartId}
      ref={ref}
      className={cn(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
        className
      )}
      {...props}
    >
      <ChartStyle id={chartId} config={config} />
      <RechartsPrimitive.ResponsiveContainer>
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = "Chart"

// Chart style injector for CSS variables
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .filter(([_, config]) => config.theme || config.color)
          .map(([key, itemConfig]) => {
            const color = itemConfig.color || `var(--chart-${key})`
            return `  [data-chart=${id}] .color-${key} { color: ${color}; }`
          })
          .join("\n"),
      }}
    />
  )
}

// Chart configuration type
export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    theme?: {
      light?: string
      dark?: string
    }
    color?: string
  }
}

// Chart tooltip component
const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = "dot",
  nameKey,
  labelKey,
  labelFormatter,
  valueFormatter,
  hideLabel = false,
  className,
}: {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number | string
    payload?: Record<string, unknown>
    color?: string
    dataKey?: string
  }>
  label?: string
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  labelFormatter?: (value: unknown) => React.ReactNode
  valueFormatter?: (value: unknown, name: string) => React.ReactNode
  hideLabel?: boolean
  className?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md",
        className
      )}
    >
      {!hideLabel && label && (
        <div className="font-medium text-foreground">
          {labelFormatter
            ? labelFormatter(label)
            : labelKey && payload[0]?.payload
              ? String(payload[0].payload[labelKey])
              : label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${item.dataKey || item.name || "value"}-${index}`
          const dataKeyName = item.dataKey || item.name || ""
          const chartConfigRaw = item.payload?.chartConfig
          const itemConfig: ChartConfig[string] | undefined = 
            chartConfigRaw && typeof chartConfigRaw === 'object' && dataKeyName in chartConfigRaw
              ? (chartConfigRaw as Record<string, ChartConfig[string]>)[dataKeyName]
              : undefined
          const name = nameKey && item.payload?.[nameKey]
            ? String(item.payload[nameKey])
            : itemConfig?.label || item.name
          const value =
            itemConfig && typeof item.value !== "undefined"
              ? valueFormatter
                ? valueFormatter(item.value, item.name || "")
                : item.value
              : item.value

          return (
            <div
              key={key}
              className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-muted-foreground"
            >
              <div
                className={cn(
                  "flex flex-1 items-center gap-2",
                  indicator === "dot" && "gap-2.5"
                )}
              >
                {item.color && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      indicator === "dot" && "size-2.5",
                      indicator === "dashed" && "size-0 border-[1.5px] border-dashed bg-transparent",
                      indicator === "line" && "size-px w-3"
                    )}
                    style={
                      {
                        "--color-bg": item.color,
                        "--color-border": item.color,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 items-center justify-between leading-none",
                    indicator === "line" && "gap-2"
                  )}
                >
                  <div className="grid gap-1.5">
                    {name && (
                      <span className="text-muted-foreground">{name}</span>
                    )}
                    {typeof value !== "undefined" && (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {value}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Chart legend component
const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  payload,
  config,
  hideIcon = false,
  className,
}: {
  payload?: Array<{
    value?: string
    type?: string
    id?: string
    color?: string
    payload?: Record<string, unknown>
  }>
  config?: ChartConfig
  hideIcon?: boolean
  className?: string
}) {
  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        className
      )}
    >
      {payload.map((item) => {
        const key = `${item.value}-${item.id || ""}`
        const itemConfig =
          item.value && config?.[item.value]
            ? config[item.value]
            : undefined

        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-muted-foreground",
              item.color && "text-foreground"
            )}
            style={
              item.color
                ? ({
                    "--color": item.color,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {!hideIcon && itemConfig?.icon && (
              <itemConfig.icon />
            )}
            {itemConfig?.label || item.value}
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}

