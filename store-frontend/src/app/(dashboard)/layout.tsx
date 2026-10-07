import DashboardLayout from "@/shared/components/layout/dashboardLayout";
import SessionSync from "@/shared/components/SessionSync";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout>
            <SessionSync />
            {children}
        </DashboardLayout>
    );
}
