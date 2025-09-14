"use client";

import ClientOnly from "@/components/ClientOnly";
import DashboardContent from "../../components/DashboardContent";

export default function DashboardPage() {
  return (
    <ClientOnly>
      <DashboardContent />
    </ClientOnly>
  );
}
