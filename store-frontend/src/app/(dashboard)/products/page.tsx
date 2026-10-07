import { Suspense } from "react";
import Products from "@/features/products";

export default function ProductsPage() {
    return (
        <Suspense>
            <Products />
        </Suspense>
    );
}
