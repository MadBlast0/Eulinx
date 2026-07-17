import { forwardRef, type ForwardedRef } from "react"
import { Tabs as UITabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/utils/cn"

export interface TabItem {
  value: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

export interface NavigationTabsProps {
  tabs: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  orientation?: "horizontal" | "vertical"
  className?: string
}

export const NavigationTabs = forwardRef<HTMLDivElement, NavigationTabsProps>(
  (
    { tabs, defaultValue, value, onValueChange, orientation = "horizontal", className },
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <div ref={ref} className={cn("w-full", className)}>
        <UITabs
          defaultValue={defaultValue ?? tabs[0]?.value}
          value={value}
          onValueChange={onValueChange}
          orientation={orientation}
        >
          <TabsList className={cn(orientation === "vertical" && "flex-col")}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </UITabs>
      </div>
    )
  },
)
NavigationTabs.displayName = "NavigationTabs"
