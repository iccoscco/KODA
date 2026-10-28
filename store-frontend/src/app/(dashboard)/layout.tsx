import LocalWorkspace from "@/shared/components/LocalWorkspace";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <LocalWorkspace>
            {children}
        </LocalWorkspace>
    );
}
