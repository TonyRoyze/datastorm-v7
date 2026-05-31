"use client"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Map,
  Banknote,
  Settings,
  Sparkles,
} from "lucide-react"

const data = {
  navMain: [
    { title: "Overview", url: "/", icon: <LayoutDashboard /> },
    { title: "Outlet Map", url: "/map", icon: <Map /> },
    { title: "Settings", url: "/settings", icon: <Settings /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <Sparkles className="size-5!" />
                <span className="text-base font-semibold">Datastorm</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
    </Sidebar>
  )
}
