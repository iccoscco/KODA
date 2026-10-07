import { redirect } from "next/navigation";

/** Las ventas se gestionan desde Caja. */
export default function SalesRedirectPage() {
    redirect("/cash");
}
